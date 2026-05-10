"use client";

/**
 * FeaturesPanel — master-side widget that shows the cached
 * `tenants.features` keys for a tenant and lets the operator force a
 * recompute via `resyncTenantFeatures`.
 *
 * 99 % of the time the Stripe webhook reconciles automatically on
 * subscription change. This button is the manual escape hatch for the
 * 1 % case where the webhook never landed (network blip, secret
 * rotation, dev env without `stripe listen` running) — letting master
 * fix the cache without dropping into SQL.
 *
 * Renders the resolved feature names so master can confirm visually
 * that the recompute matches what the active subs should grant.
 */

import { useState, useTransition } from "react";
import { Sparkles, RefreshCw, Check } from "lucide-react";
import { resyncTenantFeatures } from "@/app/master/tenants/actions";
import { FEATURE_META, type FeatureName } from "@/lib/features-meta";

export default function FeaturesPanel({
  slug,
  features,
}: {
  slug: string;
  /** Keys currently in tenants.features. Treated as the cached truth. */
  features: FeatureName[];
}) {
  const [pending, startTransition] = useTransition();
  const [latest, setLatest] = useState<FeatureName[]>(features);
  const [error, setError] = useState<string | null>(null);
  const [justSynced, setJustSynced] = useState(false);

  function onResync() {
    setError(null);
    setJustSynced(false);
    startTransition(async () => {
      const res = await resyncTenantFeatures(slug);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLatest((res.features ?? []) as FeatureName[]);
      setJustSynced(true);
      // Soft-clear the success flash after a couple seconds
      setTimeout(() => setJustSynced(false), 2500);
    });
  }

  return (
    <section className="admin-card p-6 mb-10">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{
              background:
                "color-mix(in srgb, var(--primary) 14%, transparent)",
              color: "var(--primary)",
            }}
          >
            <Sparkles size={14} strokeWidth={1.6} />
          </span>
          <p
            className="text-xs uppercase tracking-[0.18em]"
            style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
          >
            Features
          </p>
        </div>
        <button
          type="button"
          onClick={onResync}
          disabled={pending}
          className="admin-btn admin-btn-secondary inline-flex items-center"
          style={pending ? { opacity: 0.6 } : undefined}
          title="Recompute tenants.features from active tenant_subscriptions × plans.features"
        >
          {justSynced ? (
            <Check size={13} className="mr-2" />
          ) : (
            <RefreshCw
              size={13}
              className={"mr-2 " + (pending ? "animate-spin" : "")}
            />
          )}
          {pending
            ? "Syncing…"
            : justSynced
            ? "Synced"
            : "Resync features"}
        </button>
      </div>

      {latest.length === 0 ? (
        <p
          className="text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          No features unlocked. Add an active subscription whose plan
          grants features, or click <em>Resync features</em> if the
          webhook didn&apos;t fire.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {latest.map((f) => {
            const meta = FEATURE_META[f];
            return (
              <li
                key={f}
                className="flex items-start gap-2 text-xs"
                style={{ color: "var(--card-foreground)" }}
              >
                <Check
                  size={13}
                  strokeWidth={2}
                  style={{ color: "var(--primary)", marginTop: 2 }}
                />
                <span>
                  <span style={{ fontWeight: 600 }}>{meta.label}</span>{" "}
                  <span
                    className="admin-mono"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    · {f}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p
          className="text-xs mt-3"
          style={{ color: "var(--destructive)" }}
        >
          {error}
        </p>
      )}
    </section>
  );
}
