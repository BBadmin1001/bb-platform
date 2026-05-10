"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireSuperAdmin } from "@/lib/master";
import {
  ensurePlanPrice,
  createPaymentLinkForQuote,
  isStripeConfigured,
} from "@/lib/stripe";
import { seedTenantFromIntake } from "@/lib/seedTenantFromIntake";
import type { IntakeData } from "@/lib/intakeSchema";

type Result =
  | { ok: true; prospectId?: string; paymentLinkUrl?: string }
  | { ok: false; error: string };

/**
 * Update a prospect's free-form fields. Used for adding contact
 * notes, fixing typos, etc. Status changes go through dedicated
 * actions below so we can track lifecycle events properly.
 */
export async function updateProspect(
  id: string,
  patch: Partial<{
    business_name: string;
    contact_name: string;
    email: string;
    phone: string | null;
    desired_domain: string | null;
    state_abbr: string | null;
    notes: string | null;
    quote_notes: string | null;
  }>,
): Promise<Result> {
  const { supabase } = await requireSuperAdmin();

  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === "string") cleaned[k] = v.trim() || null;
    else cleaned[k] = v;
  }

  const { error } = await supabase
    .from("prospects")
    .update(cleaned)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/master/prospects/${id}`);
  revalidatePath("/master/prospects");
  return { ok: true };
}

export async function setProspectStatus(
  id: string,
  status: "new" | "contacted" | "quoted" | "paid" | "provisioned" | "abandoned",
): Promise<Result> {
  const { supabase } = await requireSuperAdmin();
  const { error } = await supabase
    .from("prospects")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/master/prospects/${id}`);
  revalidatePath("/master/prospects");
  return { ok: true };
}

/**
 * Create a Stripe Payment Link for this prospect.
 *
 * Pass A (current): records the quote on the prospect row + advances
 *   status to 'quoted', BUT skips the Stripe API call when
 *   STRIPE_SECRET_KEY isn't set in env. UI gracefully degrades to
 *   "Stripe not configured — record kept, send the customer manually".
 *
 * Pass B (after you paste test keys): wires the Stripe Payment Links
 *   API to create a real link with:
 *     - one-time line item (the variable setup fee)
 *     - recurring line items per selected plan slug (resolved to
 *       Stripe price IDs via the plans table — also lazily-created)
 *   The resulting URL is saved on the row and shown in the UI for
 *   master to send to the customer.
 */
export async function createQuote(input: {
  prospectId: string;
  setupFeeCents: number;
  planSlugs: string[];
  quoteNotes: string | null;
}): Promise<Result> {
  const { supabase } = await requireSuperAdmin();

  if (input.setupFeeCents < 0) {
    return { ok: false, error: "Setup fee can't be negative." };
  }

  // Confirm the plan slugs all exist + are active. Pull every column
  // ensurePlanPrice needs.
  type PlanRow = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    price_cents: number;
    interval: "monthly" | "yearly";
    features: unknown;
    is_active: boolean;
    stripe_product_id: string | null;
    stripe_price_id: string | null;
  };
  let planRows: PlanRow[] = [];
  if (input.planSlugs.length > 0) {
    const { data: plans, error: pErr } = await supabase
      .from("plans")
      .select(
        "id, slug, name, description, price_cents, interval, features, is_active, stripe_product_id, stripe_price_id",
      )
      .in("slug", input.planSlugs);
    if (pErr) return { ok: false, error: pErr.message };
    const inactive = (plans ?? []).filter((p) => !p.is_active).map((p) => p.slug);
    if (inactive.length) {
      return {
        ok: false,
        error: `Inactive plans selected: ${inactive.join(", ")}. Activate them in /master/plans first.`,
      };
    }
    planRows = (plans ?? []) as PlanRow[];
  }

  // Update the prospect row with the quote data either way — even if
  // Stripe isn't wired yet, master can still email the customer
  // manually using these values.
  const { error: upErr } = await supabase
    .from("prospects")
    .update({
      quoted_setup_fee_cents: input.setupFeeCents,
      quoted_plans: input.planSlugs,
      quote_notes: input.quoteNotes?.trim() || null,
      status: "quoted",
    })
    .eq("id", input.prospectId);
  if (upErr) return { ok: false, error: upErr.message };

  // STRIPE WIRING — when STRIPE_SECRET_KEY is set, create a real
  // Payment Link and save the URL on the prospect row. Otherwise
  // skip silently (UI shows "Stripe not configured").
  if (isStripeConfigured()) {
    // Pull prospect contact info needed for the link.
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, business_name, contact_name, email")
      .eq("id", input.prospectId)
      .maybeSingle();
    if (!prospect) return { ok: false, error: "Prospect vanished mid-call." };

    // Make sure every selected plan has a Stripe Price (lazy-create).
    // Patch back the price/product ids as we mint them.
    const recurringPriceIds: string[] = [];
    for (const p of planRows) {
      try {
        const { priceId, productId } = await ensurePlanPrice(p);
        if (
          priceId !== p.stripe_price_id ||
          productId !== p.stripe_product_id
        ) {
          await supabase
            .from("plans")
            .update({
              stripe_price_id: priceId,
              stripe_product_id: productId,
            })
            .eq("id", p.id);
        }
        recurringPriceIds.push(priceId);
      } catch (e) {
        return {
          ok: false,
          error: `Stripe error creating price for ${p.slug}: ${
            e instanceof Error ? e.message : "unknown"
          }`,
        };
      }
    }

    // Resolve absolute success URL from the request host.
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("host") ?? "localhost:3010";
    const origin = `${proto}://${host}`;

    try {
      const link = await createPaymentLinkForQuote({
        prospect: {
          id: prospect.id,
          business_name: prospect.business_name,
          contact_name: prospect.contact_name,
          email: prospect.email,
        },
        setupFeeCents: input.setupFeeCents,
        recurringPriceIds,
        successUrl: `${origin}/onboarding/done?prospect=${prospect.id}`,
      });

      await supabase
        .from("prospects")
        .update({
          stripe_payment_link_id: link.paymentLinkId,
          stripe_payment_link_url: link.url,
        })
        .eq("id", input.prospectId);

      revalidatePath(`/master/prospects/${input.prospectId}`);
      revalidatePath("/master/prospects");
      return {
        ok: true,
        prospectId: input.prospectId,
        paymentLinkUrl: link.url,
      };
    } catch (e) {
      return {
        ok: false,
        error: `Stripe error creating Payment Link: ${
          e instanceof Error ? e.message : "unknown"
        }`,
      };
    }
  }

  revalidatePath(`/master/prospects/${input.prospectId}`);
  revalidatePath("/master/prospects");
  return { ok: true, prospectId: input.prospectId };
}

/**
 * Manually mark a prospect as paid + provision their tenant.
 *
 * Normally the Stripe webhook does this automatically when payment
 * lands. This action exists so master can do it manually for paid
 * customers in test mode, before Stripe webhooks are wired up.
 *
 * Creates the tenant row, links the prospect, sets the custom domain
 * (kicks off DNS check + Netlify alias sync via the existing
 * createTenant flow).
 */
export async function provisionFromProspect(input: {
  prospectId: string;
  slug: string;
}): Promise<Result> {
  const { supabase, user } = await requireSuperAdmin();

  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) {
    return { ok: false, error: "Slug must be lowercase / digits / dashes." };
  }

  const { data: p } = await supabase
    .from("prospects")
    .select(
      "id, business_name, contact_name, email, phone, desired_domain, state_abbr, status, intake_data, tenant_id",
    )
    .eq("id", input.prospectId)
    .maybeSingle();
  if (!p) return { ok: false, error: "Prospect not found." };
  if (p.tenant_id) {
    return {
      ok: false,
      error: "This prospect already has a tenant — open it from the Tenants tab.",
    };
  }

  // Prefer intake_data values over the legacy short-form columns.
  // intake.realtor_full_name is the customer's BUSINESS-facing name
  // (what shows on the site); contact_name from the legacy form was
  // really the same thing for old prospects, so fall through.
  const intake = (p.intake_data ?? null) as IntakeData | null;
  const realtorName = intake?.realtor_full_name?.trim() || p.contact_name;
  const brokerage = intake?.brokerage_name?.trim() || p.business_name;
  const stateAbbr =
    intake?.licensed_states?.[0]?.state_abbr?.toUpperCase() ||
    p.state_abbr ||
    null;
  const desiredDomain = intake?.desired_domain || p.desired_domain || null;

  // Insert the tenant — pending status, domain will run through the
  // standard verifier on its own.
  const { data: tenantRow, error: tErr } = await supabase
    .from("tenants")
    .insert({
      slug,
      realtor_name: realtorName,
      brokerage,
      contact_email: p.email,
      contact_phone: intake?.phone || p.phone,
      state_abbr: stateAbbr,
      custom_domain: desiredDomain,
      domain_check_state: desiredDomain ? "pending" : "unset",
      status: "pending",
      prospect_id: p.id,
    })
    .select("id")
    .single();
  if (tErr) return { ok: false, error: tErr.message };

  // Seed content from the intake payload — Phase 8. This is what
  // makes "polishing" actually polishing instead of data entry.
  let seedWarnings: string[] = [];
  if (intake) {
    const seed = await seedTenantFromIntake(supabase, tenantRow.id, intake);
    if (seed.ok) {
      seedWarnings = seed.warnings;
    } else {
      // Don't fail the provisioning — the tenant exists, just log.
      console.warn("[provisionFromProspect] seed failed:", seed.error);
    }
  }

  // Link back + flip lifecycle.
  await supabase
    .from("prospects")
    .update({
      tenant_id: tenantRow.id,
      status: "provisioned",
      provisioned_by: user.id,
      provisioned_at: new Date().toISOString(),
    })
    .eq("id", p.id);

  if (seedWarnings.length > 0) {
    console.warn(
      "[provisionFromProspect] partial seed:",
      seedWarnings.join("; "),
    );
  }

  revalidatePath(`/master/prospects/${input.prospectId}`);
  revalidatePath("/master/prospects");
  revalidatePath("/master/tenants");
  return { ok: true, prospectId: input.prospectId };
}
