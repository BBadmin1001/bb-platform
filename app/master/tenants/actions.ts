"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/master";
import { checkDomain, getPlatformTarget } from "@/lib/dns";

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

  // Kick off a domain check immediately so the master sees fresh data
  // when they land on the detail page.
  if (customDomain) {
    await runDomainCheck(slug);
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

  if (domainChanged && newDomain) {
    await runDomainCheck(input.slug.trim().toLowerCase());
  }

  revalidatePath("/master/tenants");
  revalidatePath(`/master/tenants/${input.slug}`);
  return { ok: true, slug: input.slug.trim().toLowerCase() };
}

export async function deleteTenant(id: string): Promise<Result> {
  const { supabase } = await requireSuperAdmin();
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
