import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWebhook, getStripe } from "@/lib/stripe";
import { reconcileTenantFeatures } from "@/lib/features";
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
    .select("id, paid_at, status, stripe_session_id")
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
