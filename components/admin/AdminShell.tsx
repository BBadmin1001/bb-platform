"use client";

/**
 * AdminShell — wraps every authenticated admin page with the persistent
 * sidebar nav and the proper padding around the main content.
 *
 * Layout:
 *
 *   ┌──────────────┬────────────────────────────────────────┐
 *   │              │  ┌──────────────────────────────────┐  │
 *   │   Sidebar    │  │           Page content           │  │
 *   │   (240px)    │  │   (max-w; centered; with gutter) │  │
 *   │              │  └──────────────────────────────────┘  │
 *   └──────────────┴────────────────────────────────────────┘
 *
 * On mobile the sidebar slides in over the content with a backdrop.
 * The main content always has its own gutter padding so nothing ever
 * sits under the sidebar.
 */

import { useState } from "react";
import { Menu as MenuIcon } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import { useAdminLayout } from "./AdminLayoutProvider";

export default function AdminShell({
  user,
  children,
}: {
  user: { email: string };
  children: React.ReactNode;
}) {
  const { realtorName } = useAdminLayout();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* ── Sidebar — desktop ── */}
      <div className="hidden md:flex sticky top-0 h-screen">
        <AdminSidebar user={user} />
      </div>

      {/* ── Sidebar — mobile drawer ── */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <AdminSidebar user={user} onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* ── Main column ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile-only top bar with hamburger */}
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
          <span
            className="ml-3 text-sm"
            style={{ fontWeight: 600, letterSpacing: "0.02em" }}
          >
            {realtorName ? `${realtorName} · Admin` : "Admin"}
          </span>
        </header>

        {/* Content — extra padding so headings don't kiss the sidebar edge */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
