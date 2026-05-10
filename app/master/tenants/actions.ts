"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/master";

export type TenantInput = {
  slug: string;
  realtor_name: string;
  brokerage: string | null;
  contact_email: string;
  contact_phone: string | null;
  state_abbr: string | null;
  custom_domain: string | null;
  status: "pending" | "active" | "suspended" | "archived";
};

type Result = { ok: true; slug?: string } | { ok: false; error: string };

/**
 * Provision a brand-new tenant. The /master/tenants/new form posts here.
 * Stripe wiring + lead intake form (Phase 4) will eventually flow into
 * this same action with a few extra fields.
 */
export async function createTenant(input: TenantInput): Promise<Result> {
  const { supabase } = await requireSuperAdmin();

  // Slug must be url-safe and unique.
  const slug = (input.slug || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) {
    return {
      ok: false,
      error:
        "Slug must be lowercase letters, numbers, or dashes (3–64 chars).",
    };
  }

  const { error } = await supabase.from("tenants").insert({
    slug,
    realtor_name: input.realtor_name.trim(),
    brokerage: input.brokerage?.trim() || null,
    contact_email: input.contact_email.trim(),
    contact_phone: input.contact_phone?.trim() || null,
    state_abbr: input.state_abbr?.trim().toUpperCase() || null,
    custom_domain: input.custom_domain?.trim().toLowerCase() || null,
    status: input.status,
    provisioned_at:
      input.status === "active" ? new Date().toISOString() : null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/master/tenants");
  revalidatePath("/master");
  return { ok: true, slug };
}

export async function updateTenant(
  id: string,
  input: TenantInput,
): Promise<Result> {
  const { supabase } = await requireSuperAdmin();

  const { error } = await supabase
    .from("tenants")
    .update({
      slug: input.slug.trim().toLowerCase(),
      realtor_name: input.realtor_name.trim(),
      brokerage: input.brokerage?.trim() || null,
      contact_email: input.contact_email.trim(),
      contact_phone: input.contact_phone?.trim() || null,
      state_abbr: input.state_abbr?.trim().toUpperCase() || null,
      custom_domain: input.custom_domain?.trim().toLowerCase() || null,
      status: input.status,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

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
