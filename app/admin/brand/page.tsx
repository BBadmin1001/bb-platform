import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Palette,
  User,
  Building2,
  CircleUser,
  Share2,
  Type,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import AdminCard from "@/components/admin/AdminCard";
import type { AdminCardVariant } from "@/components/admin/AdminCardVisuals";
import { getBrandTheme, DEFAULT_BRAND_THEME } from "@/lib/brandTheme";

/**
 * Brand Identity dashboard.
 *
 * Pulls together every brand-related editor in one place:
 *
 *   • Identity (name, role, brokerage, tagline, service area, languages)
 *   • Site Colors (theme — primary + surface + optional gradients)
 *   • Realtor Image
 *   • Broker Image
 *   • Favicon
 *   • Featured Image
 *
 * Each card links to its dedicated editor. Identity + the 4 image fields
 * still live under the existing /admin/content/brand/* routes (so the
 * generic Section editor + history work unchanged); only Theme has its
 * own bespoke editor with color pickers + gradient presets.
 */

type CardConfig = {
  href: string;
  icon: typeof Palette;
  title: string;
  description: string;
  /** Lookup key in content_blocks so we can show "Edited" badge. */
  blockKey: string;
  /** Per-card accent — drives the visual gradient + Open arrow color. */
  accent: string;
  /** Animated visual that matches the card's domain. */
  variant: AdminCardVariant;
};

const CARDS: CardConfig[] = [
  {
    href: "/admin/brand/theme",
    icon: Palette,
    title: "Site Colors",
    description:
      "Re-skin everything — header, footer, menu, buttons. Pick primary + surface colors, or use a gradient.",
    blockKey: "theme",
    accent: "#2e7d32",
    variant: "palette",
  },
  {
    href: "/admin/content/brand/identity",
    icon: Type,
    title: "Identity",
    description:
      "Name, role, brokerage, tagline, service area, and languages. Used site-wide.",
    blockKey: "identity",
    accent: "#5b7c4a",
    variant: "lines",
  },
  {
    href: "/admin/content/brand/portrait",
    icon: User,
    title: "Realtor Image",
    description:
      "Headshot used in the header avatar, footer, homepage intro, and About hero.",
    blockKey: "portrait",
    accent: "#8d6e63",
    variant: "stack",
  },
  {
    href: "/admin/content/brand/brokerLogo",
    icon: Building2,
    title: "Broker Image",
    description:
      "Brokerage logo shown on the open-house flyer and anywhere the brokerage is identified.",
    blockKey: "brokerLogo",
    accent: "#1b5e20",
    variant: "tower",
  },
  {
    href: "/admin/content/brand/favicon",
    icon: CircleUser,
    title: "Favicon",
    description:
      "Tab icon. Square crop, rendered as a circle in the picker preview.",
    blockKey: "favicon",
    accent: "#a47148",
    variant: "browser",
  },
  {
    href: "/admin/content/brand/featuredImage",
    icon: Share2,
    title: "Site Featured Image",
    description:
      "Default OpenGraph image used when your site is shared on Facebook, iMessage, etc.",
    blockKey: "featuredImage",
    accent: "#4caf50",
    variant: "share",
  },
];

export default async function BrandDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Which brand sections have been customised? Used for the "Edited" badge
  // and the live theme swatch on the Site Colors card.
  const [{ data: rows }, theme] = await Promise.all([
    supabase
      .from("content_blocks")
      .select("key, updated_at")
      .eq("page", "brand"),
    getBrandTheme(),
  ]);
  const edited = new Map(
    (rows ?? []).map((r) => [r.key as string, r.updated_at as string]),
  );

  const themeChanged =
    theme.primary.toLowerCase() !== DEFAULT_BRAND_THEME.primary.toLowerCase() ||
    theme.surface.toLowerCase() !== DEFAULT_BRAND_THEME.surface.toLowerCase() ||
    Boolean(theme.primaryGradient) ||
    Boolean(theme.surfaceGradient);

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-ink/55 hover:text-ink mb-6"
        >
          <ArrowLeft size={14} /> Back to Site Editor
        </Link>

        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3"
          style={{ fontWeight: 500 }}
        >
          Site Editor · Brand Identity
        </p>
        <h1
          className="text-2xl md:text-3xl text-ink mb-2"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          Look &amp; feel.
        </h1>
        <p className="text-sm text-ink/65 max-w-2xl mb-10">
          Everything that defines how the site looks and identifies itself —
          colors, name, photo, brokerage, favicon, share image — all in one
          place. Changes save to history for 30 days; you can roll back from
          each section.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map((c) => {
            const ed = edited.get(c.blockKey);
            const isTheme = c.blockKey === "theme";
            // Site Colors card: badge mirrors the live theme swatches when
            // they've been customised. Other cards: "Edited" badge if the
            // section has any saved value yet.
            let badge: string | undefined;
            if (isTheme) {
              badge = themeChanged ? "Customised" : undefined;
            } else if (ed) {
              badge = "Edited";
            }
            // The Site Colors card uses the LIVE primary as its accent so
            // the dashboard "rhymes" with whatever colors are currently
            // saved — change theme → this card visibly tracks it.
            const accent = isTheme && themeChanged ? theme.primary : c.accent;
            return (
              <AdminCard
                key={c.href}
                href={c.href}
                icon={c.icon}
                title={c.title}
                description={c.description}
                badge={badge}
                accent={accent}
                variant={c.variant}
              />
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
