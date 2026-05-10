"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireTenantUser } from "@/lib/auth";
import { checkDomain } from "@/lib/dns";

type Result = { ok: true; state: string; observed: string | null } | { ok: false; error: string };

/**
 * Tenant-callable DNS check. The customer can hit this from
 * /admin/domain after they've added the records at their registrar.
 *
 * Auth: must belong to the active tenant via tenant_users (RLS would
 * block cross-tenant edits anyway, but we check explicitly so the
 * error message is friendlier than a silent 0-row update).
 *
 * Writes go through the service-role client because:
 *   - RLS on `tenants` only allows tenant-user updates if
 *     has_tenant_access(id) holds, which is true here.
 *   - But updating domain_check_* is a privileged operation that
 *     happens *because* of an authenticated request, not directly
 *     "as" the tenant user. Using service-role keeps the audit trail
 *     simple (everything observed by the platform vs. user-edited).
 */
export async function recheckMyDomain(): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { tenantId } = auth;

  const admin = createServiceClient();

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, slug, custom_domain, domain_verified_at")
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant) return { ok: false, error: "Tenant not found." };
  if (!tenant.custom_domain) {
    return {
      ok: false,
      error:
        "Your platform owner hasn't set a domain for this tenant yet. Reach out to them.",
    };
  }

  const result = await checkDomain(tenant.custom_domain);
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = {
    domain_checked_at: now,
    domain_check_state: result.state,
  };
  if (result.state === "verified") {
    updates.domain_check_value = result.observed;
    if (!tenant.domain_verified_at) updates.domain_verified_at = now;
  } else if (result.state === "pending" || result.state === "mismatch") {
    updates.domain_check_value = result.observed ?? null;
  } else {
    updates.domain_check_value = null;
  }

  await admin.from("tenants").update(updates).eq("id", tenant.id);
  revalidatePath("/admin/domain");

  return {
    ok: true,
    state: result.state,
    observed: "observed" in result ? (result.observed ?? null) : null,
  };
}
