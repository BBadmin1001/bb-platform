"use client";

/**
 * AdminLayoutProvider — client-side React context that exposes data
 * fetched server-side in `app/admin/layout.tsx` to client components
 * deeper in the tree (AdminSidebar's circular portrait, the realtor
 * name shown in the sidebar header and the mobile top bar, and the
 * unlocked feature flags so the sidebar can render lock icons next to
 * gated nav items the tenant hasn't paid for).
 *
 * Avoids prop-drilling these through 23+ admin pages.
 */

import { createContext, useContext, type ReactNode } from "react";
import type { FeatureName } from "@/lib/features-meta";

interface AdminLayoutContextValue {
  /** Resolved circular avatar URL — Cloudinary if uploaded, else static. */
  portraitUrl: string;
  /** Realtor / business name shown in the sidebar header. Empty for
   *  anon contexts (master dashboard, unknown host). */
  realtorName: string;
  /** Set of feature names the active tenant has unlocked, derived from
   *  their active Stripe subscriptions. Sidebar reads this to decide
   *  whether to show a lock icon next to gated nav items. */
  unlockedFeatures: Set<FeatureName>;
}

const AdminLayoutContext = createContext<AdminLayoutContextValue>({
  portraitUrl: "",
  realtorName: "",
  unlockedFeatures: new Set(),
});

export function AdminLayoutProvider({
  portraitUrl,
  realtorName,
  unlockedFeatures,
  children,
}: {
  portraitUrl: string;
  realtorName?: string;
  unlockedFeatures?: FeatureName[];
  children: ReactNode;
}) {
  return (
    <AdminLayoutContext.Provider
      value={{
        portraitUrl,
        realtorName: realtorName ?? "",
        unlockedFeatures: new Set(unlockedFeatures ?? []),
      }}
    >
      {children}
    </AdminLayoutContext.Provider>
  );
}

export function useAdminLayout() {
  return useContext(AdminLayoutContext);
}
