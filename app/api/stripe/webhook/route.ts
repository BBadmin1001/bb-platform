import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWebhook, getStripe } from "@/lib/stripe";
import { reconcileTenantFeatures } from "@/lib/features";
import { seedTenantFromIntake } from "@/lib/seedTenantFromIntake";
import type { IntakeData } from "@/lib/intakeSchema";
import type Stripe from "stripe";

/**
 * Stripe webhook ingest. The single source of truth for "did the
 * customer actually pay?" — never trust the client redirect.
 *
 * Events we handle:
 *
 *   checkout.session.completed
 *     Customer just finished checkout via the Payment Link we made
 *     in createQuote. Mark the prospect as paid, capture the Stripe
 *     customer + session ids. Auto-provisioning of the tenant runs
 *     after — same code path the master "Provision tenant" button
 *     uses in the workspace, so manual + automated paths converge.
 *
 *   customer.subscription.created / updated / deleted
 *     Plan flips. Updates `tenant_subscriptions` so the tenants
 *     row's feature flags can be reconciled. Phase 5 will wire the
 *     feature-gate logic on top.
 *
 * Local dev: forward Stripe events to this endpoint with the CLI:
 *   stripe listen --forward-to http://localhost:3010/api/stripe/webhook
 * The CLI prints a `whsec_…` secret to set as STRIPE_WEBHOOK_SECRET
 * for signature verification. Without it, the verifier accepts the
 * raw payload (only safe in dev).
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Stripe needs the raw body (not parsed) to verify the signature.
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = verifyWebhook(payload, signature);
  } catch (e) {
    console.error("[stripe webhook] signature verify failed", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Signature verification failed",
      },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChange(event);
        break;
      default:
        // Unhandled events are still acknowledged so Stripe doesn't
        // retry them.
        console.log("[stripe webhook] ignoring event type", event.type);
    }
  } catch (e) {
    console.error("[stripe webhook] handler threw", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Handler threw",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

/**
 * checkout.session.completed
 *   - Find the prospect by metadata.prospect_id (we set it when
 *     creating the Payment Link).
 *   - Stamp paid_at + stripe_session_id + stripe_customer_id.
 *   - Move status to 'paid'.
 *
 * Provisioning the tenant happens in a separate pass below — keeps
 * idempotency tight (a duplicate webhook delivery is a no-op).
 */
async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const prospectId = session.metadata?.prospect_id;
  if (!prospectId) {
    console.warn(
      "[stripe webhook] checkout.session.completed without prospect_id metadata",
      session.id,
    );
    return;
  }

  const supabase = createServiceClient();

  // Idempotency: if we already recorded a paid_at for this session,
  // bail.
  const { data: existing } = await supabase
    .from("prospects")
    .select(
      "id, paid_at, status, stripe_session_id, tenant_id, intake_data, contact_name, business_name, email, phone, desired_domain, state_abbr",
    )
    .eq("id", prospectId)
    .maybeSingle();
  if (!existing) {
    console.warn("[stripe webhook] prospect not found", prospectId);
    return;
  }
  if (existing.stripe_session_id === session.id && existing.paid_at) {
    return; // already processed
  }

  await supabase
    .from("prospects")
    .update({
      stripe_session_id: session.id,
      stripe_customer_id:
        typeof session.customer === "string" ? session.customer : null,
      paid_at: new Date().toISOString(),
      status: "paid",
    })
    .eq("id", prospectId);

  console.log("[stripe webhook] prospect", prospectId, "marked paid");

  // ── Auto-provision a tenant in `pending` status when the prospect
  // came in via the wizard (i.e. has intake_data) and doesn't already
  // have a tenant. The tenant goes into the polishing queue with
  // intake content seeded — the master team takes over from there.
  if (!existing.tenant_id && existing.intake_data) {
    await autoProvisionFromPaidProspect(supabase, {
      id: existing.id,
      contact_name: existing.contact_name as string,
      business_name: existing.business_name as string,
      email: existing.email as string,
      phone: existing.phone as string | null,
      desired_domain: existing.desired_domain as string | null,
      state_abbr: existing.state_abbr as string | null,
      intake_data: existing.intake_data as IntakeData,
    });
  }
}

/**
 * Provision a tenant immediately on payment from the wizard intake.
 * Service-role-scoped (no auth — webhook is unauthenticated). The
 * tenant is created in `pending` status so it's not publicly visible
 * until the polish team approves + the customer attaches a domain.
 */
async function autoProvisionFromPaidProspect(
  supabase: ReturnType<typeof createServiceClient>,
  prospect: {
    id: string;
    contact_name: string;
    business_name: string;
    email: string;
    phone: string | null;
    desired_domain: string | null;
    state_abbr: string | null;
    intake_data: IntakeData;
  },
): Promise<void> {
  const intake = prospect.intake_data;

  // Slug = sanitized realtor name with a short uniquifier.
  const baseSlug = (intake.realtor_full_name || prospect.contact_name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const uniq = Math.random().toString(36).slice(2, 6);
  const slug = `${baseSlug || "tenant"}-${uniq}`;

  const realtorName =
    intake.realtor_full_name?.trim() || prospect.contact_name;
  const brokerage =
    intake.brokerage_name?.trim() || prospect.business_name;
  const stateAbbr =
    intake.licensed_states?.[0]?.state_abbr?.toUpperCase() ||
    prospect.state_abbr ||
    null;
  const desiredDomain = intake.desired_domain || prospect.desired_domain || null;

  const { data: tenantRow, error: tErr } = await supabase
    .from("tenants")
    .insert({
      slug,
      realtor_name: realtorName,
      brokerage,
      contact_email: prospect.email,
      contact_phone: intake.phone || prospect.phone,
      state_abbr: stateAbbr,
      custom_domain: desiredDomain,
      domain_check_state: desiredDomain ? "pending" : "unset",
      status: "pending", // Phase 9 will introduce a polishing-specific status
      prospect_id: prospect.id,
    })
    .select("id")
    .single();
  if (tErr || !tenantRow) {
    console.error(
      "[stripe webhook] tenant insert failed",
      tErr?.message ?? "no row",
    );
    return;
  }

  // Seed the tenant's content from the intake payload.
  const seed = await seedTenantFromIntake(supabase, tenantRow.id, intake);
  if (!seed.ok) {
    console.error("[stripe webhook] seed failed:", seed.error);
  } else if (seed.warnings.length > 0) {
    console.warn(
      "[stripe webhook] partial seed:",
      seed.warnings.join("; "),
    );
  }

  // Linkback + lifecycle.
  await supabase
    .from("prospects")
    .update({
      tenant_id: tenantRow.id,
      status: "provisioned",
      provisioned_at: new Date().toISOString(),
    })
    .eq("id", prospect.id);

  console.log(
    "[stripe webhook] auto-provisioned tenant",
    slug,
    "for prospect",
    prospect.id,
  );
}

/**
 * customer.subscription.* — keep tenant_subscriptions table in sync.
 *
 * The subscription belongs to a Stripe customer. We find the matching
 * prospect (and through it the tenant) via stripe_customer_id and
 * upsert a tenant_subscriptions row per Stripe subscription.
 */
async function handleSubscriptionChange(event: Stripe.Event) {
  const sub = event.data.object as Stripe.Subscription;
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  if (!customerId) return;

  const supabase = createServiceClient();

  // Find tenant via prospect → tenant_id linkback.
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, tenant_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (!prospect?.tenant_id) {
    // No tenant yet — provisioning hasn't run. The next checkout-
    // session event will catch up.
    return;
  }

  // Map the first item's price → plan id via stripe_price_id.
  const priceId = sub.items.data[0]?.price?.id;
  if (!priceId) return;

  const { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("stripe_price_id", priceId)
    .maybeSingle();
  if (!plan) return;

  if (event.type === "customer.subscription.deleted") {
    await supabase
      .from("tenant_subscriptions")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", sub.id);
  } else {
    // upsert
    // In recent Stripe API versions `current_period_end` moved from the
    // subscription onto each subscription item (one billing period per
    // item). For our single-item subs, the first item's period is the
    // one to record.
    const firstItemPeriodEnd = sub.items.data[0]?.current_period_end;
    const periodEndIso = firstItemPeriodEnd
      ? new Date(firstItemPeriodEnd * 1000).toISOString()
      : null;

    await supabase.from("tenant_subscriptions").upsert(
      {
        tenant_id: prospect.tenant_id,
        plan_id: plan.id,
        stripe_subscription_id: sub.id,
        status: sub.status as
          | "active"
          | "trialing"
          | "past_due"
          | "canceled"
          | "incomplete"
          | "incomplete_expired"
          | "unpaid"
          | "paused",
        current_period_end: periodEndIso,
      },
      { onConflict: "stripe_subscription_id" },
    );
  }

  // Recompute the tenant's feature flags so admin/public UI flips
  // immediately on subscription state change.
  await reconcileTenantFeatures(prospect.tenant_id);
}

/**
 * Stripe webhooks always come in as POST; respond to GET with a
 * helpful message so anyone (including you, debugging) can confirm
 * the endpoint is up.
 */
export async function GET() {
  const stripe = getStripe();
  // touching the client lazily-validates STRIPE_SECRET_KEY presence
  void stripe;
  return NextResponse.json({
    ok: true,
    message:
      "Stripe webhook endpoint. POST events here from Stripe (or via `stripe listen` in dev).",
  });
}
