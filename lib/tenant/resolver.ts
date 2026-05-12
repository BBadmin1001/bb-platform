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

// Read NEXT_PUBLIC_MASTER_HOSTNAME first so the value gets inlined into
// the Netlify Edge bundle at build time. Edge functions on Netlify
// don't reliably surface non-public env vars at runtime, and this
// resolver runs in the Edge proxy. Falls back to MASTER_HOSTNAME
// (server-only) for local dev where the SSR runtime can read it.
//
// Comma-separated values are supported so the master dashboard can be
// reached on multiple hostnames (e.g. a branded URL like
// `smartweb.brandbonjour.com` for ops + the platform's Netlify
// default like `bb-platform-387.netlify.app` for backup / direct
// access). Whitespace around commas is tolerated.
export const MASTER_HOSTS: ReadonlySet<string> = new Set(
  (
    process.env.NEXT_PUBLIC_MASTER_HOSTNAME ??
    process.env.MASTER_HOSTNAME ??
    "master.localhost"
  )
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
);
/**
 * Backwards-compat: callers that want a single "canonical" master
 * hostname (e.g. log lines, redirect URLs) can pick the first one in
 * the configured list. New code should prefer `MASTER_HOSTS.has(host)`.
 */
const MASTER_HOST = [...MASTER_HOSTS][0] ?? "master.localhost";

/**
 * The "canonical" master hostname for use in user-facing URLs (emails,
 * shareable preview links, redirect targets). Picks the first entry
 * of `MASTER_HOSTNAME` so callers always get a single hostname even
 * when the env var is configured with multiple comma-separated values
 * for host-check purposes.
 *
 * Use this instead of reading `process.env.MASTER_HOSTNAME` directly
 * whenever you're going to interpolate the value into a URL.
 */
export function getCanonicalMasterHost(): string {
  return MASTER_HOST;
}
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

/**
 * Service-role client for preview-token lookups ONLY. Bypasses RLS so
 * the resolver can return tenants with `status='pending'` (i.e. sites
 * that are still in the master polishing queue). Safe because the
 * unguessable preview_token is itself the proof of authorization —
 * equivalent in strength to a signed URL.
 *
 * Falls back to the anon client when SUPABASE_SERVICE_ROLE_KEY isn't
 * configured (local dev / preview builds). In that case pending
 * tenants won't resolve, which is acceptable for dev.
 */
let _serviceClient: ReturnType<typeof createSbClient> | null = null;
function previewClient() {
  if (_serviceClient) return _serviceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return client();
  _serviceClient = createSbClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (...args) => fetch(...args) },
  });
  return _serviceClient;
}

export async function resolveTenant(
  hostname: string,
  searchParams?: URLSearchParams,
): Promise<ResolveContext> {
  const host = normalizeHostname(hostname);
  const supabase = client();

  // 0. Preview-token override — runs BEFORE master/host checks so the
  // polish team can share a preview URL on ANY hostname (including
  // master.brandbonjour.com) and visitors see the in-progress tenant
  // site without needing the tenant to be `active`.
  //
  // Uses a service-role client because RLS on `tenants` blocks anon
  // reads of pending/suspended rows, but pending rows ARE the primary
  // use case for preview-token URLs (master shares a preview while
  // the tenant is still in polishing). The unguessable token is the
  // authorization proof — equivalent to a signed URL.
  const previewToken = searchParams?.get("preview");
  if (previewToken && /^[0-9a-f-]{36}$/i.test(previewToken)) {
    const previewSupabase = previewClient();
    const { data } = await previewSupabase
      .from("tenants")
      .select(TENANT_COLUMNS)
      .eq("preview_token", previewToken)
      .maybeSingle();
    if (data) return { kind: "tenant", tenant: data as ResolvedTenant };
  }

  // 0b. `?tenant=<slug>` query override — also runs BEFORE master/host
  // checks so master operators can view + edit any tenant's site from
  // the master URL. Only resolves to active tenants (slug isn't a
  // secret, so this is safe to expose publicly). Non-active tenants
  // still need the preview_token path above.
  const tenantSlugQuery = searchParams?.get("tenant");
  if (tenantSlugQuery && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/i.test(tenantSlugQuery)) {
    const { data } = await supabase
      .from("tenants")
      .select(TENANT_COLUMNS)
      .eq("slug", tenantSlugQuery.toLowerCase())
      .eq("status", "active")
      .maybeSingle();
    if (data) return { kind: "tenant", tenant: data as ResolvedTenant };
  }

  // 1. Master dashboard. Multiple hosts can be configured — any of
  // them resolves to master so the platform owner can bookmark
  // whichever URL they prefer (branded vs Netlify default).
  if (MASTER_HOSTS.has(host)) {
    return { kind: "master" };
  }

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

  // 4. Local-dev DEV_TENANT_SLUG fallback (only on `localhost`).
  // The `?tenant=` query path is already handled above as a first-
  // class override.
  if (host === "localhost" && DEV_TENANT_SLUG) {
    const { data } = await supabase
      .from("tenants")
      .select(TENANT_COLUMNS)
      .eq("slug", DEV_TENANT_SLUG)
      .eq("status", "active")
      .maybeSingle();
    if (data) return { kind: "tenant", tenant: data as ResolvedTenant };
  }

  return { kind: "unknown", hostname: host };
}
