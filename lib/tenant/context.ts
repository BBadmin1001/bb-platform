import "server-only";
import { headers } from "next/headers";
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
 */

export const TENANT_ID_HEADER = "x-bb-tenant-id";
export const TENANT_SLUG_HEADER = "x-bb-tenant-slug";
export const CONTEXT_HEADER = "x-bb-context";

export type RequestContext = "tenant" | "master" | "unknown";

export async function getRequestContext(): Promise<RequestContext> {
  const h = await headers();
  const ctx = h.get(CONTEXT_HEADER);
  if (ctx === "master" || ctx === "tenant" || ctx === "unknown") return ctx;
  return "unknown";
}

export async function getCurrentTenantId(): Promise<string | null> {
  const h = await headers();
  return h.get(TENANT_ID_HEADER) || null;
}

export async function getCurrentTenantSlug(): Promise<string | null> {
  const h = await headers();
  return h.get(TENANT_SLUG_HEADER) || null;
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
