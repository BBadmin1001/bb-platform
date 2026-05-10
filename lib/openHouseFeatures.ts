/**
 * Optional "extra" features for an open house. Bedrooms, bathrooms, and
 * garage spaces live in their own structured columns on `open_houses` —
 * the flyer always shows those first, then fills the remaining feature
 * pills from this list (limit 4 pills total per flyer).
 */

export type OpenHouseFeatureKey =
  | "floor_plans_available"
  | "open_floor_plan"
  | "hardwood_floors"
  | "gourmet_kitchen"
  | "updated_bathrooms"
  | "primary_suite"
  | "finished_basement"
  | "large_backyard"
  | "smart_home_tech"
  | "outdoor_living";

export type OpenHouseFeature = {
  key: OpenHouseFeatureKey;
  label: string;
  /** Lucide icon name. Render via `import { ${icon} } from "lucide-react"`. */
  icon: string;
};

export const OPEN_HOUSE_FEATURES: OpenHouseFeature[] = [
  { key: "floor_plans_available", label: "Floor Plans Available", icon: "FileSpreadsheet" },
  { key: "open_floor_plan",       label: "Open Floor Plan",       icon: "LayoutDashboard" },
  { key: "hardwood_floors",       label: "Hardwood Floors",       icon: "TreePine" },
  { key: "gourmet_kitchen",       label: "Gourmet Kitchen",       icon: "ChefHat" },
  { key: "updated_bathrooms",     label: "Updated Bathrooms",     icon: "Bath" },
  { key: "primary_suite",         label: "Primary Suite",         icon: "BedDouble" },
  { key: "finished_basement",     label: "Finished Basement",     icon: "Layers" },
  { key: "large_backyard",        label: "Large Backyard",        icon: "Trees" },
  { key: "smart_home_tech",       label: "Smart-Home Tech",       icon: "Smartphone" },
  { key: "outdoor_living",        label: "Outdoor Living",        icon: "Tent" },
];

export const OPEN_HOUSE_FEATURE_BY_KEY: Record<string, OpenHouseFeature> =
  Object.fromEntries(OPEN_HOUSE_FEATURES.map((f) => [f.key, f]));

/** Total feature pills on the flyer (bed + bath + garage when > 0 + extras). */
export const TOTAL_FLYER_PILLS = 4;

/** Word limit for the open-house tagline / description. */
export const DESCRIPTION_WORD_LIMIT = 100;

/** Count whitespace-separated words. */
export function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** Trim a string to at most `limit` words, preserving original spacing. */
export function clampToWords(s: string, limit: number): string {
  const parts = s.split(/(\s+)/); // keep separators
  let count = 0;
  let out = "";
  for (const p of parts) {
    if (/^\s+$/.test(p)) {
      out += p;
      continue;
    }
    if (p === "") continue;
    if (count >= limit) break;
    out += p;
    count++;
  }
  return out.trimEnd();
}
