"use client";

/**
 * Fires a single beacon to /api/pv on every public page render. Hooked
 * into the root layout so we don't have to wire it per-page. Skips
 * admin / master / sales paths since those aren't tenant traffic.
 *
 * Uses navigator.sendBeacon when available so the request survives
 * page navigation (the standard PV tracking pattern). Falls back to
 * fetch with keepalive otherwise.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SKIP_PREFIXES = [
  "/admin",
  "/master",
  "/sales",
  "/api",
  "/get-started",
  "/onboarding",
  "/_next",
];

export default function TrackPageview() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return;

    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
    });
    const url = "/api/pv";

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      } else {
        void fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      }
    } catch {
      // analytics must never throw on the visitor's path
    }
  }, [pathname]);

  return null;
}
