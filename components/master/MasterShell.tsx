"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CreditCard,
  Inbox as InboxIcon,
  ShieldCheck,
  Menu as MenuIcon,
  LogOut,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Building2;
  matchPrefix?: boolean;
}

const NAV: NavItem[] = [
  { href: "/master", label: "Overview", icon: Sparkles },
  { href: "/master/tenants", label: "Tenants", icon: Building2, matchPrefix: true },
  { href: "/master/plans", label: "Plans", icon: CreditCard, matchPrefix: true },
  { href: "/master/leads", label: "All Leads", icon: InboxIcon, matchPrefix: true },
  { href: "/master/super-admins", label: "Super Admins", icon: ShieldCheck, matchPrefix: true },
];

/**
 * Master dashboard shell — same layout shape as AdminShell but with
 * the master-specific nav and the deep-plum accent from master.css.
 */
export default function MasterShell({
  user,
  children,
}: {
  user: { email: string };
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  function isActive(item: NavItem) {
    if (item.matchPrefix) return pathname.startsWith(item.href);
    return pathname === item.href;
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin");
    router.refresh();
  }

  function Sidebar({ onClose }: { onClose?: () => void }) {
    return (
      <aside
        className="flex flex-col h-full w-[240px] shrink-0"
        style={{
          background: "var(--sidebar)",
          borderRight: "1px solid var(--sidebar-border)",
          color: "var(--sidebar-foreground)",
        }}
      >
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
          <span className="master-pill">Master</span>
          <p
            className="mt-3 text-base"
            style={{ fontWeight: 600, color: "var(--sidebar-foreground)" }}
          >
            BB Website Project
          </p>
          <p
            className="text-[11px] mt-0.5"
            style={{ color: "var(--muted-foreground)", letterSpacing: "0.04em" }}
          >
            Platform owner controls
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2 rounded text-sm mb-0.5 transition-colors"
                style={{
                  color: active ? "var(--sidebar-primary)" : "var(--sidebar-foreground)",
                  background: active
                    ? "color-mix(in srgb, var(--sidebar-primary) 12%, transparent)"
                    : "transparent",
                  fontWeight: active ? 600 : 500,
                }}
              >
                <Icon size={16} strokeWidth={1.6} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + sign out */}
        <div
          className="p-4 border-t text-xs"
          style={{ borderColor: "var(--sidebar-border)" }}
        >
          <p
            className="truncate"
            style={{ color: "var(--muted-foreground)" }}
            title={user.email}
          >
            {user.email}
          </p>
          <button
            type="button"
            onClick={signOut}
            className="mt-2 inline-flex items-center gap-1.5 hover:opacity-80"
            style={{ color: "var(--sidebar-foreground)" }}
          >
            <LogOut size={12} />
            <span style={{ letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, fontSize: "0.65rem" }}>
              Sign out
            </span>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Desktop sidebar */}
      <div className="hidden md:flex sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="md:hidden h-14 px-4 flex items-center sticky top-0 z-30"
          style={{
            background: "var(--card)",
            color: "var(--card-foreground)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-1.5 -ml-1.5 rounded hover:opacity-80"
            aria-label="Open menu"
          >
            <MenuIcon size={20} />
          </button>
          <span className="ml-3 text-sm" style={{ fontWeight: 600 }}>
            BB Website Project · Master
          </span>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
