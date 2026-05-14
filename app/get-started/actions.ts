"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
// `source` is hard-coded "website" after the May-2026 pivot — there's
// only one host left (smartweb.brandbonjour.com) and prospects are
// attributed to a sales_rep via the link token, not a tenant slug.
import { getCanonicalMasterHost } from "@/lib/tenant/resolver";
import { createPaymentLinkForQuote, isStripeConfigured } from "@/lib/stripe";
import {
  sendIntakeReceived,
  sendInternalNewPaidProspect,
} from "@/lib/email";
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

  const source = "website";

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
  /** When set, the server re-resolves the link token from the DB
   *  and PROVENANCE-WINS over the URL-supplied price + rep. This is
   *  how we stop customers from editing the URL to lower their price. */
  linkToken?: string | null;
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

  // ── 1b. seal — when a link token is in play, re-resolve the
  // canonical price + rep ref from the DB and use THOSE instead of
  // whatever the client posted. This is the sealing guarantee.
  let sealedSetupCents = input.agreedSetupCents;
  let sealedRepRef = input.salesRepRef;
  let linkRowId: string | null = null;
  if (input.linkToken) {
    const supabase = await createClient();
    const { data: linkRow } = await supabase
      .from("sales_rep_links")
      .select(
        "id, agreed_setup_cents, is_active, sales_reps!inner(slug)",
      )
      .eq("link_token", input.linkToken)
      .maybeSingle();
    if (!linkRow) {
      return {
        ok: false,
        error:
          "This onboarding link is no longer valid. Ask your sales rep for a fresh one.",
      };
    }
    if (!linkRow.is_active) {
      return {
        ok: false,
        error:
          "This onboarding link has been deactivated. Ask your sales rep for a fresh one.",
      };
    }
    sealedSetupCents = linkRow.agreed_setup_cents as number;
    const reps = linkRow.sales_reps as
      | { slug: string }
      | { slug: string }[]
      | null;
    sealedRepRef = Array.isArray(reps)
      ? (reps[0]?.slug ?? null)
      : reps?.slug ?? null;
    linkRowId = linkRow.id as string;
  }

  // Source attribution — same convention as the legacy short form.
  const source = "website";

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
      // New columns (Phase 7.1 + 18 migration). When a link token
      // was used, sealedRepRef / sealedSetupCents reflect the DB
      // values, not whatever the client posted.
      intake_data: d,
      sales_rep_ref: sealedRepRef,
      agreed_setup_cents: sealedSetupCents,
      intake_submitted_at: new Date().toISOString(),
      quoted_setup_fee_cents: sealedSetupCents,
    })
    .select("id")
    .single();
  if (insErr || !prospect) {
    return {
      ok: false,
      error: insErr?.message ?? "Couldn't save your intake.",
    };
  }

  // If this prospect came in via a tracked link, stamp the link row
  // with submitted_at + prospect_id for conversion analytics.
  // Service-role: same RLS issue as the prospect update above (anon
  // user can't write to sales_rep_links beyond the insert policy).
  if (linkRowId) {
    const svc = createServiceClient();
    await svc
      .from("sales_rep_links")
      .update({
        submitted_at: new Date().toISOString(),
        prospect_id: prospect.id,
      })
      .eq("id", linkRowId);
  }

  revalidatePath("/master/prospects");
  revalidatePath("/master");

  // ── 3. auto-Stripe (when price was pre-agreed) ───────────────
  let checkoutUrl: string | null = null;
  if (sealedSetupCents !== null && sealedSetupCents > 0) {
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
          process.env.NEXT_PUBLIC_SITE_URL || `https://${getCanonicalMasterHost()}`,
        ).toString();

        const link = await createPaymentLinkForQuote({
          prospect: {
            id: prospect.id,
            business_name: brokerage_name || `${realtor_full_name}'s site`,
            contact_name,
            email,
          },
          setupFeeCents: sealedSetupCents,
          recurringPriceIds: [], // monthly add-ons are upsold post-delivery
          successUrl,
        });

        // Use service-role for this update: the customer is anonymous
        // (cookie-bound `supabase` is anon-keyed) and RLS on `prospects`
        // restricts updates to super admins. Without service-role
        // this UPDATE silently no-ops, leaving prospects stuck at
        // status='new' with no checkout URL on file (A4-005).
        const svc = createServiceClient();
        await svc
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

  // ── 4. Notifications (best-effort) ───────────────────────────
  // Confirmation to the customer.
  void sendIntakeReceived({
    to: email,
    contactName: contact_name,
    hasPaid: false, // payment confirmation comes from the webhook
  });
  // Internal alert when a price was pre-agreed (i.e. they're going
  // straight to checkout). Cold leads with no price get the alert
  // when master generates the quote.
  if (sealedSetupCents !== null && sealedSetupCents > 0) {
    void sendInternalNewPaidProspect({
      prospectId: prospect.id,
      contactName: contact_name,
      brokerage: brokerage_name,
      email,
      agreedSetupCents: sealedSetupCents,
      salesRepRef: sealedRepRef,
    });
  }

  return { ok: true, prospectId: prospect.id, checkoutUrl };
}
