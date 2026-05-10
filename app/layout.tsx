import type { Metadata } from "next";
import Script from "next/script";
import { Montserrat } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BrandThemeStyle from "@/components/BrandThemeStyle";
import { getPortrait, getFeaturedImage } from "@/lib/contentLoader";
import { getAnalyticsMeasurementId } from "@/lib/integrationStore";
import { siteOrigin } from "@/lib/qrcode";
import { getCurrentTenant } from "@/lib/tenant/context";
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
  // Fetch portrait + Analytics ID once so children don't refetch.
  // Both are gated by tenant context — no tenant → defaults.
  const [portrait, gaMeasurementId, h] = await Promise.all([
    getPortrait(),
    getAnalyticsMeasurementId(),
    headers(),
  ]);

  // Skip the public Header/Footer for the admin and master shells —
  // they own their full-viewport chrome and the public chrome would
  // double-render at the top of every admin page. proxy.ts stamps
  // x-pathname on every request so we can read it here.
  const path = h.get("x-pathname") ?? "";
  const hideShell =
    path.startsWith("/admin") ||
    path.startsWith("/master") ||
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
        {!hideShell && <Header portraitAvatar={portrait.avatar} />}
        <main>{children}</main>
        {!hideShell && <Footer portraitAvatar={portrait.avatar} />}
      </body>
    </html>
  );
}
