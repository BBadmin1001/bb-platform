/**
 * BrandThemeStyle — server-side `<style>` injector that overrides the
 * default brand CSS variables with whatever is saved at `brand.theme`.
 *
 * Mounted once at the top of <body> in `app/layout.tsx`. Tailwind's
 * `bg-navy`, `text-navy`, `bg-cream`, etc. all read from the variables
 * (see tailwind.config.ts), so swapping the variables here re-skins
 * everything: header, footer, menu, buttons, badges, cards, the lot.
 *
 * If no theme has been saved yet (or Supabase isn't configured),
 * BrandThemeStyle renders nothing — the :root defaults in globals.css
 * keep the original navy/cream palette.
 */

import {
  getBrandTheme,
  hexToRgbTriplet,
  deriveDarker,
  deriveLighter,
  deriveSurfaceSoft,
  DEFAULT_BRAND_THEME,
} from "@/lib/brandTheme";

export default async function BrandThemeStyle() {
  const theme = await getBrandTheme();

  // No-op when nothing's been customised — :root defaults already match.
  const primarySame = theme.primary.toLowerCase() === DEFAULT_BRAND_THEME.primary.toLowerCase();
  const surfaceSame = theme.surface.toLowerCase() === DEFAULT_BRAND_THEME.surface.toLowerCase();
  if (
    primarySame &&
    surfaceSame &&
    !theme.primaryGradient &&
    !theme.surfaceGradient
  ) {
    return null;
  }

  const primaryRgb = hexToRgbTriplet(theme.primary);
  const primaryDarkRgb = hexToRgbTriplet(deriveDarker(theme.primary));
  const primaryLightRgb = hexToRgbTriplet(deriveLighter(theme.primary));
  const surfaceRgb = hexToRgbTriplet(theme.surface);
  const surfaceSoftRgb = hexToRgbTriplet(deriveSurfaceSoft(theme.surface));

  // Normalise gradient values — empty string becomes "none" so the CSS
  // variable doesn't accidentally inherit a stale value.
  const primaryGradient = theme.primaryGradient || "none";
  const surfaceGradient = theme.surfaceGradient || "none";

  const css = `:root {
  --brand-primary-rgb: ${primaryRgb};
  --brand-primary-dark-rgb: ${primaryDarkRgb};
  --brand-primary-light-rgb: ${primaryLightRgb};
  --brand-surface-rgb: ${surfaceRgb};
  --brand-surface-soft-rgb: ${surfaceSoftRgb};
  --brand-primary-gradient: ${primaryGradient};
  --brand-surface-gradient: ${surfaceGradient};
}`;

  return (
    <style
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: css }}
    />
  );
}
