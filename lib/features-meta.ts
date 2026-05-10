/**
 * Client-safe feature metadata.
 *
 * Kept in its own file (no `server-only` import) so client components
 * — the admin sidebar, the upgrade banner — can pull the type and the
 * display metadata without bundling the server-side reconciler / DB
 * helpers in `lib/features.ts`.
 */

/** Feature names known to the platform. Add new ones here as plans
 *  introduce them so we get type safety throughout. */
export const FEATURE_NAMES = [
  "flyers",
  "google_reviews_widget",
  "seo_county_pages",
  "analytics",
] as const;
export type FeatureName = (typeof FEATURE_NAMES)[number];

/** Display metadata used by sidebar lock icons + upgrade banners. */
export const FEATURE_META: Record<
  FeatureName,
  { label: string; planSlug: string; planLabel: string; price: string }
> = {
  flyers: {
    label: "Open House flyers",
    planSlug: "marketing",
    planLabel: "Marketing Plan",
    price: "$30/mo",
  },
  google_reviews_widget: {
    label: "Google Reviews widget",
    planSlug: "marketing",
    planLabel: "Marketing Plan",
    price: "$30/mo",
  },
  seo_county_pages: {
    label: "County SEO landing pages",
    planSlug: "visibility",
    planLabel: "Visibility Plan",
    price: "$20/mo",
  },
  analytics: {
    label: "Website analytics",
    planSlug: "visibility",
    planLabel: "Visibility Plan",
    price: "$20/mo",
  },
};

/**
 * Test a tenant.features jsonb blob for a feature. Accepts both the
 * object form ({ flyers: true }) and the legacy array form
 * (["flyers"]) — older tenants seeded before the reconciler ran might
 * still have the array shape until next reconcile. Pure function, safe
 * in the client bundle.
 */
export function tenantFeaturesIncludes(
  features: unknown,
  feature: FeatureName,
): boolean {
  if (Array.isArray(features)) {
    return features.includes(feature);
  }
  if (features && typeof features === "object") {
    return (features as Record<string, unknown>)[feature] === true;
  }
  return false;
}
