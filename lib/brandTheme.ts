import "server-only";

/**
 * Brand theme — per-tenant CSS variable overrides.
 *
 * Reads `tenant.features.brand` (set during onboarding or via the
 * tenant's admin panel). When the tenant hasn't customised their
 * theme, returns null so the site falls back to the editorial
 * navy/cream defaults declared in app/globals.css.
 *
 * Returned shape mirrors the CSS vars in globals.css verbatim. The
 * <BrandThemeStyle> component serialises this object into a tiny
 * <style> block at the top of the document.
 *
 * Once content_blocks lands (next migration), brand theme will be
 * driven by the dedicated `brand_identity` block instead. Today
 * `tenant.features.brand` is the source of truth.
 */

export interface BrandTheme {
  /** RGB triplet "r g b" — e.g. "20 40 64" */
  primaryRgb?: string;
  primaryDarkRgb?: string;
  primaryLightRgb?: string;
  surfaceRgb?: string;
  surfaceSoftRgb?: string;
  /** Optional CSS gradient string applied on top of bg-navy. */
  primaryGradient?: string;
  /** Optional CSS gradient string applied on top of bg-cream. */
  surfaceGradient?: string;
}

/**
 * Pull a brand theme from a tenant.features payload. Returns null
 * if the tenant hasn't set any colours — caller then skips emitting
 * the override <style> block.
 */
export function brandThemeFromTenant(
  features: Record<string, unknown> | null | undefined,
): BrandTheme | null {
  if (!features) return null;
  const brand = (features as { brand?: Record<string, unknown> }).brand;
  if (!brand || typeof brand !== "object") return null;

  const get = (k: string) => {
    const v = (brand as Record<string, unknown>)[k];
    return typeof v === "string" && v.trim() ? v : undefined;
  };

  const theme: BrandTheme = {
    primaryRgb:       get("primary"),
    primaryDarkRgb:   get("primary_dark"),
    primaryLightRgb:  get("primary_light"),
    surfaceRgb:       get("surface"),
    surfaceSoftRgb:   get("surface_soft"),
    primaryGradient:  get("primary_gradient"),
    surfaceGradient:  get("surface_gradient"),
  };

  // If literally nothing was set, return null so we don't emit an
  // empty <style> block.
  return Object.values(theme).some(Boolean) ? theme : null;
}

/**
 * Serialise a BrandTheme into a CSS rule body. Keep the output tiny
 * — emits only the keys that were set, leaving the rest to fall back
 * to the defaults in globals.css.
 */
export function brandThemeToCss(theme: BrandTheme): string {
  const lines: string[] = [];
  const push = (k: string, v?: string) => v && lines.push(`  ${k}: ${v};`);
  push("--brand-primary-rgb",       theme.primaryRgb);
  push("--brand-primary-dark-rgb",  theme.primaryDarkRgb);
  push("--brand-primary-light-rgb", theme.primaryLightRgb);
  push("--brand-surface-rgb",       theme.surfaceRgb);
  push("--brand-surface-soft-rgb",  theme.surfaceSoftRgb);
  push("--brand-primary-gradient",  theme.primaryGradient);
  push("--brand-surface-gradient",  theme.surfaceGradient);
  return lines.length ? `:root {\n${lines.join("\n")}\n}` : "";
}
