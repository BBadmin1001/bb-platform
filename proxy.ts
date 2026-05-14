import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Edge proxy — slim post-pivot version.
 *
 * After the May-2026 lead-CRM pivot the platform runs on a single
 * host (smartweb.brandbonjour.com) and has no public tenant sites,
 * so all the multi-tenant resolution that used to live here is gone.
 * The proxy now does exactly two things:
 *
 *   1. Refresh the Supabase auth session on every request so cookies
 *      don't go stale during long-lived sessions.
 *   2. Gate deeper `/admin/*` paths — anonymous visitors hitting
 *      anything past the public sign-in / sign-up / forgot-password
 *      / reset-password screens are bounced back to `/admin` with a
 *      `?from=` query so they can come back after auth.
 *
 * The matcher (config below) skips static assets, Next internals,
 * and `/api/*` so the proxy doesn't run for favicons, JS chunks, or
 * the Stripe webhook.
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

  // ── Auth refresh ──────────────────────────────────────────────────
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

  // ── /admin gating ─────────────────────────────────────────────────
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

  // Send signed-in users away from the login form pages.
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

  return response;
}

export const config = {
  matcher: [
    /*
     * Skip:
     *   - /api               (route handlers carry their own auth)
     *   - /_next/static, /_next/image
     *   - common static asset extensions in /public
     *   - Next.js internals (/__nextjs*)
     */
    "/((?!api|_next/static|_next/image|__nextjs|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff2?|ttf)$).*)",
  ],
};
