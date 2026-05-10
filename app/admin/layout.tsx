import type { ReactNode } from "react";
import { Source_Code_Pro } from "next/font/google";
import "../globals.css";
import "./admin.css";
import { AdminLayoutProvider } from "@/components/admin/AdminLayoutProvider";
import { getPortrait } from "@/lib/contentLoader";
import { getCurrentTenant } from "@/lib/tenant/context";
import { getCurrentTenantFeatures } from "@/lib/features";

// Admin sans = Montserrat, already loaded globally by app/layout.tsx and
// available as `--font-montserrat`. Just adds Source Code Pro here for the
// admin-mono utility (inline numerics, byte counts, hex codes, etc.).
const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-code-pro",
  display: "swap",
});

export async function generateMetadata() {
  const tenant = await getCurrentTenant();
  return {
    title: tenant
      ? `${tenant.realtor_name} · Admin`
      : "Admin · BB Website Project",
  };
}

/**
 * Admin layout — completely overrides the marketing-site layout (no public
 * Header/Footer). Pulls the active tenant once at this level so the sidebar
 * and login form can show the right name without prop-drilling through the
 * 23+ admin pages. Anonymous users hitting deeper /admin/* paths are
 * already bounced to /admin/login by proxy.ts.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Fetch the brand portrait + tenant + unlocked features once at the
  // layout level — every admin page shares these; results are cached
  // for the request lifetime. Features are read from the cached
  // tenants.features jsonb (no extra DB hit beyond getCurrentTenant).
  const [portrait, tenant, unlocked] = await Promise.all([
    getPortrait(),
    getCurrentTenant(),
    getCurrentTenantFeatures(),
  ]);

  return (
    <div className={`admin-root ${sourceCodePro.variable}`}>
      <AdminLayoutProvider
        portraitUrl={portrait.avatar}
        realtorName={tenant?.realtor_name}
        unlockedFeatures={Array.from(unlocked)}
      >
        {children}
      </AdminLayoutProvider>
    </div>
  );
}
