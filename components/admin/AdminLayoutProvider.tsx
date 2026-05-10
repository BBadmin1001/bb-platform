"use client";

/**
 * AdminLayoutProvider — client-side React context that exposes data
 * fetched server-side in `app/admin/layout.tsx` to client components
 * deeper in the tree (e.g. AdminSidebar's circular portrait).
 *
 * Avoids prop-drilling `portraitUrl` through 23+ admin pages.
 */

import { createContext, useContext, type ReactNode } from "react";

interface AdminLayoutContextValue {
  /** Resolved circular avatar URL — Cloudinary if uploaded, else static. */
  portraitUrl: string;
}

const AdminLayoutContext = createContext<AdminLayoutContextValue>({
  portraitUrl: "/images/Samina%20Headshot.jpeg",
});

export function AdminLayoutProvider({
  portraitUrl,
  children,
}: {
  portraitUrl: string;
  children: ReactNode;
}) {
  return (
    <AdminLayoutContext.Provider value={{ portraitUrl }}>
      {children}
    </AdminLayoutContext.Provider>
  );
}

export function useAdminLayout() {
  return useContext(AdminLayoutContext);
}
