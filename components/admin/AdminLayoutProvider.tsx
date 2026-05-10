"use client";

/**
 * AdminLayoutProvider — client-side React context that exposes data
 * fetched server-side in `app/admin/layout.tsx` to client components
 * deeper in the tree (AdminSidebar's circular portrait, the realtor
 * name shown in the sidebar header and the mobile top bar).
 *
 * Avoids prop-drilling these through 23+ admin pages.
 */

import { createContext, useContext, type ReactNode } from "react";

interface AdminLayoutContextValue {
  /** Resolved circular avatar URL — Cloudinary if uploaded, else static. */
  portraitUrl: string;
  /** Realtor / business name shown in the sidebar header. Empty for
   *  anon contexts (master dashboard, unknown host). */
  realtorName: string;
}

const AdminLayoutContext = createContext<AdminLayoutContextValue>({
  portraitUrl: "",
  realtorName: "",
});

export function AdminLayoutProvider({
  portraitUrl,
  realtorName,
  children,
}: {
  portraitUrl: string;
  realtorName?: string;
  children: ReactNode;
}) {
  return (
    <AdminLayoutContext.Provider
      value={{ portraitUrl, realtorName: realtorName ?? "" }}
    >
      {children}
    </AdminLayoutContext.Provider>
  );
}

export function useAdminLayout() {
  return useContext(AdminLayoutContext);
}
