import type { Metadata } from "next";
import Script from "next/script";
import { Montserrat } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BrandThemeStyle from "@/components/BrandThemeStyle";
import TrackPageview from "@/components/TrackPageview";
import { getPortrait, getFeaturedImage, getServiceClient } from "@/lib/contentLoader";
import { getAnalyticsMeasurementId } from "@/lib/integrationStore";
import { siteOrigin } from "@/lib/qrcode";
import { getCurrentTenant, getCurrentTenantId } from "@/lib/tenant/context";
import { getTenantChrome } from "@/lib/tenant/chrome";
import { headers } from "next/headers";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

/**
 * Per-tenant metadata. When the request has a tenant in context, we
 * pull title/description from the tenant row + the editable
 * `getFeaturedImage()` that resolves to a Cloudinary OG image.
 *
 * Master / unknown contexts get the platform-level fallbacks.
 */
export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();

  if (!tenant) {
    return {
      title: "BB Website Project",
      description: "Multi-tenant SaaS realtor website platform",
    };
  }

  const ogImage = await getFeaturedImage();
  const subline = tenant.brokerage
    ? `${tenant.realtor_name} · ${tenant.brokerage}`
    : tenant.realtor_name;
  const description =
    (tenant.features as { tagline?: string })?.tagline ?? subline;

  return {
    metadataBase: new URL(siteOrigin()),
    title: `${tenant.realtor_name}${tenant.brokerage ? ` | ${tenant.brokerage}` : ""}`,
    description,
    openGraph: {
      title: tenant.realtor_name,
      description,
      type: "website",
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: tenant.realtor_name,
      description,
      images: [ogImage],
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch portrait + Analytics ID + the tenant chrome (name, role,
  // phone/email/social/licenses/office) once so children don't
  // refetch. All are gated by tenant context — no tenant → safe
  // neutral defaults (chrome.hasTenant = false).
  const [portrait, gaMeasurementId, h, chrome] = await Promise.all([
    getPortrait(),
    getAnalyticsMeasurementId(),
    headers(),
    getTenantChrome(),
  ]);

  // Custom pages flagged show_in_nav surface in the public Header
  // and MenuDrawer alongside the built-in nav items.
  type NavCustomPage = { slug: string; title: string };
  let customNavPages: NavCustomPage[] = [];
  // Communities children for the MenuDrawer submenu — per-tenant rows
  // from the communities table, not the legacy hardcoded VA list.
  let communityChildren: { slug: string; name: string }[] = [];
  if (chrome.hasTenant) {
    const supabase = getServiceClient();
    const tenantId = await getCurrentTenantId();
    if (supabase && tenantId) {
      const [customRes, communityRes] = await Promise.all([
        supabase
          .from("custom_pages")
          .select("slug, title")
          .eq("tenant_id", tenantId)
          .eq("is_published", true)
          .eq("show_in_nav", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("communities")
          .select("slug, name")
          .eq("tenant_id", tenantId)
          .eq("is_visible", true)
          .order("display_order", { ascending: true })
          .limit(8),
      ]);
      customNavPages = (customRes.data ?? []) as NavCustomPage[];
      communityChildren = (communityRes.data ?? []) as {
        slug: string;
        name: string;
      }[];
    }
  }

  // Skip the public Header/Footer for the admin and master shells —
  // they own their full-viewport chrome and the public chrome would
  // double-render at the top of every admin page. proxy.ts stamps
  // x-pathname on every request so we can read it here.
  const path = h.get("x-pathname") ?? "";
  const hideShell =
    path.startsWith("/admin") ||
    path.startsWith("/master") ||
    path.startsWith("/sales") ||
    path.startsWith("/get-started") ||
    path.startsWith("/onboarding");

  return (
    <html lang="en" className={montserrat.variable}>
      <body>
        {/* Per-tenant GA4 — only renders if the tenant has Analytics
            connected via /admin/integrations/analytics. */}
        {gaMeasurementId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}', { send_page_view: true });
              `}
            </Script>
          </>
        )}

        {/* Per-tenant brand theme — overrides --brand-* CSS variables. */}
        <BrandThemeStyle />
        {/* Built-in pageview tracker — fires once per route change on
            public tenant pages. Mirrors hideShell logic so admin /
            master / sales pages don't pollute the analytics. */}
        {!hideShell && <TrackPageview />}
        {!hideShell && (
          <Header
            portraitAvatar={portrait.avatar}
            realtorName={chrome.name}
            role={chrome.role}
            brokerage={chrome.brokerage}
            phone={chrome.phone}
            phoneHref={chrome.phoneHref}
            email={chrome.email}
            emailHref={chrome.emailHref}
            socialInstagram={chrome.social.instagram}
            socialFacebook={chrome.social.facebook}
            socialTiktok={chrome.social.tiktok}
            socialLinkedin={chrome.social.linkedin}
            customNavPages={customNavPages}
            communityChildren={communityChildren}
          />
        )}
        <main>{children}</main>
        {!hideShell && (
          <Footer portraitAvatar={portrait.avatar} chrome={chrome} />
        )}
      </body>
    </html>
  );
}
