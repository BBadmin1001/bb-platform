"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantSlug } from "@/lib/tenant/context";
import { createPaymentLinkForQuote, isStripeConfigured } from "@/lib/stripe";
import type { IntakeData } from "@/lib/intakeSchema";

// ─────────────────────────────────────────────────────────────────────
// Legacy short-form intake submit (kept for backwards compat with
// existing /get-started single-page flow if it's still wired). The new
// multi-step wizard uses `submitIntakeWizard` below.
// ─────────────────────────────────────────────────────────────────────

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

  const tenantSlug = await getCurrentTenantSlug();
  const source = tenantSlug ? `referral:${tenantSlug}` : "website";

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

// ─────────────────────────────────────────────────────────────────────
// New multi-step intake submit (Phase 7).
//
// Flow:
//   1. Validate the must-have fields (contact name + email +
//      realtor name + brokerage).
//   2. Insert a prospect row with the full intake_data jsonb stored
//      verbatim, plus sales_rep_ref and agreed_setup_cents extracted
//      from the URL the rep sent.
//   3. If a price was pre-agreed, lazy-create a Stripe Payment Link
//      and return its URL — the wizard immediately redirects the
//      customer to checkout. No manual master-quote step needed.
//   4. If no price was set (e.g. lead came in cold), skip Stripe and
//      return without a checkout URL — the wizard sends them to
//      /onboarding/done and master will follow up with a quote.
// ─────────────────────────────────────────────────────────────────────

export type WizardSubmitInput = {
  intakeData: IntakeData;
  salesRepRef: string | null;
  agreedSetupCents: number | null;
};

export type WizardSubmitResult =
  | { ok: true; prospectId: string; checkoutUrl: string | null }
  | { ok: false; error: string };

export async function submitIntakeWizard(
  input: WizardSubmitInput,
): Promise<WizardSubmitResult> {
  const d = input.intakeData;

  // ── 1. validate ──────────────────────────────────────────────
  const contact_name = (d.contact_name ?? "").trim();
  const email = (d.email ?? "").trim().toLowerCase();
  const realtor_full_name = (d.realtor_full_name ?? "").trim();
  const brokerage_name = (d.brokerage_name ?? "").trim();
  if (!contact_name || !email || !realtor_full_name || !brokerage_name) {
    return {
      ok: false,
      error:
        "Please fill in your contact name, email, realtor name, and brokerage before submitting.",
    };
  }
  if (!/.+@.+\..+/.test(email)) {
    return { ok: false, error: "That email doesn't look right." };
  }
  if (
    input.agreedSetupCents !== null &&
    (input.agreedSetupCents < 0 || !Number.isFinite(input.agreedSetupCents))
  ) {
    return { ok: false, error: "Agreed price is invalid." };
  }

  // Source attribution — same convention as the legacy short form.
  const tenantSlug = await getCurrentTenantSlug();
  const source = tenantSlug ? `referral:${tenantSlug}` : "website";

  // ── 2. insert prospect ───────────────────────────────────────
  const supabase = await createClient();
  const { data: prospect, error: insErr } = await supabase
    .from("prospects")
    .insert({
      // Required surface columns (kept in sync with intake_data so the
      // master inbox can render without parsing jsonb every row).
      business_name: brokerage_name || `${realtor_full_name}'s site`,
      contact_name,
      email,
      phone: d.phone?.trim() || null,
      desired_domain:
        d.desired_domain
          ?.trim()
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .replace(/\/.*$/, "") || null,
      state_abbr:
        d.licensed_states?.[0]?.state_abbr?.toUpperCase() || null,
      notes: d.notes?.trim() || null,
      source,
      status: "new",
      // New columns (Phase 7.1 migration)
      intake_data: d,
      sales_rep_ref: input.salesRepRef,
      agreed_setup_cents: input.agreedSetupCents,
      intake_submitted_at: new Date().toISOString(),
      quoted_setup_fee_cents: input.agreedSetupCents,
    })
    .select("id")
    .single();
  if (insErr || !prospect) {
    return {
      ok: false,
      error: insErr?.message ?? "Couldn't save your intake.",
    };
  }

  revalidatePath("/master/prospects");
  revalidatePath("/master");

  // ── 3. auto-Stripe (when price was pre-agreed) ───────────────
  let checkoutUrl: string | null = null;
  if (input.agreedSetupCents !== null && input.agreedSetupCents > 0) {
    if (!isStripeConfigured()) {
      // Stripe missing in env — save the prospect and let master
      // handle billing manually. Don't fail the submit.
      console.warn(
        "[intake] agreed price set but Stripe isn't configured — skipping payment link",
      );
    } else {
      try {
        const successUrl = new URL(
          "/onboarding/done",
          process.env.NEXT_PUBLIC_SITE_URL ||
            `https://${process.env.NEXT_PUBLIC_MASTER_HOSTNAME ?? "bb-platform-387.netlify.app"}`,
        ).toString();

        const link = await createPaymentLinkForQuote({
          prospect: {
            id: prospect.id,
            business_name: brokerage_name || `${realtor_full_name}'s site`,
            contact_name,
            email,
          },
          setupFeeCents: input.agreedSetupCents,
          recurringPriceIds: [], // monthly add-ons are upsold post-delivery
          successUrl,
        });

        await supabase
          .from("prospects")
          .update({
            stripe_payment_link_id: link.paymentLinkId,
            stripe_payment_link_url: link.url,
            status: "quoted",
          })
          .eq("id", prospect.id);
        checkoutUrl = link.url;
      } catch (e) {
        console.error("[intake] payment link create failed", e);
        // Don't fail submit — master can retry manually.
      }
    }
  }

  return { ok: true, prospectId: prospect.id, checkoutUrl };
}
