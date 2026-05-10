"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/master";

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

  // Confirm the plan slugs all exist and are active.
  let planRows:
    | Array<{ slug: string; price_cents: number; name: string; interval: string }>
    | null = null;
  if (input.planSlugs.length > 0) {
    const { data: plans, error: pErr } = await supabase
      .from("plans")
      .select("slug, price_cents, name, interval, is_active")
      .in("slug", input.planSlugs);
    if (pErr) return { ok: false, error: pErr.message };
    const inactive = (plans ?? []).filter((p) => !p.is_active).map((p) => p.slug);
    if (inactive.length) {
      return {
        ok: false,
        error: `Inactive plans selected: ${inactive.join(", ")}. Activate them in /master/plans first.`,
      };
    }
    planRows = (plans ?? []).filter((p) => input.planSlugs.includes(p.slug));
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

  // STRIPE WIRING — Pass B. When STRIPE_SECRET_KEY is set in env,
  // this branch creates the Payment Link and saves the URL on the
  // prospect row. Until then we no-op gracefully.
  if (process.env.STRIPE_SECRET_KEY) {
    // (Stripe API calls go here — added when we have test keys.)
    // For now, leave the link fields as-is.
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
      "id, business_name, contact_name, email, phone, desired_domain, state_abbr, status",
    )
    .eq("id", input.prospectId)
    .maybeSingle();
  if (!p) return { ok: false, error: "Prospect not found." };

  // Insert the tenant — pending status, domain will run through the
  // standard verifier on its own (we don't reuse createTenant action
  // here because we're already authed as super_admin and need to
  // capture the resulting tenant id for the linkback).
  const { data: tenantRow, error: tErr } = await supabase
    .from("tenants")
    .insert({
      slug,
      realtor_name: p.contact_name,
      brokerage: p.business_name,
      contact_email: p.email,
      contact_phone: p.phone,
      state_abbr: p.state_abbr,
      custom_domain: p.desired_domain,
      domain_check_state: p.desired_domain ? "pending" : "unset",
      status: "pending",
      prospect_id: p.id,
    })
    .select("id")
    .single();
  if (tErr) return { ok: false, error: tErr.message };

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

  revalidatePath(`/master/prospects/${input.prospectId}`);
  revalidatePath("/master/prospects");
  revalidatePath("/master/tenants");
  return { ok: true, prospectId: input.prospectId };
}
