"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantSlug } from "@/lib/tenant/context";

export type IntakeInput = {
  business_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  desired_domain: string | null;
  state_abbr: string | null;
  notes: string | null;
};

type Result = { ok: true; id: string } | { ok: false; error: string };

/**
 * Public intake submit. Anyone can hit this — the prospects RLS
 * policy "anyone can submit intake" allows the insert.
 *
 * Source attribution: when the form is submitted from a tenant's
 * site (someone visits Samina's site, scrolls to the platform-owner
 * footer link, hits Get Started), we tag the source so master can
 * see referral patterns.
 */
export async function submitIntake(input: IntakeInput): Promise<Result> {
  const business_name = input.business_name.trim();
  const contact_name = input.contact_name.trim();
  const email = input.email.trim().toLowerCase();
  if (!business_name || !contact_name || !email) {
    return { ok: false, error: "Business name, contact, and email are required." };
  }
  if (!/.+@.+\..+/.test(email)) {
    return { ok: false, error: "That email doesn't look right." };
  }

  // Source tagging.
  const tenantSlug = await getCurrentTenantSlug();
  const source = tenantSlug ? `referral:${tenantSlug}` : "website";

  // Cookie-bound anon client — the prospects "anyone can submit intake"
  // RLS policy permits anon INSERT, so we don't need service-role.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospects")
    .insert({
      business_name,
      contact_name,
      email,
      phone: input.phone?.trim() || null,
      desired_domain:
        input.desired_domain
          ?.trim()
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .replace(/\/.*$/, "") || null,
      state_abbr: input.state_abbr?.trim().toUpperCase() || null,
      notes: input.notes?.trim() || null,
      source,
      status: "new",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/master/prospects");
  revalidatePath("/master");
  return { ok: true, id: data.id };
}
