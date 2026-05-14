import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

/**
 * Platform-wide metadata. After the May-2026 pivot this app is a
 * pure lead-CRM for realtor sales reps — no more multi-tenant
 * site builder. So there's no per-tenant title juggling here; the
 * dashboard owns its own framing.
 */
export const metadata: Metadata = {
  title: "BB Platform",
  description: "Realtor lead CRM — sales reps capture client intakes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
