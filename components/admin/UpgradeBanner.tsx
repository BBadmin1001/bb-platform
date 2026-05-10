import { Lock } from "lucide-react";
import {
  FEATURE_META,
  tenantHasFeature,
  type FeatureName,
} from "@/lib/features";
import UpgradeBannerCTA from "./UpgradeBannerCTA";

/**
 * Server component that renders nothing if the active tenant has the
 * given feature, OR a friendly upgrade card if they don't.
 *
 * The "Subscribe" button is a client child (UpgradeBannerCTA) that
 * calls the startPlanCheckout server action and redirects the user to
 * Stripe — so the realtor can pay the monthly $30 / $20 / etc.
 * directly from inside their admin without bothering the platform
 * team.
 *
 * Intended use:
 *
 *   export default async function AnalyticsPage() {
 *     const banner = await UpgradeGate({ feature: "analytics" });
 *     if (banner) return banner;          // not unlocked → render banner only
 *     return <AdminShell><AnalyticsContent /></AdminShell>;
 *   }
 */
export async function UpgradeBanner({
  feature,
}: {
  feature: FeatureName;
}): Promise<React.ReactElement | null> {
  const has = await tenantHasFeature(feature);
  if (has) return null;

  const meta = FEATURE_META[feature];
  return (
    <div
      className="admin-card p-6 mb-6 flex items-start gap-4"
      style={{
        borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
      }}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0 mt-0.5"
        style={{
          background: "color-mix(in srgb, var(--primary) 14%, transparent)",
          color: "var(--primary)",
        }}
      >
        <Lock size={18} strokeWidth={1.6} />
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="text-xs uppercase tracking-[0.18em] mb-1"
          style={{ color: "var(--primary)", fontWeight: 700 }}
        >
          Locked · {meta.planLabel} · {meta.price}
        </p>
        <h2
          className="text-lg mb-2"
          style={{ color: "var(--card-foreground)", fontWeight: 600 }}
        >
          {meta.label} isn&apos;t active on your plan.
        </h2>
        <p
          className="text-sm mb-4"
          style={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}
        >
          Unlock {meta.label} (and the rest of the {meta.planLabel}) for{" "}
          <strong>{meta.price}</strong>. You&apos;ll be redirected to a
          secure Stripe checkout — no card on file required up front.
        </p>
        <UpgradeBannerCTA planSlug={meta.planSlug} planLabel={meta.planLabel} />
      </div>
    </div>
  );
}

/**
 * Hard gate: pages that have *no* useful state to show without the
 * feature (analytics, county pages, integrations) can use this.
 * Callers pass it the children to render when the feature is on; if
 * off, they get the banner alone.
 */
export async function FeatureGate({
  feature,
  children,
}: {
  feature: FeatureName;
  children: React.ReactNode;
}) {
  const has = await tenantHasFeature(feature);
  if (!has) {
    return <UpgradeBanner feature={feature} />;
  }
  return <>{children}</>;
}
