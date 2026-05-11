"use client";

/**
 * Admin sidebar — sticky left rail with nav, dark-mode toggle, and sign-out.
 *
 * Width: 240px on desktop. Collapsed to a hamburger drawer on mobile.
 * Padding & spacing are baked in so the main content area never overlaps.
 *
 * Nav links are grouped:
 *   • Site Editor       (everything that affects the public site)
 *   • Operations        (inbox, forms — internal workflow)
 *   • Account           (sign out)
 *
 * Dark-mode toggle is at the bottom; clicking flips
 * `document.documentElement.dataset.adminTheme` and persists to localStorage.
 * The pre-paint inline script in `app/admin/layout.tsx` reads it back on
 * the next load to avoid a flash of wrong theme.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutTemplate,
  Inbox,
  ClipboardList,
  LogOut,
  Image as ImageIcon,
  Palette,
  Plug,
  Star,
  X,
  ExternalLink,
  BarChart3,
  Search,
  Globe,
  Lock,
  FileText,
} from "lucide-react";
import NextImage from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAdminLayout } from "@/components/admin/AdminLayoutProvider";
import type { FeatureName } from "@/lib/features-meta";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutTemplate;
  matchPrefix?: boolean;
  /** If set, the item is gated on this feature. Locked items still
   *  render in the sidebar (so customers can see what they could
   *  unlock) but show a lock badge and route to a "Locked" upgrade
   *  banner page. */
  feature?: FeatureName;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Site Editor",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutTemplate },
      { href: "/admin/brand", label: "Brand Identity", icon: Palette, matchPrefix: true },
      { href: "/admin/domain", label: "Your Domain", icon: Globe, matchPrefix: true },
      { href: "/admin/media", label: "Media Library", icon: ImageIcon, matchPrefix: true },
      { href: "/admin/pages", label: "Custom Pages", icon: FileText, matchPrefix: true },
      { href: "/admin/reviews", label: "Reviews", icon: Star, matchPrefix: true },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: BarChart3,
        matchPrefix: true,
        feature: "analytics",
      },
      {
        href: "/admin/seo",
        label: "SEO",
        icon: Search,
        matchPrefix: true,
        feature: "seo_county_pages",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/inbox", label: "Inbox", icon: Inbox, matchPrefix: true },
      { href: "/admin/forms", label: "Forms", icon: ClipboardList, matchPrefix: true },
      {
        href: "/admin/integrations/google",
        label: "Integrations",
        icon: Plug,
        matchPrefix: false,
        feature: "google_reviews_widget",
      },
    ],
  },
];

export default function AdminSidebar({
  user,
  onClose,
}: {
  user: { email: string };
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { portraitUrl, realtorName, unlockedFeatures } = useAdminLayout();

  function isActive(item: NavItem) {
    if (item.matchPrefix) return pathname.startsWith(item.href);
    return pathname === item.href;
  }

  function isLocked(item: NavItem) {
    return !!item.feature && !unlockedFeatures.has(item.feature);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside
      className="flex flex-col h-full w-[240px] shrink-0"
      style={{
        background: "var(--sidebar)",
        color: "var(--sidebar-foreground)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Brand mark — circular portrait + name */}
      <div
        className="px-5 py-6 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <Link
          href="/admin"
          onClick={onClose}
          className="flex items-center gap-3 flex-1 min-w-0 group"
          aria-label="Admin dashboard"
        >
          <span
            className="relative shrink-0 w-12 h-12 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              boxShadow:
                "0 0 0 2px var(--sidebar), 0 0 0 3px color-mix(in srgb, var(--primary) 35%, transparent), 0 4px 10px -2px rgba(0,0,0,0.18)",
              background:
                "color-mix(in srgb, var(--primary) 12%, var(--sidebar))",
            }}
          >
            {portraitUrl ? (
              <NextImage
                src={portraitUrl}
                alt={realtorName ?? ""}
                fill
                sizes="48px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                priority
              />
            ) : (
              <span
                className="text-sm uppercase"
                style={{ color: "var(--primary)", fontWeight: 600 }}
              >
                {/* First initial of realtor name as a fallback when no
                    portrait has been uploaded yet — no longer leaks
                    Samina's headshot onto other tenants. */}
                {(realtorName ?? "").trim().charAt(0) || "·"}
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span
              className="block text-sm leading-tight truncate"
              style={{ fontWeight: 600, letterSpacing: "0.01em", color: "var(--sidebar-foreground)" }}
            >
              {realtorName ?? "Admin"}
            </span>
            <span
              className="block text-[10px] uppercase tracking-[0.2em] mt-1"
              style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
            >
              Admin
            </span>
          </span>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1 rounded hover:opacity-80 shrink-0"
            aria-label="Close menu"
            style={{ color: "var(--muted-foreground)" }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p
              className="text-[10px] uppercase tracking-[0.2em] mb-2 px-3"
              style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
            >
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                const locked = isLocked(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="admin-tab w-full flex items-center"
                    style={
                      active
                        ? {
                            background: "var(--sidebar-primary)",
                            color: "var(--sidebar-primary-foreground)",
                          }
                        : locked
                        ? { opacity: 0.65 }
                        : undefined
                    }
                    title={
                      locked
                        ? `${item.label} — locked. Open to learn how to unlock.`
                        : undefined
                    }
                  >
                    <Icon size={15} strokeWidth={1.75} />
                    <span className="flex-1">{item.label}</span>
                    {locked && (
                      <Lock
                        size={12}
                        strokeWidth={2}
                        style={{
                          color: active
                            ? "var(--sidebar-primary-foreground)"
                            : "var(--muted-foreground)",
                        }}
                        aria-label="Locked"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — Back to Site + email + sign out */}
      <div
        className="p-3 space-y-2"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        {/* Back to public site — opens marketing site in same tab so admin
            can preview their changes without losing the admin session. */}
        <Link
          href="/"
          onClick={onClose}
          className="admin-tab w-full"
          style={{
            color: "var(--primary)",
            fontWeight: 600,
          }}
        >
          <ExternalLink size={14} strokeWidth={1.75} />
          Back to Site
        </Link>

        <div
          className="px-3 py-2 rounded text-[11px] truncate"
          style={{ color: "var(--muted-foreground)" }}
          title={user.email}
        >
          {user.email}
        </div>

        <button
          type="button"
          onClick={signOut}
          className="admin-tab w-full"
          style={{ color: "var(--destructive)" }}
        >
          <LogOut size={15} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
