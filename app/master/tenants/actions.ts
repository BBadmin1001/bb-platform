"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/master";
import { checkDomain, getPlatformTarget } from "@/lib/dns";
import {
  addNetlifyAlias,
  removeNetlifyAlias,
  isNetlifyConfigured,
} from "@/lib/netlify";
import { reconcileTenantFeatures } from "@/lib/features";
import {
  sendSiteReadyForReview,
  sendDomainInstructions,
  sendSiteLive,
} from "@/lib/email";
import { polishMeetSection } from "@/lib/aiPolish";
import type { IntakeData } from "@/lib/intakeSchema";

export type LifecycleStage =
  | "intake"
  | "polishing"
  | "ready_for_review"
  | "ready_for_domain"
  | "live";

export type TenantInput = {
  slug: string;
  realtor_name: string;
  brokerage: string | null;
  contact_email: string;
  contact_phone: string | null;
  state_abbr: string | null;
  /**
   * Custom domain — required for active tenants. Every realtor on
   * the platform brings their own. The only time you'd skip it is
   * a short pre-DNS staging window where the customer hasn't bought
   * a domain yet — and even then we'd keep them in `pending` status
   * until it's connected.
   */
  custom_domain: string | null;
  status: "pending" | "active" | "suspended" | "archived";
};

type Result = { ok: true; slug?: string } | { ok: false; error: string };

/**
 * Provision a brand-new tenant. The /master/tenants/new form posts
 * here. Always lands the row in `pending` status — domain
 * verification has to succeed before master can promote to active.
 */
export async function createTenant(input: TenantInput): Promise<Result> {
  const { supabase } = await requireSuperAdmin();

  const slug = (input.slug || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) {
    return {
      ok: false,
      error:
        "Slug must be lowercase letters, numbers, or dashes (3–64 chars).",
    };
  }

  const customDomain = input.custom_domain?.trim().toLowerCase() || null;

  // Newly provisioned tenants always start `pending`. Promotion to
  // `active` happens after domain verification.
  const initialStatus = "pending" as const;

  const { error } = await supabase.from("tenants").insert({
    slug,
    realtor_name: input.realtor_name.trim(),
    brokerage: input.brokerage?.trim() || null,
    contact_email: input.contact_email.trim(),
    contact_phone: input.contact_phone?.trim() || null,
    state_abbr: input.state_abbr?.trim().toUpperCase() || null,
    custom_domain: customDomain,
    domain_target: customDomain ? getPlatformTarget() : null,
    domain_check_state: customDomain ? "pending" : "unset",
    status: initialStatus,
  });
  if (error) return { ok: false, error: error.message };

  // Kick off a domain check + Netlify alias sync immediately so the
  // master sees fresh data when they land on the detail page.
  if (customDomain) {
    await runDomainCheck(slug);
    await syncNetlifyAlias(slug);
  }

  revalidatePath("/master/tenants");
  revalidatePath("/master");
  return { ok: true, slug };
}

export async function updateTenant(
  id: string,
  input: TenantInput,
): Promise<Result> {
  const { supabase } = await requireSuperAdmin();

  // Pull the current row so we can detect domain changes (which need
  // to reset the verification state).
  const { data: current } = await supabase
    .from("tenants")
    .select("custom_domain, slug")
    .eq("id", id)
    .maybeSingle();

  const newDomain = input.custom_domain?.trim().toLowerCase() || null;
  const domainChanged =
    (current?.custom_domain ?? null) !== newDomain;

  const updates: Record<string, unknown> = {
    slug: input.slug.trim().toLowerCase(),
    realtor_name: input.realtor_name.trim(),
    brokerage: input.brokerage?.trim() || null,
    contact_email: input.contact_email.trim(),
    contact_phone: input.contact_phone?.trim() || null,
    state_abbr: input.state_abbr?.trim().toUpperCase() || null,
    custom_domain: newDomain,
    status: input.status,
  };

  // If the domain itself changed, reset verification + record the
  // expected target.
  if (domainChanged) {
    updates.domain_target = newDomain ? getPlatformTarget() : null;
    updates.domain_check_state = newDomain ? "pending" : "unset";
    updates.domain_check_value = null;
    updates.domain_checked_at = null;
    updates.domain_verified_at = null;
  }

  const { error } = await supabase.from("tenants").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (domainChanged) {
    // Reconcile Netlify: remove the OLD alias (if any), then add new.
    if (current?.custom_domain) {
      await removeNetlifyAlias(current.custom_domain);
    }
    if (newDomain) {
      await runDomainCheck(input.slug.trim().toLowerCase());
      await syncNetlifyAlias(input.slug.trim().toLowerCase());
    } else {
      // Domain cleared — wipe alias state for this row.
      await supabase
        .from("tenants")
        .update({
          netlify_alias_added_at: null,
          netlify_alias_synced_for: null,
          netlify_alias_error: null,
          netlify_last_synced_at: new Date().toISOString(),
        })
        .eq("id", id);
    }
  }

  revalidatePath("/master/tenants");
  revalidatePath(`/master/tenants/${input.slug}`);
  return { ok: true, slug: input.slug.trim().toLowerCase() };
}

export async function deleteTenant(id: string): Promise<Result> {
  const { supabase } = await requireSuperAdmin();

  // Pull the domain so we can drop the Netlify alias before the row
  // is gone (after the cascade the alias would be orphaned).
  const { data: existing } = await supabase
    .from("tenants")
    .select("custom_domain")
    .eq("id", id)
    .maybeSingle();

  if (existing?.custom_domain) {
    await removeNetlifyAlias(existing.custom_domain);
  }

  const { error } = await supabase.from("tenants").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/master/tenants");
  revalidatePath("/master");
  return { ok: true };
}

/**
 * Run a fresh DNS check for a tenant. Updates the four
 * domain_check_* columns and returns the resolved state. Called:
 *   - from createTenant + updateTenant on insert / domain change
 *   - from a "Refresh" button in the master domain panel
 *   - from the tenant-side /admin/domain page so customers can
 *     re-check after they've added the records at their registrar
 */
export async function runDomainCheck(
  slug: string,
): Promise<Result & { state?: string; observed?: string | null }> {
  const { supabase } = await requireSuperAdmin();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, custom_domain, domain_verified_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) return { ok: false, error: "Tenant not found." };
  if (!tenant.custom_domain) {
    return { ok: false, error: "No custom domain set yet." };
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

  await supabase.from("tenants").update(updates).eq("id", tenant.id);
  revalidatePath(`/master/tenants/${slug}`);
  revalidatePath("/master/tenants");

  return {
    ok: true,
    state: result.state,
    observed: "observed" in result ? result.observed : null,
  };
}

/**
 * Promote a tenant from pending to active. Requires the domain to
 * be verified — guards against accidentally publishing a site whose
 * DNS isn't pointing at us yet.
 */
export async function promoteToActive(slug: string): Promise<Result> {
  const { supabase } = await requireSuperAdmin();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, custom_domain, domain_check_state")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) return { ok: false, error: "Tenant not found." };

  if (tenant.custom_domain && tenant.domain_check_state !== "verified") {
    return {
      ok: false,
      error:
        "Domain isn't verified yet. Run a fresh check first — the tenant goes live only after DNS confirms.",
    };
  }

  const { error } = await supabase
    .from("tenants")
    .update({
      status: "active",
      provisioned_at: new Date().toISOString(),
    })
    .eq("id", tenant.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/master/tenants");
  revalidatePath(`/master/tenants/${slug}`);
  return { ok: true };
}

/**
 * Recompute this tenant's features cache from their active
 * subscriptions. Normally fires automatically when Stripe webhooks
 * deliver — this is the manual button for cases where a subscription
 * state change didn't (network blip, webhook secret missing, etc.)
 * propagated.
 */
export async function resyncTenantFeatures(
  slug: string,
): Promise<Result & { features?: string[] }> {
  const { supabase } = await requireSuperAdmin();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) return { ok: false, error: "Tenant not found." };
  const res = await reconcileTenantFeatures(tenant.id);
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath(`/master/tenants/${slug}`);
  revalidatePath("/master/tenants");
  return { ok: true, slug, features: res.features };
}

/**
 * Sync this tenant's custom_domain to Netlify as a domain alias.
 *
 * Called automatically from createTenant + updateTenant. Also exposed
 * as a server action so the master UI has a "Sync to Netlify" retry
 * button for the case where a transient error left the alias missing.
 *
 * Records the result on the tenant row:
 *   - ok       → netlify_alias_added_at + netlify_alias_synced_for
 *                + clears netlify_alias_error
 *   - skipped  → leaves prior values, sets a friendly error
 *   - failure  → clears synced state, records the message
 */
export async function syncNetlifyAlias(slug: string): Promise<
  Result & { skipped?: boolean; netlifyError?: string }
> {
  const { supabase } = await requireSuperAdmin();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, custom_domain")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) return { ok: false, error: "Tenant not found." };
  if (!tenant.custom_domain) {
    return { ok: false, error: "No custom domain to sync." };
  }

  const result = await addNetlifyAlias(tenant.custom_domain);
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { netlify_last_synced_at: now };

  if (result.ok) {
    updates.netlify_alias_added_at = now;
    updates.netlify_alias_synced_for = tenant.custom_domain;
    updates.netlify_alias_error = null;
  } else if (result.skipped) {
    updates.netlify_alias_error =
      "Netlify not configured (NETLIFY_API_TOKEN / NETLIFY_SITE_ID missing).";
  } else {
    updates.netlify_alias_added_at = null;
    updates.netlify_alias_synced_for = null;
    updates.netlify_alias_error = result.error;
  }

  await supabase.from("tenants").update(updates).eq("id", tenant.id);
  revalidatePath(`/master/tenants/${slug}`);
  revalidatePath("/master/tenants");

  if (result.ok) return { ok: true, slug };
  return {
    ok: false,
    error: result.error,
    skipped: !!result.skipped,
    netlifyError: result.error,
  };
}

/**
 * Move a tenant to the next workflow stage. Used by the lifecycle
 * progress strip on the master tenant detail page.
 *
 * Validates the new stage is one of the known values and logs the
 * transition for posterity. The `live` stage also flips
 * `tenants.status` to `active` so the public site comes online —
 * gated on a verified domain check, since flipping live without DNS
 * resolving would mean the customer's URL just 404s.
 */
export async function setTenantLifecycleStage(
  slug: string,
  stage: LifecycleStage,
): Promise<Result & { stage?: LifecycleStage }> {
  const { supabase } = await requireSuperAdmin();

  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "id, custom_domain, domain_check_state, contact_email, realtor_name, preview_token",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) return { ok: false, error: "Tenant not found." };

  // Guardrail: don't promote to `live` without a verified domain.
  // Otherwise the public site would 404 when visitors hit the URL.
  if (stage === "live") {
    if (!tenant.custom_domain) {
      return {
        ok: false,
        error:
          "Set a custom domain first — promoting to live without one means there's no public URL to send visitors to.",
      };
    }
    if (tenant.domain_check_state !== "verified") {
      return {
        ok: false,
        error:
          "Domain isn't verified yet. Run a fresh check on the domain panel — DNS has to resolve to us before this goes live.",
      };
    }
  }

  // The publishing visibility flag (`status`) flips to `active` only
  // when we hit `live`. Earlier stages keep `status='pending'` so the
  // public site is invisible (preview-token URL still works).
  const updates: Record<string, unknown> = { lifecycle_stage: stage };
  if (stage === "live") {
    updates.status = "active";
    updates.provisioned_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("tenants")
    .update(updates)
    .eq("id", tenant.id);
  if (error) return { ok: false, error: error.message };

  // ── Notifications per stage transition ─────────────────────────
  // Best-effort — email failures don't roll back the stage change.
  if (tenant.contact_email) {
    const masterHost =
      process.env.NEXT_PUBLIC_MASTER_HOSTNAME ||
      process.env.MASTER_HOSTNAME ||
      "bb-platform-387.netlify.app";
    if (stage === "ready_for_review") {
      const previewUrl = `https://${masterHost}/?tenant=${slug}&preview=${tenant.preview_token}`;
      void sendSiteReadyForReview({
        to: tenant.contact_email as string,
        realtorName: (tenant.realtor_name as string) || "there",
        previewUrl,
      });
    } else if (stage === "ready_for_domain" && tenant.custom_domain) {
      void sendDomainInstructions({
        to: tenant.contact_email as string,
        realtorName: (tenant.realtor_name as string) || "there",
        desiredDomain: tenant.custom_domain as string,
        cnameTarget: getPlatformTarget(),
      });
    } else if (stage === "live") {
      // A3-008: fire "you're live" email on every live transition,
      // even when there's no custom domain yet (falls back to the
      // platform host with the slug query). Previously gated on
      // `tenant.custom_domain` which meant tenants going live on the
      // platform subdomain got zero notification.
      const liveUrl = tenant.custom_domain
        ? `https://${tenant.custom_domain}`
        : `https://${masterHost}/?tenant=${slug}`;
      void sendSiteLive({
        to: tenant.contact_email as string,
        realtorName: (tenant.realtor_name as string) || "there",
        liveUrl,
      });
    }
  }

  revalidatePath(`/master/tenants/${slug}`);
  revalidatePath("/master/tenants");
  revalidatePath("/master");
  return { ok: true, slug, stage };
}

/**
 * Force-flip a tenant to `live` even when the DNS guardrails in
 * `setTenantLifecycleStage` would block. Use this when DNS is being
 * set up out-of-band and you want the public URL to start serving
 * traffic the moment it resolves (or the tenant is on a Netlify
 * subdomain with no custom domain at all).
 *
 * Always sets `status='active'` + `lifecycle_stage='live'` + stamps
 * provisioned_at. Fires the "you're live" email if a contact_email
 * is on file.
 */
export async function forceTenantLive(slug: string): Promise<Result> {
  const { supabase } = await requireSuperAdmin();

  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "id, custom_domain, contact_email, realtor_name",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) return { ok: false, error: "Tenant not found." };

  const { error } = await supabase
    .from("tenants")
    .update({
      lifecycle_stage: "live",
      status: "active",
      provisioned_at: new Date().toISOString(),
    })
    .eq("id", tenant.id);
  if (error) return { ok: false, error: error.message };

  if (tenant.contact_email) {
    const masterHost =
      process.env.NEXT_PUBLIC_MASTER_HOSTNAME ||
      process.env.MASTER_HOSTNAME ||
      "bb-platform-387.netlify.app";
    const liveUrl = tenant.custom_domain
      ? `https://${tenant.custom_domain}`
      : `https://${masterHost}/?tenant=${slug}`;
    void sendSiteLive({
      to: tenant.contact_email as string,
      realtorName: (tenant.realtor_name as string) || "there",
      liveUrl,
    });
  }

  revalidatePath(`/master/tenants/${slug}`);
  revalidatePath("/master/tenants");
  revalidatePath("/master");
  return { ok: true, slug };
}

/**
 * Rotate the preview token. Useful when an old preview link leaked
 * or the customer asked for a fresh URL after edits.
 */
export async function rotatePreviewToken(
  slug: string,
): Promise<Result & { previewToken?: string }> {
  const { supabase } = await requireSuperAdmin();

  // gen_random_uuid() server-side via a small dance: we call
  // supabase.rpc isn't available here, so generate in JS. Postgres
  // accepts the UUID string fine.
  const newToken = crypto.randomUUID();

  const { error } = await supabase
    .from("tenants")
    .update({ preview_token: newToken })
    .eq("slug", slug);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/master/tenants/${slug}`);
  return { ok: true, slug, previewToken: newToken };
}

/**
 * Run AI polish on a tenant's home.meet block. Pulls the original
 * intake_data from the linked prospect, asks Claude for a polished
 * version, writes the result onto content_blocks. The tenant's
 * existing meet block is replaced wholesale — master should only
 * call this when the customer hasn't manually edited yet.
 *
 * Future expansion: polish about.bio, hero.subtitle, services.cards
 * with the same pattern. Starting with `home.meet` because it's the
 * single most visible chunk of bespoke copy.
 */
export async function aiPolishMeet(
  slug: string,
): Promise<Result & { preview?: string }> {
  const { supabase } = await requireSuperAdmin();

  // Resolve tenant + prospect → intake_data.
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, prospect_id, realtor_name, brokerage")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) return { ok: false, error: "Tenant not found." };
  if (!tenant.prospect_id) {
    return {
      ok: false,
      error:
        "This tenant wasn't created from a wizard intake — there's no source data to polish from.",
    };
  }

  const { data: prospect } = await supabase
    .from("prospects")
    .select("intake_data")
    .eq("id", tenant.prospect_id)
    .maybeSingle();
  const intake = (prospect?.intake_data ?? null) as IntakeData | null;
  if (!intake) {
    return {
      ok: false,
      error: "The linked prospect has no intake_data to polish from.",
    };
  }

  // Run the polish.
  const polished = await polishMeetSection(intake);
  if (!polished.ok) {
    return { ok: false, error: polished.error };
  }

  // Write onto content_blocks (upsert by tenant_id+page+key).
  const { error: upErr } = await supabase
    .from("content_blocks")
    .upsert(
      {
        tenant_id: tenant.id,
        page: "home",
        key: "meet",
        value: JSON.stringify(polished.meet),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,page,key" },
    );
  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath(`/master/tenants/${slug}`);
  // Return the polished heading so the UI can show a "applied: …"
  // confirmation without an extra round-trip.
  return { ok: true, slug, preview: polished.meet.heading };
}

// ─────────────────────────────────────────────────────────────────────
// Custom pages — Phase 15
//
// Master creates pages on a tenant's site. Realtor edits content
// from /admin/pages once master has set up the slug.
// ─────────────────────────────────────────────────────────────────────

export type CustomPageInput = {
  slug: string;
  title: string;
  body_md?: string;
  meta_description?: string;
  is_published?: boolean;
  show_in_nav?: boolean;
};

const RESERVED_PAGE_SLUGS = new Set([
  "admin", "master", "api", "_next",
  "about", "buyers", "sellers", "communities", "closings", "contact",
  "reviews", "partners", "path-to-ownership", "privacy", "open-house",
  "form", "leave-review", "leave-review-internal", "get-started",
  "onboarding", "p", "preview", "realtor-in", "sitemap.xml",
  "robots.txt", "favicon.ico",
]);

/**
 * Create a new custom page on a tenant's site. Master-only — only
 * super admins can call this. The realtor can then edit the body
 * and toggle visibility from /admin/pages.
 */
export async function createCustomPage(
  tenantSlug: string,
  input: CustomPageInput,
): Promise<Result & { pageId?: string }> {
  const { supabase } = await requireSuperAdmin();

  const slug = input.slug.trim().toLowerCase();
  const title = input.title.trim();
  if (!slug || !title) {
    return { ok: false, error: "Slug and title are required." };
  }
  if (!/^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/.test(slug)) {
    return {
      ok: false,
      error:
        "Slug must be lowercase letters, numbers, or dashes (3–64 chars, no leading or trailing dash).",
    };
  }
  if (RESERVED_PAGE_SLUGS.has(slug)) {
    return {
      ok: false,
      error: `"${slug}" collides with a built-in route. Pick a different slug.`,
    };
  }

  // Resolve tenant.
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .maybeSingle();
  if (!tenant) return { ok: false, error: "Tenant not found." };

  const { data: row, error } = await supabase
    .from("custom_pages")
    .insert({
      tenant_id: tenant.id,
      slug,
      title,
      body_md: input.body_md ?? "",
      meta_description: input.meta_description?.trim() || null,
      is_published: input.is_published ?? true,
      show_in_nav: input.show_in_nav ?? false,
    })
    .select("id")
    .single();
  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      return {
        ok: false,
        error: `A page with slug "${slug}" already exists on this tenant.`,
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/master/tenants/${tenantSlug}`);
  return { ok: true, slug: tenantSlug, pageId: row.id };
}

/**
 * Master-only: hard delete a custom page. The realtor can only
 * unpublish, never delete — keeps the URL safe from accidental
 * destruction.
 */
export async function deleteCustomPage(
  tenantSlug: string,
  pageId: string,
): Promise<Result> {
  const { supabase } = await requireSuperAdmin();
  const { error } = await supabase
    .from("custom_pages")
    .delete()
    .eq("id", pageId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/master/tenants/${tenantSlug}`);
  return { ok: true };
}
