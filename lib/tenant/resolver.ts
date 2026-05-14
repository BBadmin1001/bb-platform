/**
 * Single-origin shim left over from the multi-tenant architecture.
 *
 * Pre-pivot this file resolved a request's host header to a tenant
 * (custom domain / subdomain / explicit ?tenant=). After the
 * May-2026 pivot the platform is a single-host lead-CRM at
 * smartweb.brandbonjour.com, so all the resolver logic is gone —
 * the only export left is the canonical origin host helper that a
 * handful of callers (sales-rep link generator, etc.) still use to
 * build absolute URLs.
 *
 * `NEXT_PUBLIC_MASTER_HOSTNAME` is set in production env; falls back
 * to `MASTER_HOSTNAME` (server-only) for local dev where the SSR
 * runtime can read it.
 */

const DEFAULT_HOST = "smartweb.brandbonjour.com";

export function getCanonicalMasterHost(): string {
  return (
    process.env.NEXT_PUBLIC_MASTER_HOSTNAME ??
    process.env.MASTER_HOSTNAME ??
    DEFAULT_HOST
  )
    .toLowerCase()
    .split(",")[0]!
    .trim();
}
