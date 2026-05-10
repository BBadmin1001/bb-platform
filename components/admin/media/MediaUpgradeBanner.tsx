/**
 * Storage / credits upgrade prompt shown on /admin/media.
 *
 * Two paths:
 *
 *   1. PUBLIC CLOUDINARY UPGRADE  (always available)
 *      Primary CTA links straight to the Cloudinary billing page so the
 *      account owner can upgrade their plan directly. Single-tenant flow.
 *
 *   2. RESELL UPGRADE  (future — Stripe Checkout, plan tiers, gates)
 *      When we turn this site into a multi-realtor SaaS, the secondary CTA
 *      becomes the primary path: open a Stripe-hosted checkout, persist the
 *      resulting subscription on the team_member record, and gate uploads
 *      by `team_member.media_plan` instead of by Cloudinary's free cap.
 *
 *      Wire this up in `app/admin/media/billing/actions.ts` (file to be
 *      added) and flip the `RESELL_BILLING_ENABLED` flag below. The banner
 *      will then surface the resell CTA prominently and demote the public
 *      Cloudinary link to a "manual upgrade" footnote.
 *
 * Threshold logic — driven off the *credits* metric on the Free plan
 * (storage + bandwidth + transforms all draw from the same pool):
 *
 *   <70%  → no banner (healthy)
 *   70–89%  → soft yellow nudge ("plan upgrades start at $X")
 *   ≥90%   → urgent red ("uploads pause at 100%")
 */

import Link from "next/link";
import { ArrowUpRight, Sparkles, AlertTriangle, Lock } from "lucide-react";
import type { UsageResult } from "@/lib/cloudinaryAdmin";

// Flip to `true` once Stripe Checkout is wired up for resell pricing.
// Until then the secondary CTA renders as "Coming soon" so the slot is
// visually present without misleading anyone into clicking a dead button.
const RESELL_BILLING_ENABLED = false;

// Cloudinary's billing page — works whether Samina is logged in or not
// (redirects to login first, then back to billing).
const CLOUDINARY_BILLING_URL = "https://cloudinary.com/console/billing/plans";

/** Returns the percentage we want to trigger upgrade prompts on. */
function triggerPercent(usage: UsageResult): number {
  if (!usage.configured) return 0;
  // Credits is the only metric with a hard cap on the Free plan, and it's
  // the one that actually pauses uploads at 100%. Storage and bandwidth
  // are derived from the same pool, so credits is always the right signal.
  return usage.credits.percent;
}

export default function MediaUpgradeBanner({ usage }: { usage: UsageResult }) {
  const percent = triggerPercent(usage);

  // No banner under 70% — keep the page clean.
  if (percent < 70) return null;
  if (!usage.configured) return null;

  const urgent = percent >= 90;

  return (
    <div
      className={
        urgent
          ? "rounded-md p-5 mb-8 border-2 border-red-300 bg-red-50/80"
          : "rounded-md p-5 mb-8 border border-amber-300 bg-amber-50/70"
      }
    >
      <div className="flex flex-wrap items-start gap-4">
        <div
          className={
            urgent
              ? "shrink-0 w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center"
              : "shrink-0 w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center"
          }
        >
          {urgent ? <AlertTriangle size={18} /> : <Sparkles size={18} />}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm mb-1 ${urgent ? "text-red-900" : "text-amber-900"}`}
            style={{ fontWeight: 600 }}
          >
            {urgent
              ? `You're at ${Math.round(percent)}% of your media plan — uploads will pause at 100%.`
              : `You're at ${Math.round(percent)}% of your media plan.`}
          </p>
          <p className={`text-xs leading-relaxed ${urgent ? "text-red-800/85" : "text-amber-900/80"}`}>
            {urgent
              ? "Once the credits pool is exhausted, new photo uploads will fail until next month's reset or a plan upgrade. Bumping the plan now keeps everything live."
              : "Plan upgrades unlock more storage, bandwidth, and transformations so you can keep adding listings, communities, and open-house photos without hitting a wall."}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            {/* PRIMARY: direct Cloudinary upgrade (works today) */}
            <Link
              href={CLOUDINARY_BILLING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={
                urgent
                  ? "inline-flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                  : "inline-flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-md bg-navy text-white hover:bg-navy/90"
              }
              style={{ fontWeight: 500 }}
            >
              Upgrade on Cloudinary
              <ArrowUpRight size={13} />
            </Link>

            {/* SECONDARY: future resell flow (Stripe Checkout) */}
            {RESELL_BILLING_ENABLED ? (
              // TODO(billing): swap href for a server-action that opens
              //   Stripe Checkout, then redirects back here on success/cancel.
              <Link
                href="/admin/media/billing"
                className="inline-flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-md bg-white border border-navy/30 text-navy hover:border-navy"
                style={{ fontWeight: 500 }}
              >
                One-click upgrade
                <ArrowUpRight size={13} />
              </Link>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-md bg-white/60 border border-dashed border-ink/20 text-ink/45 cursor-not-allowed select-none"
                title="Stripe-backed in-app upgrade — wired up in a future build."
              >
                <Lock size={11} />
                One-click upgrade · coming soon
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
