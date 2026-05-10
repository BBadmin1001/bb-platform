import { createClient as createSbClient } from "@supabase/supabase-js";

/**
 * Tenant resolution lives at the heart of the platform.
 *
 *   • A request comes in for some hostname.
 *   • We figure out which `tenant` row (if any) this hostname belongs to.
 *   • The proxy passes the tenant id along as a header so server
 *     components and route handlers can scope every query.
 *
 * Resolution rules (in order):
 *
 *   1. `MASTER_HOSTNAME` env (default `master.localhost`) → master
 *      dashboard, no tenant context.
 *   2. Custom domain matches `tenants.custom_domain`.
 *   3. Subdomain of root domain matches `tenants.slug` (e.g.
 *      "samina.bbwebsite.com" → tenants.slug = 'samina').
 *   4. localhost dev: `?tenant=samina` query, or `samina.localhost`,
 *      or fall back to the env-configured DEV_TENANT_SLUG.
 *   5. Nothing matches → "unknown". The page renders a placeholder.
 *
 * Only `status = 'active'` tenants resolve. Pending/suspended tenants
 * 404 to the public; the master dashboard accesses them by id.
 *
 * IMPORTANT: this module runs in the Edge Runtime via proxy.ts. It
 * uses the *anon* publishable key — RLS on `tenants` permits anon
 * reads of rows with `status='active'`, so we don't need the service
 * role here. That keeps the secret out of the edge bundle entirely.
 */

export interface ResolvedTenant {
  id: string;
  slug: string;
  custom_domain: string | null;
  realtor_name: string;
  brokerage: string | null;
  state_abbr: string | null;
  features: Record<string, unknown>;
  status: string;
}

export type ResolveContext =
  | { kind: "tenant"; tenant: ResolvedTenant }
  | { kind: "master" }
  | { kind: "unknown"; hostname: string };

const MASTER_HOST = (process.env.MASTER_HOSTNAME ?? "master.localhost").toLowerCase();
const DEV_TENANT_SLUG = process.env.DEV_TENANT_SLUG ?? null;

const TENANT_COLUMNS =
  "id, slug, custom_domain, realtor_name, brokerage, state_abbr, features, status";

function normalizeHostname(raw: string): string {
  return raw.toLowerCase().split(":")[0]!.trim();
}

function extractSubdomain(host: string): string | null {
  if (host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return null;
  }
  const parts = host.split(".");
  if (host.endsWith(".localhost") && parts.length >= 2) {
    return parts[0] ?? null;
  }
  return parts.length >= 3 ? (parts[0] ?? null) : null;
}

/**
 * One Supabase client per Edge Runtime instance, lazily created.
 * Anon-keyed; reads are gated by RLS.
 */
let _client: ReturnType<typeof createSbClient> | null = null;
function client() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "tenant resolver: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing in env",
    );
  }
  _client = createSbClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (...args) => fetch(...args) },
  });
  return _client;
}

export async function resolveTenant(
  hostname: string,
  searchParams?: URLSearchParams,
): Promise<ResolveContext> {
  const host = normalizeHostname(hostname);

  // 1. Master dashboard.
  if (host === MASTER_HOST) {
    return { kind: "master" };
  }

  const supabase = client();

  // 2. Custom domain.
  {
    const { data } = await supabase
      .from("tenants")
      .select(TENANT_COLUMNS)
      .eq("custom_domain", host)
      .eq("status", "active")
      .maybeSingle();

    if (data) return { kind: "tenant", tenant: data as ResolvedTenant };
  }

  // 3. Subdomain.
  const sub = extractSubdomain(host);
  if (sub && sub !== "www") {
    const { data } = await supabase
      .from("tenants")
      .select(TENANT_COLUMNS)
      .eq("slug", sub)
      .eq("status", "active")
      .maybeSingle();

    if (data) return { kind: "tenant", tenant: data as ResolvedTenant };
  }

  // 4. Dev fallbacks: ?tenant= query, or DEV_TENANT_SLUG env.
  const devSlug =
    searchParams?.get("tenant") ?? (host === "localhost" ? DEV_TENANT_SLUG : null);
  if (devSlug) {
    const { data } = await supabase
      .from("tenants")
      .select(TENANT_COLUMNS)
      .eq("slug", devSlug)
      .eq("status", "active")
      .maybeSingle();

    if (data) return { kind: "tenant", tenant: data as ResolvedTenant };
  }

  return { kind: "unknown", hostname: host };
}
