import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWebhook, getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

/**
 * Stripe webhook ingest — single source of truth for "did the
 * customer actually pay?" Never trust the client redirect.
 *
 * After the May-2026 pivot the platform is a lead-CRM, not a
 * recurring SaaS. We only care about one event:
 *
 *   checkout.session.completed
 *     Customer just finished checkout on the Payment Link the sales
 *     rep generated. Mark the prospect as paid, stamp the Stripe
 *     session + customer ids. That's it — no tenant provisioning,
 *     no plan reconciliation, no subscription tracking.
 *
 * Subscription events (customer.subscription.*) are intentionally
 * ignored — we no longer sell recurring plans through Stripe.
 *
 * Local dev: forward Stripe events to this endpoint with the CLI:
 *   stripe listen --forward-to http://localhost:3010/api/stripe/webhook
 * The CLI prints a `whsec_…` secret to set as STRIPE_WEBHOOK_SECRET.
 */

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
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event);
    } else {
      // Unhandled events are still acknowledged so Stripe doesn't retry.
      console.log("[stripe webhook] ignoring event type", event.type);
    }
  } catch (e) {
    console.error("[stripe webhook] handler threw", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Handler threw" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

/**
 * checkout.session.completed → mark the prospect as paid. Idempotent
 * (duplicate webhook deliveries are a no-op).
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

  const { data: existing } = await supabase
    .from("prospects")
    .select("id, paid_at, stripe_session_id")
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

export async function GET() {
  const stripe = getStripe();
  // touching the client lazily-validates STRIPE_SECRET_KEY presence
  void stripe;
  return NextResponse.json({
    ok: true,
    message: "Stripe webhook endpoint is up. POST events here.",
  });
}
