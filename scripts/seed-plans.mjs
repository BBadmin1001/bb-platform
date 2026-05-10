#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────
// scripts/seed-plans.mjs
//
// Seeds the bb-platform `plans` table with the two starter
// subscription tiers we ship by default. Idempotent — re-running the
// script just refreshes the rows by slug, never duplicates.
//
// USAGE
//
//   node --env-file=.env.local scripts/seed-plans.mjs
//
// What gets created:
//
//   marketing  → $30/mo  → flyers + google_reviews_widget
//   visibility → $20/mo  → analytics + seo_county_pages
//
// Stripe products/prices are NOT created here — the master dashboard
// lazy-creates them on the first sale. That keeps the Stripe
// dashboard clean (no zombie products you never sold) and lets you
// rename plans freely without orphaning Stripe rows.
// ─────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

const PLANS = [
  {
    slug: "marketing",
    name: "Marketing Plan",
    description:
      "Open House landing pages with printable A4 flyers, plus the Google Reviews widget on the public site. For agents who run weekend open houses and want their reviews visible.",
    price_cents: 3000,
    interval: "monthly",
    features: ["flyers", "google_reviews_widget"],
    is_active: true,
    display_order: 10,
  },
  {
    slug: "visibility",
    name: "Visibility Plan",
    description:
      "Website analytics (Google Analytics 4 install + dashboard) plus county SEO landing pages targeting 'realtor in [county]' searches. For agents who want to track traffic and rank locally.",
    price_cents: 2000,
    interval: "monthly",
    features: ["analytics", "seo_county_pages"],
    is_active: true,
    display_order: 20,
  },
];

console.log("Seeding plans into bb-platform…");

let created = 0;
let updated = 0;

for (const plan of PLANS) {
  const { data: existing } = await supabase
    .from("plans")
    .select("id")
    .eq("slug", plan.slug)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("plans")
      .update({
        name: plan.name,
        description: plan.description,
        price_cents: plan.price_cents,
        interval: plan.interval,
        features: plan.features,
        is_active: plan.is_active,
        display_order: plan.display_order,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) {
      console.error(`  [${plan.slug}] update failed: ${error.message}`);
      continue;
    }
    console.log(`  [${plan.slug}] refreshed`);
    updated++;
  } else {
    const { error } = await supabase.from("plans").insert(plan);
    if (error) {
      console.error(`  [${plan.slug}] insert failed: ${error.message}`);
      continue;
    }
    console.log(`  [${plan.slug}] created`);
    created++;
  }
}

console.log("");
console.log(`Done — created=${created}, updated=${updated}`);
console.log("");
console.log(
  "Next: open /master/plans to confirm both rows appear, then sell one.",
);
console.log(
  "Stripe Product/Price will lazy-create the first time a customer subscribes.",
);
