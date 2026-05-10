/**
 * Brand theme — primary/surface colors + optional gradient overrides.
 *
 * Persisted as a single `content_blocks` row (page="brand", key="theme")
 * with this JSON shape:
 *
 *   {
 *     "primary":         "#142840",
 *     "surface":         "#F2EFEA",
 *     "primaryGradient": "" | "linear-gradient(...)",
 *     "surfaceGradient": "" | "linear-gradient(...)"
 *   }
 *
 * Read by `getBrandTheme()` server-side, fed into <BrandThemeStyle />, and
 * injected into the layout as a `<style>` tag overriding the :root CSS
 * variables. Tailwind's `bg-navy`, `text-navy`, `bg-cream`, etc. all read
 * from those variables, so changing them re-skins the entire site.
 *
 * Helpers here:
 *
 *   getBrandTheme()       — server-side loader
 *   hexToRgbTriplet()     — "#142840" → "20 40 64"
 *   deriveDarker()        — primary − 18% lightness
 *   deriveLighter()       — primary + 18% lightness
 *   deriveSurfaceSoft()   — surface − 4% lightness
 */

import { getServiceClient } from "./contentLoader";
import { getCurrentTenantId } from "./tenant/context";

export type BrandTheme = {
  /** Hex color, e.g. "#142840". Default = navy from the original palette. */
  primary: string;
  /** Hex color, e.g. "#F2EFEA". Default = cream. */
  surface: string;
  /**
   * Optional CSS `background-image` value for navy backgrounds (header,
   * footer, hero). Empty string means "use the solid color only".
   */
  primaryGradient: string;
  /** Same idea for cream surfaces. Usually left blank. */
  surfaceGradient: string;
};

export const DEFAULT_BRAND_THEME: BrandTheme = {
  primary: "#142840",
  surface: "#F2EFEA",
  primaryGradient: "",
  surfaceGradient: "",
};

/** Curated gradient presets shown in the admin theme editor. */
export const GRADIENT_PRESETS: { label: string; value: string }[] = [
  {
    label: "Navy depth",
    value: "linear-gradient(135deg, #0E1C30 0%, #25406A 100%)",
  },
  {
    label: "Sunset",
    value: "linear-gradient(135deg, #ED6A5A 0%, #F4D35E 100%)",
  },
  {
    label: "Atlantic",
    value: "linear-gradient(135deg, #0F4C81 0%, #4D9DE0 100%)",
  },
  {
    label: "Forest",
    value: "linear-gradient(135deg, #1B4332 0%, #52796F 100%)",
  },
  {
    label: "Plum",
    value: "linear-gradient(135deg, #2B1B3F 0%, #6B3FA0 100%)",
  },
  {
    label: "Charcoal",
    value: "linear-gradient(135deg, #1F1F1F 0%, #4A4A4A 100%)",
  },
];

/** Hex (#abc / #aabbcc) → "r g b" triplet string used in CSS variables. */
export function hexToRgbTriplet(hex: string): string {
  const v = hex.trim().replace(/^#/, "");
  const full =
    v.length === 3
      ? v
          .split("")
          .map((c) => c + c)
          .join("")
      : v;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return "20 40 64"; // fall back to navy on bad input
  }
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Mix a hex color toward black (factor 0..1). */
function mixWithBlack(hex: string, factor: number): string {
  const triplet = hexToRgbTriplet(hex).split(" ").map(Number);
  const [r, g, b] = triplet;
  const m = (c: number) => Math.round(c * (1 - factor));
  return rgbToHex(m(r), m(g), m(b));
}

/** Mix a hex color toward white (factor 0..1). */
function mixWithWhite(hex: string, factor: number): string {
  const triplet = hexToRgbTriplet(hex).split(" ").map(Number);
  const [r, g, b] = triplet;
  const m = (c: number) => Math.round(c + (255 - c) * factor);
  return rgbToHex(m(r), m(g), m(b));
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0"))
      .join("")
  );
}

export const deriveDarker = (hex: string) => mixWithBlack(hex, 0.22);
export const deriveLighter = (hex: string) => mixWithWhite(hex, 0.28);
export const deriveSurfaceSoft = (hex: string) => mixWithBlack(hex, 0.04);

/**
 * Returns the saved brand theme, or DEFAULT_BRAND_THEME when nothing is
 * persisted yet (or Supabase isn't configured).
 */
export async function getBrandTheme(): Promise<BrandTheme> {
  try {
    const supabase = getServiceClient();
    if (!supabase) return DEFAULT_BRAND_THEME;
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return DEFAULT_BRAND_THEME;
    const { data } = await supabase
      .from("content_blocks")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("page", "brand")
      .eq("key", "theme")
      .maybeSingle();
    if (!data?.value) return DEFAULT_BRAND_THEME;
    const parsed = JSON.parse(data.value) as Partial<BrandTheme>;
    return {
      primary: parsed.primary || DEFAULT_BRAND_THEME.primary,
      surface: parsed.surface || DEFAULT_BRAND_THEME.surface,
      primaryGradient: parsed.primaryGradient || "",
      surfaceGradient: parsed.surfaceGradient || "",
    };
  } catch {
    return DEFAULT_BRAND_THEME;
  }
}
