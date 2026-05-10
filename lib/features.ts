import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentTenant, getCurrentTenantId } from "@/lib/tenant/context";
import {
  FEATURE_NAMES,
  type FeatureName,
  tenantFeaturesIncludes,
} from "@/lib/features-meta";

// Re-export the client-safe pieces so existing server-side imports
// continue to work via `@/lib/features`. Anything that needs to run in
// the client bundle should import from `@/lib/features-meta` directly.
export {
  FEATURE_NAMES,
  FEATURE_META,
  tenantFeaturesIncludes,
  type FeatureName,
} from "@/lib/features-meta";

/**
 * Feature gating — the bridge between the plans/subscriptions tables
 * and the admin/public UI.
 *
 * Source of truth flow:
 *
 *   plans.features (jsonb array)        ← master edits in /master/plans
 *           │
 *           │  (when a customer subscribes)
 *           ▼
 *   tenant_subscriptions (status='active')
 *           │
 *           │  (reconcileTenantFeatures → SQL union of every active
 *           │   sub's plan.features)
 *           ▼
 *   tenants.features (jsonb object — keyed by feature, value=true)
 *           │
 *           │  (the tenant_features cache that proxy.ts already
 *           │   ships down via getCurrentTenant())
 *           ▼
 *   tenantHasFeature(name) → bool, checked at every gated entry point
 *
 * Why a cache on tenants.features instead of joining at every read?
 *   - Marketing pages render dynamic, would otherwise need joins on
 *     every request.
 *   - The webhook flips it once when state changes; reads are then
 *     cheap.
 *   - Master "Resync features" button forces a recompute when a sub
 *     state drift is suspected.
 */

/**
 * Read the current tenant's features. Pulled via the cached row on
 * `tenants` (no extra DB hit beyond the one getCurrentTenant() does).
 */
export async function getCurrentTenantFeatures(): Promise<Set<FeatureName>> {
  const tenant = await getCurrentTenant();
  if (!tenant) return new Set();
  const enabled = new Set<FeatureName>();
  for (const f of FEATURE_NAMES) {
    if (tenantFeaturesIncludes(tenant.features, f)) {
      enabled.add(f);
    }
  }
  return enabled;
}

/**
 * Cheap "is this feature on?" check for use deep inside server
 * components. Relies on the same cached tenant row.
 */
export async function tenantHasFeature(feature: FeatureName): Promise<boolean> {
  const features = await getCurrentTenantFeatures();
  return features.has(feature);
}

/**
 * Recompute tenants.features from the current tenant_subscriptions
 * state. Idempotent. Called from:
 *   - Stripe webhook customer.subscription.* handlers
 *   - Master "Resync features" button
 *   - The createQuote flow (post-checkout completion path) so the
 *     tenant's features are correct from the moment they log in.
 *
 * Only counts subscriptions whose status is `active` or `trialing` —
 * past_due / unpaid / canceled don't grant access.
 *
 * Uses the service-role client because the webhook handler runs
 * unauthenticated.
 */
export async function reconcileTenantFeatures(
  tenantId: string,
): Promise<{ ok: true; features: FeatureName[] } | { ok: false; error: string }> {
  // Privileged operation — bypass RLS so the unauthenticated webhook
  // path works. Master "Resync features" button hits the same code.
  const supabase = createServiceClient();

  // Pull every plan referenced by this tenant's active subs.
  const { data: subs, error } = await supabase
    .from("tenant_subscriptions")
    .select("status, plan:plan_id ( features )")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "trialing"]);
  if (error) return { ok: false, error: error.message };

  // Build the set of granted feature names. Supabase widens nested
  // selects to arrays even when the FK relation is many-to-one, so we
  // normalise both shapes here. `as unknown as` is intentional — the
  // generated type doesn't match the runtime shape we actually get
  // from a `plan:plan_id ( features )` select.
  const granted = new Set<string>();
  for (const sub of subs ?? []) {
    const planRaw = sub.plan as unknown as
      | { features: unknown }
      | { features: unknown }[]
      | null;
    const plan = Array.isArray(planRaw) ? planRaw[0] : planRaw;
    if (!plan) continue;
    const list = Array.isArray(plan.features) ? plan.features : [];
    for (const f of list) {
      if (typeof f === "string") granted.add(f);
    }
  }

  // Object-shaped jsonb makes per-feature lookups O(1) on the read
  // side. Keep only known feature names so legacy strings don't leak
  // through.
  const features: Record<string, true> = {};
  for (const f of FEATURE_NAMES) {
    if (granted.has(f)) features[f] = true;
  }

  const { error: upErr } = await supabase
    .from("tenants")
    .update({ features })
    .eq("id", tenantId);
  if (upErr) return { ok: false, error: upErr.message };

  return { ok: true, features: Object.keys(features) as FeatureName[] };
}

/**
 * Convenience for use deep inside other actions/loaders that already
 * know the tenant id.
 */
export async function reconcileCurrentTenantFeatures() {
  const id = await getCurrentTenantId();
  if (!id) return { ok: false as const, error: "No tenant in context." };
  return reconcileTenantFeatures(id);
}
