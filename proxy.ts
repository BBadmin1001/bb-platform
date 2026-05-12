import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolveTenant } from "@/lib/tenant/resolver";
import {
  CONTEXT_HEADER,
  TENANT_ID_HEADER,
  TENANT_SLUG_HEADER,
} from "@/lib/tenant/context";

/**
 * Edge proxy. Two responsibilities per request:
 *
 *   1. Tenant resolution. Look at the hostname, decide which tenant
 *      this request belongs to (or master, or unknown), and stamp
 *      three headers so the rest of the app reads them via
 *      next/headers:
 *
 *        x-bb-context       'tenant' | 'master' | 'unknown'
 *        x-bb-tenant-id     UUID, or '' for master/unknown
 *        x-bb-tenant-slug   slug, or '' for master/unknown
 *
 *   2. Auth refresh + /admin gating. Calls supabase.auth.getUser() to
 *      keep the session cookies fresh on every request, and bounces
 *      anonymous visitors hitting deeper /admin/* paths back to
 *      /admin/login.
 *
 * The matcher below skips static assets and Next.js internals so we
 * don't pay a DB lookup for every favicon and JS chunk.
 */

const ADMIN_PUBLIC_PATHS = new Set([
  "/admin",
  "/admin/login",
  "/admin/signup",
  "/admin/forgot-password",
  "/admin/reset-password",
]);

/** Cookie that remembers which tenant a master operator is currently
 *  "viewing as." Set when ?tenant=<slug> hits a URL, read on later
 *  requests so internal admin navigation (which strips the query)
 *  stays in that tenant's context. Safe to set unconditionally: the
 *  cookie only SCOPES the admin UI; every actual write still goes
 *  through requireTenantUser which validates membership or
 *  super_admin status before mutating data. */
const MASTER_TENANT_COOKIE = "bb-master-tenant";

export async function proxy(request: NextRequest) {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;

  const explicitTenant = url.searchParams.get("tenant");
  const cookieTenant = request.cookies.get(MASTER_TENANT_COOKIE)?.value;

  // ── Auth refresh ──────────────────────────────────────────────────
  // Run BEFORE tenant resolution so we know whether the user is a
  // super admin and can decide whether to honor the sticky cookie.
  // Non-super-admin users with a stale cookie must NOT inherit the
  // master-view tenant context (A4-006 — privilege escalation).
  let response = NextResponse.next({ request });
  let user = null as null | { id: string };

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { data } = await supabase.auth.getUser();
    user = data.user ? { id: data.user.id } : null;
  }

  // Is this user a super admin? Needed to decide whether the sticky
  // cookie applies. One DB read per request — acceptable for the
  // security guarantee.
  let isSuperAdmin = false;
  if (user && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const svc = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { cookies: { getAll: () => [], setAll: () => {} } },
      );
      const { data } = await svc
        .from("super_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      isSuperAdmin = !!data;
    } catch {
      // If the super-admin check itself fails, default to false —
      // safer to lose master context than to leak it.
      isSuperAdmin = false;
    }
  }

  // Build an "effective" searchParams that falls back to the sticky
  // cookie ONLY when the requesting user is a verified super admin.
  // For everyone else (signed-out users, tenant members, sales reps,
  // random visitors), the cookie is ignored. Explicit ?tenant= still
  // works for everyone since that resolves to public/active tenants
  // only.
  const effectiveSearchParams = new URLSearchParams(url.searchParams);
  if (!explicitTenant && cookieTenant && isSuperAdmin) {
    effectiveSearchParams.set("tenant", cookieTenant);
  }

  const ctx = await resolveTenant(host, effectiveSearchParams);

  // Stamp tenant headers on the resolved request (re-build because the
  // cookie writes above may have replaced `response`).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CONTEXT_HEADER, ctx.kind);
  requestHeaders.set(
    TENANT_ID_HEADER,
    ctx.kind === "tenant" ? ctx.tenant.id : "",
  );
  requestHeaders.set(
    TENANT_SLUG_HEADER,
    ctx.kind === "tenant" ? ctx.tenant.slug : "",
  );
  // Stamp the request pathname so the root layout can decide whether
  // to render the public Header/Footer (skipped for /admin and /master).
  requestHeaders.set("x-pathname", url.pathname);

  const path = url.pathname;
  const isAdminPath = path.startsWith("/admin");
  const isAdminPublic = ADMIN_PUBLIC_PATHS.has(path);

  // Master hostname: the public realtor template doesn't apply here.
  // Anything that isn't an allowed master-hostname path goes straight
  // to /master, which itself gates on super_admin and bounces
  // unauthenticated visitors to the login form. Net effect: the
  // master hostname's "front page" is the master dashboard (or login),
  // BUT customer-facing onboarding URLs (/get-started, /onboarding/done)
  // still work — those are how sales reps send prospects in.
  //
  // EXCEPTION: when the URL carries a valid `?preview=<token>` query,
  // the resolver above already returned `kind: "tenant"` (regardless
  // of host), so we never reach this branch in that case. No special-
  // casing needed here — preview links just route through normally.
  const ALLOWED_ON_MASTER_HOST = [
    "/master",
    "/admin",
    "/api",
    "/get-started",
    "/onboarding",
    "/sales",
  ];
  // A3-014: when the URL carries `?tenant=<slug>` AND the visitor is
  // a signed-in super-admin, allow them through to the public site
  // even though the resolver returned `kind:master` (e.g. because
  // the tenant is `status='pending'` and didn't match the active-only
  // ?tenant= path in the resolver). This is what lets the "Visit
  // site" button on /master/tenants/<slug> actually work for a
  // pending tenant. The downstream public template will pick up the
  // tenant_id from the explicit query through getCurrentTenantId().
  const tenantQuery = url.searchParams.get("tenant");
  const isSuperAdminOnTenantQuery =
    !!user && !!tenantQuery && tenantQuery.length > 0;
  if (
    ctx.kind === "master" &&
    !ALLOWED_ON_MASTER_HOST.some((p) => path === p || path.startsWith(p + "/")) &&
    !isSuperAdminOnTenantQuery
  ) {
    const redirectUrl = new URL(url.toString());
    redirectUrl.pathname = "/master";
    return NextResponse.redirect(redirectUrl);
  }

  // Block deeper /admin/* without auth — bounce to /admin (which
  // renders the login form when there's no session).
  if (isAdminPath && !isAdminPublic && !user) {
    const redirectUrl = new URL(url.toString());
    redirectUrl.pathname = "/admin";
    redirectUrl.searchParams.set("from", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Send signed-in users away from login/signup/forgot back into /admin.
  if (
    user &&
    (path === "/admin/login" ||
      path === "/admin/signup" ||
      path === "/admin/forgot-password")
  ) {
    const redirectUrl = new URL(url.toString());
    redirectUrl.pathname = "/admin";
    redirectUrl.searchParams.delete("from");
    return NextResponse.redirect(redirectUrl);
  }

  // Re-issue with our tenant headers + any cookie writes Supabase did.
  const finalResponse = NextResponse.next({ request: { headers: requestHeaders } });
  // Copy any Set-Cookie writes the supabase client put on `response`.
  response.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie);
  });

  // Persist the master "viewing as" tenant choice in a cookie so that
  // internal admin links (which don't carry ?tenant=) keep the
  // tenant in context. ONLY set for super admins — A4-006 fix. For
  // everyone else, clear any stale cookie so a previous master
  // session can't bleed into the current user's context.
  if (
    isSuperAdmin &&
    explicitTenant &&
    ctx.kind === "tenant" &&
    ctx.tenant.slug === explicitTenant.toLowerCase()
  ) {
    finalResponse.cookies.set(MASTER_TENANT_COOKIE, ctx.tenant.slug, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours — refreshed every time master clicks "Open admin"
    });
  } else if (
    isSuperAdmin &&
    url.searchParams.has("tenant") &&
    !explicitTenant
  ) {
    // Super admin hit ?tenant= with empty value → explicit clear.
    finalResponse.cookies.delete(MASTER_TENANT_COOKIE);
  } else if (!isSuperAdmin && cookieTenant) {
    // Non-super-admin holding a stale cookie → wipe it. Belt + suspenders
    // since we already ignore it during this request.
    finalResponse.cookies.delete(MASTER_TENANT_COOKIE);
  }

  return finalResponse;
}

export const config = {
  matcher: [
    /*
     * Skip:
     *   - /api  (route handlers carry their own auth/tenant logic)
     *   - /_next/static, /_next/image
     *   - common static asset extensions in /public
     *   - Next.js internals (/__nextjs*)
     */
    "/((?!api|_next/static|_next/image|__nextjs|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff2?|ttf)$).*)",
  ],
};
