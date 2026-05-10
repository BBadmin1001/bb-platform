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

export async function proxy(request: NextRequest) {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;

  const ctx = await resolveTenant(host, url.searchParams);

  // ── Auth refresh + /admin gate ─────────────────────────────────────
  // Build a mutable response so Supabase can write refreshed auth
  // cookies on it. We'll merge our own tenant headers in at the end.
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

  const path = url.pathname;
  const isAdminPath = path.startsWith("/admin");
  const isAdminPublic = ADMIN_PUBLIC_PATHS.has(path);

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
