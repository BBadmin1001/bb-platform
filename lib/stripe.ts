import "server-only";
import Stripe from "stripe";

/**
 * Centralised Stripe client + helpers.
 *
 * The whole platform shares one Stripe account — every customer
 * checkout flows through this. We're test-keyed by default; flipping
 * STRIPE_SECRET_KEY to a live key (sk_live_…) is the only change
 * needed for production.
 */

let _client: Stripe | null = null;

export function getStripe(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY missing in env. Cannot talk to Stripe.",
    );
  }
  _client = new Stripe(key, {
    // No explicit apiVersion — the SDK pins to its bundled latest
    // (currently "2026-04-22.dahlia"), which matches our type
    // surface. Stripe's API is backwards-compatible across pins, so
    // letting the SDK choose avoids a type-cast every time we bump.
    // Better diagnostics + retries on transient failures.
    maxNetworkRetries: 2,
    typescript: true,
  });
  return _client;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY?.trim();
}

/**
 * Ensure a plan row has Stripe Product + Price IDs. Lazy-creates
 * them the first time the plan is sold, so master never needs to
 * touch the Stripe dashboard.
 *
 * @returns The price id to use as a recurring line item.
 */
export async function ensurePlanPrice(plan: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  interval: "monthly" | "yearly";
  features: unknown;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
}): Promise<{ priceId: string; productId: string }> {
  const stripe = getStripe();

  let productId = plan.stripe_product_id;
  if (!productId) {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description ?? undefined,
      metadata: {
        plan_slug: plan.slug,
        plan_id: plan.id,
        platform: "bb-website-project",
      },
    });
    productId = product.id;
  }

  let priceId = plan.stripe_price_id;
  if (!priceId) {
    const price = await stripe.prices.create({
      product: productId,
      currency: "usd",
      unit_amount: plan.price_cents,
      recurring: {
        interval: plan.interval === "yearly" ? "year" : "month",
      },
      metadata: {
        plan_slug: plan.slug,
        plan_id: plan.id,
      },
    });
    priceId = price.id;
  }

  return { priceId, productId };
}

/**
 * Create a Payment Link for a single quote. Combines:
 *   - one-time line item: variable setup fee (described as
 *     "Setup — <prospect business>")
 *   - recurring line items: each selected plan, at its Stripe Price
 *
 * Stripe's Payment Links require all line items reference existing
 * Prices. For the variable one-time setup we lazy-create a one-shot
 * Price tied to a generic "Website setup" Product.
 */
export async function createPaymentLinkForQuote(input: {
  prospect: {
    id: string;
    business_name: string;
    contact_name: string;
    email: string;
  };
  setupFeeCents: number;
  recurringPriceIds: string[];
  successUrl: string;
}): Promise<{ paymentLinkId: string; url: string }> {
  const stripe = getStripe();

  // Reuse the same "Website setup" Product across deals — only the
  // Price varies. Cuts dashboard noise vs. one Product per prospect.
  let setupProductId: string | undefined;
  const products = await stripe.products.list({ limit: 1, active: true });
  const existing = products.data.find(
    (p) => p.metadata?.platform_role === "setup_fee_product",
  );
  if (existing) {
    setupProductId = existing.id;
  } else {
    const created = await stripe.products.create({
      name: "Website setup",
      description: "One-time setup fee for a new realtor website.",
      metadata: { platform_role: "setup_fee_product" },
    });
    setupProductId = created.id;
  }

  const lineItems: Stripe.PaymentLinkCreateParams.LineItem[] = [];

  // Setup fee: create a one-shot Price.
  if (input.setupFeeCents > 0) {
    const setupPrice = await stripe.prices.create({
      product: setupProductId,
      currency: "usd",
      unit_amount: input.setupFeeCents,
      metadata: {
        prospect_id: input.prospect.id,
        platform_role: "setup_fee",
      },
    });
    lineItems.push({ price: setupPrice.id, quantity: 1 });
  }

  // Recurring plans.
  for (const priceId of input.recurringPriceIds) {
    lineItems.push({ price: priceId, quantity: 1 });
  }

  if (lineItems.length === 0) {
    throw new Error(
      "Quote must include either a setup fee or at least one recurring plan.",
    );
  }

  // Stripe rule: customer_creation can only be set on links with NO
  // recurring items (Stripe auto-creates customers for subscriptions).
  const hasRecurring = input.recurringPriceIds.length > 0;
  const paymentLink = await stripe.paymentLinks.create({
    line_items: lineItems,
    metadata: {
      prospect_id: input.prospect.id,
      contact_email: input.prospect.email,
      platform: "bb-website-project",
    },
    after_completion: {
      type: "redirect",
      redirect: { url: input.successUrl },
    },
    // For one-time-only checkouts we ask Stripe to always create a
    // customer record — it's required for our webhook to find them.
    // For subscription-bearing checkouts Stripe creates customers
    // automatically anyway.
    ...(hasRecurring ? {} : { customer_creation: "always" as const }),
  });

  return { paymentLinkId: paymentLink.id, url: paymentLink.url };
}

/**
 * Verify a Stripe webhook payload signature. Used by /api/stripe/webhook
 * to confirm events actually originated from Stripe (not someone
 * guessing the URL). Without STRIPE_WEBHOOK_SECRET set, returns the
 * payload unverified — safe in dev, **NEVER in prod**.
 */
export function verifyWebhook(payload: string, signature: string | null): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (secret && signature) {
    return getStripe().webhooks.constructEvent(payload, signature, secret);
  }
  // Dev fallback: parse without verification.
  console.warn(
    "[stripe webhook] STRIPE_WEBHOOK_SECRET missing — accepting event without signature verification. Set this in production.",
  );
  return JSON.parse(payload) as Stripe.Event;
}

/**
 * Create a Stripe Checkout Session for a tenant subscribing to one of
 * the plans defined in /master/plans. Used by the self-serve upgrade
 * flow inside tenant admin — the locked feature's "Subscribe" button
 * calls a server action that wraps this and redirects the user to
 * the returned `url`.
 *
 * Encodes `tenant_id` and `plan_id` as session metadata so the webhook
 * (handleSubscriptionChange) can flip the tenant's feature flag and
 * record the subscription on payment.
 */
export async function createPlanCheckoutSession(input: {
  tenantId: string;
  planId: string;
  priceId: string;
  /** Where Stripe sends the user after a successful checkout. */
  successUrl: string;
  /** Where Stripe sends them if they cancel before paying. */
  cancelUrl: string;
  /** Pre-fill on the Stripe page when the tenant has a contact email
   *  on file. Optional. */
  customerEmail?: string;
}): Promise<{ id: string; url: string }> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail || undefined,
    metadata: {
      tenant_id: input.tenantId,
      plan_id: input.planId,
      platform: "bb-website-project",
      flow: "self-serve-upgrade",
    },
    // Enable Stripe's customer portal so cancel/update works without
    // us building it from scratch.
    subscription_data: {
      metadata: {
        tenant_id: input.tenantId,
        plan_id: input.planId,
      },
    },
  });
  if (!session.url) {
    throw new Error("Stripe didn't return a checkout URL");
  }
  return { id: session.id, url: session.url };
}

/**
 * Create a Stripe Billing Portal session for a tenant — gives them a
 * one-stop URL to update payment method, view invoices, and cancel
 * subscriptions. Far less code than rebuilding any of that
 * ourselves.
 */
export async function createBillingPortalSession(input: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl,
  });
  return { url: portal.url };
}
