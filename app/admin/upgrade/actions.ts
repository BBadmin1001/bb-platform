"use server";

/**
 * Tenant-side actions for the self-serve plan upgrade flow.
 *
 *   startPlanCheckout(planSlug)        — generates a Stripe Checkout
 *                                       URL for the given plan and
 *                                       returns it. Caller redirects
 *                                       the user to the URL.
 *   openBillingPortal()                — generates a Stripe Customer
 *                                       Portal URL so the realtor
 *                                       can manage their existing
 *                                       subscription (update card,
 *                                       cancel, see invoices).
 *
 * Both use the cookie-bound supabase client (i.e. the realtor must
 * be signed into their tenant admin). The webhook
 * `customer.subscription.*` handler flips the corresponding
 * `tenants.features` flag once payment confirms.
 */

import { headers } from "next/headers";
import { requireTenantUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  ensurePlanPrice,
  createPlanCheckoutSession,
  createBillingPortalSession,
  isStripeConfigured,
} from "@/lib/stripe";

type Result =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Start a Stripe Checkout for a plan. Caller (the upgrade banner)
 * navigates the browser to the returned URL.
 */
export async function startPlanCheckout(planSlug: string): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  if (!isStripeConfigured()) {
    return {
      ok: false,
      error: "Billing isn't configured yet. Contact platform support.",
    };
  }

  // Service-role client for the plan read — RLS allows public reads
  // of active plans, but we go service-role to keep the row shape
  // predictable + skip the RLS subquery.
  const svc = createServiceClient();
  const { data: plan, error: planErr } = await svc
    .from("plans")
    .select("id, slug, name, description, price_cents, interval, features, stripe_product_id, stripe_price_id, is_active")
    .eq("slug", planSlug)
    .maybeSingle();
  if (planErr || !plan) {
    return { ok: false, error: planErr?.message ?? "Plan not found." };
  }
  if (!plan.is_active) {
    return { ok: false, error: "This plan isn't currently available." };
  }

  // Lazy-create the Stripe product/price the first time anyone buys
  // this plan. Keeps the Stripe dashboard clean.
  let priceId = plan.stripe_price_id;
  let productId = plan.stripe_product_id;
  if (!priceId || !productId) {
    try {
      const ensured = await ensurePlanPrice({
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        price_cents: plan.price_cents,
        interval: plan.interval as "monthly" | "yearly",
        features: plan.features,
        stripe_product_id: plan.stripe_product_id,
        stripe_price_id: plan.stripe_price_id,
      });
      priceId = ensured.priceId;
      productId = ensured.productId;
      // Persist back so we don't recreate next time.
      await svc
        .from("plans")
        .update({
          stripe_product_id: productId,
          stripe_price_id: priceId,
        })
        .eq("id", plan.id);
    } catch (e) {
      return {
        ok: false,
        error:
          e instanceof Error
            ? `Couldn't prep Stripe price: ${e.message}`
            : "Stripe price setup failed.",
      };
    }
  }

  // Pull tenant for the customer email + return URLs.
  const { data: tenant } = await svc
    .from("tenants")
    .select("contact_email, slug")
    .eq("id", tenantId)
    .maybeSingle();

  const h = await headers();
  const origin =
    h.get("x-forwarded-proto") && h.get("host")
      ? `${h.get("x-forwarded-proto")}://${h.get("host")}`
      : "https://bb-platform-387.netlify.app";

  try {
    const session = await createPlanCheckoutSession({
      tenantId,
      planId: plan.id,
      priceId: priceId!,
      successUrl: `${origin}/admin?upgraded=${planSlug}`,
      cancelUrl: `${origin}/admin`,
      customerEmail: tenant?.contact_email ?? undefined,
    });
    return { ok: true, url: session.url };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Couldn't start checkout: ${e.message}`
          : "Stripe checkout failed.",
    };
  }
}

/**
 * Open the Stripe Customer Portal — the canonical place for the
 * realtor to update their card, cancel a subscription, or download
 * invoices. Requires that we have a stripe_customer_id on file
 * (set by the first subscription's webhook).
 */
export async function openBillingPortal(): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { tenantId } = auth;

  if (!isStripeConfigured()) {
    return {
      ok: false,
      error: "Billing isn't configured yet. Contact platform support.",
    };
  }

  const svc = createServiceClient();
  // The Stripe customer id is on the linked prospect row (set on
  // first checkout). Fall through if missing.
  const { data: tenant } = await svc
    .from("tenants")
    .select("id, stripe_customer_id")
    .eq("id", tenantId)
    .maybeSingle();

  let customerId = (tenant?.stripe_customer_id as string | null) ?? null;
  if (!customerId) {
    // Fall back to the prospect linkback.
    const { data: prospect } = await svc
      .from("prospects")
      .select("stripe_customer_id")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    customerId = (prospect?.stripe_customer_id as string | null) ?? null;
  }
  if (!customerId) {
    return {
      ok: false,
      error:
        "We haven't seen any payment from this account yet — there's nothing to manage in the billing portal.",
    };
  }

  const h = await headers();
  const origin =
    h.get("x-forwarded-proto") && h.get("host")
      ? `${h.get("x-forwarded-proto")}://${h.get("host")}`
      : "https://bb-platform-387.netlify.app";

  try {
    const portal = await createBillingPortalSession({
      customerId,
      returnUrl: `${origin}/admin`,
    });
    return { ok: true, url: portal.url };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Couldn't open billing portal: ${e.message}`
          : "Stripe portal failed.",
    };
  }
}
