import { NextResponse, type NextRequest } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolver";
import {
  CONTEXT_HEADER,
  TENANT_ID_HEADER,
  TENANT_SLUG_HEADER,
} from "@/lib/tenant/context";

/**
 * Edge proxy that resolves the tenant on every request and stamps
 * three headers the rest of the app reads via next/headers:
 *
 *   x-bb-context       'tenant' | 'master' | 'unknown'
 *   x-bb-tenant-id     UUID, or '' for master/unknown
 *   x-bb-tenant-slug   slug, or '' for master/unknown
 *
 * Routing rules:
 *   - master.<root>            → /(master)/* (rewrite)
 *   - tenant host (matched)    → /(tenant)/* (rewrite, tenant headers set)
 *   - unknown host             → /(public)/_unknown (placeholder 404)
 *
 * Skips static assets and Next internals via the matcher below so we
 * don't pay a DB lookup for every favicon and JS chunk.
 */
export async function proxy(request: NextRequest) {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;

  const ctx = await resolveTenant(host, url.searchParams);

  // We always pass the proxy decision down via mutated request headers
  // (cheaper than rewrites for every static asset).
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

  return NextResponse.next({ request: { headers: requestHeaders } });
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
