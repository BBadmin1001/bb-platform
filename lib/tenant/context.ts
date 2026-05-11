import "server-only";
import { headers, cookies } from "next/headers";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import type { ResolvedTenant } from "./resolver";

/**
 * Server-side helpers to read the tenant the proxy already resolved.
 *
 * The proxy (`proxy.ts`) sets three request headers on every dispatch:
 *   x-bb-tenant-id     UUID of the active tenant ('' for master / 404)
 *   x-bb-tenant-slug   slug, for log lines and debug
 *   x-bb-context       'tenant' | 'master' | 'unknown'
 *
 * Server components call these helpers instead of re-querying the DB
 * for routing decisions. For the *full* tenant row use
 * `getCurrentTenant()` — it does one DB hit, gated by RLS.
 *
 * Defense-in-depth: on Netlify Edge, the `request: { headers }` write
 * inside the proxy doesn't always propagate to server components on
 * downstream route renders. To keep tenant context working even when
 * the headers are dropped, both `getCurrentTenantId()` and
 * `getCurrentTenantSlug()` ALSO fall back to the `bb-master-tenant`
 * cookie that the proxy sets — same source of truth, just a different
 * transport. This means tenant scoping never silently breaks because
 * of a runtime change to header forwarding.
 */

export const TENANT_ID_HEADER = "x-bb-tenant-id";
export const TENANT_SLUG_HEADER = "x-bb-tenant-slug";
export const CONTEXT_HEADER = "x-bb-context";

const MASTER_TENANT_COOKIE = "bb-master-tenant";

export type RequestContext = "tenant" | "master" | "unknown";

export async function getRequestContext(): Promise<RequestContext> {
  const h = await headers();
  const ctx = h.get(CONTEXT_HEADER);
  if (ctx === "master" || ctx === "tenant" || ctx === "unknown") return ctx;
  // Fall through: if we have a sticky-tenant cookie, we're in tenant
  // context. Otherwise unknown.
  const slugFromCookie = await readTenantCookieSlug();
  return slugFromCookie ? "tenant" : "unknown";
}

/**
 * Lazy cache of slug → id lookups so the cookie-fallback path doesn't
 * hit the DB on every server-component render of the same request.
 * Module-level Map is safe in Next's per-request render isolation —
 * each request gets a fresh module instance in dev, and in production
 * the Map keys are just slugs (no PII) and the value is just a UUID
 * pulled from a publicly-readable column.
 */
const _slugIdCache = new Map<string, string>();

async function readTenantCookieSlug(): Promise<string | null> {
  try {
    const c = await cookies();
    const v = c.get(MASTER_TENANT_COOKIE)?.value;
    if (!v) return null;
    // Same shape check as the resolver — guard against junk values.
    return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/i.test(v) ? v.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Read `?tenant=<slug>` from the request URL. proxy.ts sets the
 * `x-pathname` header on every dispatch; the matching upstream Netlify
 * adapter ALSO forwards the original querystring via the `next-url`
 * header on RSC requests. We snoop both so the first request that
 * carries `?tenant=` resolves the tenant BEFORE the sticky cookie has
 * round-tripped back to the browser.
 */
async function readTenantSlugFromUrl(): Promise<string | null> {
  try {
    const h = await headers();
    // Inspect a handful of headers Next.js / Netlify use to forward
    // the original URL to server components. We try each in order and
    // pull the `tenant` querystring param off whatever URL we find.
    const candidates = [
      h.get("x-pathname"),
      h.get("next-url"),
      h.get("referer"),
    ].filter((s): s is string => Boolean(s));
    for (const candidate of candidates) {
      // `x-pathname` is path only — skip if it has no querystring.
      if (!candidate.includes("?") && !candidate.startsWith("http"))
        continue;
      let qs: URLSearchParams | null = null;
      try {
        if (candidate.startsWith("http")) {
          qs = new URL(candidate).searchParams;
        } else {
          const idx = candidate.indexOf("?");
          if (idx >= 0) qs = new URLSearchParams(candidate.slice(idx + 1));
        }
      } catch {
        continue;
      }
      const v = qs?.get("tenant");
      if (v && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/i.test(v)) {
        return v.toLowerCase();
      }
    }
  } catch {
    // ignore — header access can fail outside a request context
  }
  return null;
}

async function resolveSlugToTenantId(slug: string): Promise<string | null> {
  if (_slugIdCache.has(slug)) return _slugIdCache.get(slug) ?? null;
  // Lazy import to avoid a circular module-init cycle with
  // lib/contentLoader.ts (which itself imports getCurrentTenantId
  // from this file).
  const { getServiceClient } = await import("@/lib/contentLoader");
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  const id = (data?.id as string | undefined) ?? null;
  if (id) _slugIdCache.set(slug, id);
  return id;
}

export async function getCurrentTenantId(): Promise<string | null> {
  const h = await headers();
  const fromHeader = h.get(TENANT_ID_HEADER);
  if (fromHeader) return fromHeader;
  // Fallback chain: explicit ?tenant= on the request URL → sticky
  // cookie → null. Both code paths require a DB lookup to resolve the
  // slug to a tenant id (cached for the request lifetime).
  const slug =
    (await readTenantSlugFromUrl()) || (await readTenantCookieSlug());
  if (!slug) return null;
  return resolveSlugToTenantId(slug);
}

export async function getCurrentTenantSlug(): Promise<string | null> {
  const h = await headers();
  const fromHeader = h.get(TENANT_SLUG_HEADER);
  if (fromHeader) return fromHeader;
  return (await readTenantSlugFromUrl()) || (await readTenantCookieSlug());
}

/**
 * Fetch the full tenant row for the active request. Returns null when
 * the request isn't tenant-scoped (master dashboard, unknown host).
 *
 * Uses the cookie-bound anon client. RLS lets anyone read active
 * tenants, plus signed-in tenant_users see their own draft/pending
 * row, plus super admins see everything.
 */
export async function getCurrentTenant(): Promise<ResolvedTenant | null> {
  const id = await getCurrentTenantId();
  if (!id) return null;

  const supabase = await createCookieClient();
  const { data } = await supabase
    .from("tenants")
    .select(
      "id, slug, custom_domain, realtor_name, brokerage, state_abbr, features, status",
    )
    .eq("id", id)
    .maybeSingle();

  return (data as ResolvedTenant | null) ?? null;
}
