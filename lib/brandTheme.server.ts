import "server-only";

/**
 * Server-only brand-theme loader.
 *
 * Lives in its own file so the client-safe pieces of `brandTheme.ts`
 * (types, constants, color helpers used by the admin theme editor)
 * can be imported from client components without dragging the
 * `server-only` boundary along.
 */

import { getServiceClient } from "./contentLoader";
import { getCurrentTenantId } from "./tenant/context";
import { DEFAULT_BRAND_THEME, type BrandTheme } from "./brandTheme";

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
