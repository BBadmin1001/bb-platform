import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import AdminCard from "@/components/admin/AdminCard";
import {
  FileText,
  Image as ImageIcon,
  Home as HomeIcon,
  Star,
  Users,
  Briefcase,
  UsersRound,
  DoorOpen,
  Palette,
  Plug,
  BarChart3,
  Search,
} from "lucide-react";

// Each card has its own accent + a domain-specific animated visual.
// Variants are content-aware: palette swatches for brand, growing houses
// for communities, ticking checkmarks for closings, etc.
import type { AdminCardVariant } from "@/components/admin/AdminCardVisuals";
import { getCurrentTenantFeatures } from "@/lib/features";
import type { FeatureName } from "@/lib/features-meta";

const editorSections: Array<{
  href: string;
  icon: typeof Palette;
  title: string;
  description: string;
  accent: string;
  badge: string;
  variant: AdminCardVariant;
  /** When set, the card renders with a Locked chip if the tenant
   *  hasn't unlocked this feature. Card still routes to the page,
   *  which itself shows the upgrade banner. */
  feature?: FeatureName;
}> = [
  {
    href: "/admin/brand",
    icon: Palette,
    title: "Brand Identity",
    description:
      "Site colors, name, photos, broker logo, favicon, and share image — everything that defines the look and feel.",
    accent: "#2e7d32",
    badge: "Look & feel",
    variant: "palette",
  },
  {
    href: "/admin/content",
    icon: FileText,
    title: "Content",
    description: "Headings, paragraphs, CTAs across every page.",
    accent: "#5b7c4a",
    badge: "Copy",
    variant: "lines",
  },
  {
    href: "/admin/media",
    icon: ImageIcon,
    title: "Media Library",
    description: "Upload, crop, remove backgrounds. Swap images and videos.",
    accent: "#8d6e63",
    badge: "Assets",
    variant: "stack",
  },
  {
    href: "/admin/communities",
    icon: HomeIcon,
    title: "Communities",
    description: "Edit the 6 neighborhoods and their yearly market data.",
    accent: "#1b5e20",
    badge: "Neighborhoods",
    variant: "houses",
  },
  {
    href: "/admin/closings",
    icon: Briefcase,
    title: "Recent Closings",
    description: "Add and manage closed-sale entries.",
    accent: "#6d4c41",
    badge: "Sales",
    variant: "checks",
  },
  {
    href: "/admin/open-houses",
    icon: DoorOpen,
    title: "Open Houses",
    description:
      "Build a landing page + printable A4 flyer for each open house. Auto-generates an RSVP form.",
    accent: "#388e3c",
    badge: "Listings",
    variant: "door",
    feature: "flyers",
  },
  {
    href: "/admin/reviews",
    icon: Star,
    title: "Reviews",
    description: "Manage testimonials. Pull from Google. Share review link.",
    accent: "#a47148",
    badge: "Social proof",
    variant: "stars",
  },
  {
    href: "/admin/partners",
    icon: Users,
    title: "Trusted Partners",
    description: "Lenders, inspectors, insurance, and trades.",
    accent: "#4caf50",
    badge: "Network",
    variant: "nodes",
  },
  {
    href: "/admin/team",
    icon: UsersRound,
    title: "Team",
    description: "Invite teammates and manage owner / editor roles.",
    accent: "#3e2723",
    badge: "Access",
    variant: "team",
  },
  {
    href: "/admin/integrations/google",
    icon: Plug,
    title: "Integrations",
    description:
      "Connect Google Reviews, Mailchimp, and more. Pull reviews from Google directly into your admin queue for approval.",
    accent: "#2e7d32",
    badge: "Connect",
    variant: "plug",
    feature: "google_reviews_widget",
  },
  {
    href: "/admin/analytics",
    icon: BarChart3,
    title: "Website Analytics",
    description:
      "See traffic, page views, and where visitors come from. Powered by Google Analytics 4 — paste your Measurement ID once and we install the tag everywhere.",
    accent: "#388e3c",
    badge: "Insights",
    variant: "chart",
    feature: "analytics",
  },
  {
    href: "/admin/seo",
    icon: Search,
    title: "SEO",
    description:
      "Search visibility tools — auto-deploy county landing pages targeting 'realtor in [county]' searches, sitemap, image alt-text audit, and Search Console hookup.",
    accent: "#1b5e20",
    badge: "Visibility",
    variant: "search",
    feature: "seo_county_pages",
  },
];

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in? Render the login form right here at /admin instead of
  // bouncing to a separate /admin/login URL. After login, send the user back
  // to wherever middleware redirected them from (if they were trying to hit
  // a deeper /admin/* route).
  if (!user) {
    const from = (await searchParams)?.from;
    return <AdminLoginForm from={from} />;
  }

  // Pull the unlocked feature set so dashboard cards can show a
  // "Locked" chip + dim for features the tenant hasn't paid for.
  // Cards still route to the gated page (which shows the upgrade
  // banner) — we don't disable the click.
  const unlocked = await getCurrentTenantFeatures();

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <div className="mb-10">
          <p
            className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3"
            style={{ fontWeight: 500 }}
          >
            Site Editor
          </p>
          <h1
            className="text-2xl md:text-3xl text-ink mb-2"
            style={{ fontWeight: 600, letterSpacing: "0.01em" }}
          >
            What would you like to update?
          </h1>
          <p className="text-sm text-ink/65 max-w-xl">
            Every change is saved as a draft and published instantly. Version
            history is kept for 30 days — you can roll back any change.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {editorSections.map((s) => (
            <AdminCard
              key={s.href}
              href={s.href}
              icon={s.icon}
              title={s.title}
              description={s.description}
              badge={s.badge}
              accent={s.accent}
              variant={s.variant}
              locked={s.feature ? !unlocked.has(s.feature) : false}
            />
          ))}
        </div>

        {/* Status — what's live and what's next */}
        <div className="mt-10 admin-card p-6 bg-cream-soft/50 border-dashed">
          <p className="text-xs tracking-[0.18em] uppercase text-ink/55 mb-2">
            What&rsquo;s live
          </p>
          <p className="text-sm text-ink/75 leading-relaxed">
            Everything is live. Edit copy, photos, communities, closings,
            reviews, and partners from the cards above. Build new forms in{" "}
            <a href="/admin/forms" className="text-navy underline underline-offset-2">Forms</a>{" "}
            — they auto-publish at <code className="text-[11px]">/form/[slug]</code>{" "}
            and feed{" "}
            <a href="/admin/inbox" className="text-navy underline underline-offset-2">Inbox</a>{" "}
            along with Contact and Sellers Valuation submissions. Public
            review link:{" "}
            <a href="/leave-review" target="_blank" className="text-navy underline underline-offset-2">/leave-review</a>.
          </p>
          <p className="text-xs tracking-[0.18em] uppercase text-ink/55 mt-5 mb-2">
            Coming next
          </p>
          <p className="text-sm text-ink/75 leading-relaxed">
            Team invites, then optional Google My Business review pulls.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
