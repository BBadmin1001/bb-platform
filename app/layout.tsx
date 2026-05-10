import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import BrandThemeStyle from "@/components/BrandThemeStyle";
import { getCurrentTenant } from "@/lib/tenant/context";

/**
 * Montserrat is the marketing-side font. Bound to --font-montserrat
 * which globals.css references via --font-sans in @theme inline.
 *
 * Admin pages override this with a tighter heading stack via
 * .admin-root scoped tokens (added in Phase 2 with admin.css).
 */
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  if (tenant) {
    return {
      title: tenant.realtor_name,
      description:
        tenant.brokerage
          ? `${tenant.realtor_name} · ${tenant.brokerage}`
          : tenant.realtor_name,
    };
  }
  return {
    title: "BB Website Project",
    description: "Multi-tenant SaaS realtor website platform",
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full antialiased`}>
      <head>
        {/* Per-tenant brand colour override. No-op for master / unknown. */}
        <BrandThemeStyle />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
