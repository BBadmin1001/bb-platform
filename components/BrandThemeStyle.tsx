import { getCurrentTenant } from "@/lib/tenant/context";
import { brandThemeFromTenant, brandThemeToCss } from "@/lib/brandTheme";

/**
 * Server-rendered <style> tag that overrides the brand CSS vars
 * with the active tenant's theme. Mounted in app/layout.tsx so it
 * runs on every page render.
 *
 * No-op when no tenant is in context (master dashboard, unknown
 * host) or when the tenant hasn't customised their colours.
 */
export default async function BrandThemeStyle() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;

  const theme = brandThemeFromTenant(tenant.features);
  if (!theme) return null;

  const css = brandThemeToCss(theme);
  if (!css) return null;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
