/**
 * Super-admin SSO into a tenant's admin.
 *
 * Auth cookies are domain-scoped. When master operators are signed in
 * on `<master>.netlify.app` and click "Open admin" on a tenant that
 * has a custom domain, they land on `<tenant-domain>/admin` without
 * any session — and see the login form. This route fixes that:
 *
 *   1. requireSuperAdmin() — only super admins can use this endpoint.
 *   2. Generate a one-time Supabase magic-link OTP for the super
 *      admin's email via the service-role admin API.
 *   3. 302 to `https://<tenant-domain>/auth/callback?token_hash=...&type=magiclink&next=/admin`.
 *   4. The callback route on the tenant domain calls `verifyOtp`,
 *      which sets the auth cookies on that domain. Operator lands on
 *      /admin already authenticated.
 *
 * The OTP is single-use and expires in ~1 hour (Supabase default for
 * magic links). Because we're signing in as the super admin, the
 * `requireTenantUser()` super-admin bypass grants full access without
 * needing a tenant_users row.
 */
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/master";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const url = new URL(request.url);
  const { slug } = await params;

  const { user } = await requireSuperAdmin();
  if (!user.email) {
    return NextResponse.redirect(new URL("/master/tenants", url));
  }

  const svc = createServiceClient();
  const { data: tenant } = await svc
    .from("tenants")
    .select("slug, custom_domain, status, preview_token")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) {
    return NextResponse.redirect(new URL("/master/tenants", url));
  }

  // Path on the destination host the operator wants to land on.
  // `?dest=/admin/analytics` etc. lets us deep-link into specific
  // admin pages from master.
  const destParam = url.searchParams.get("dest");
  const safeDest =
    destParam && destParam.startsWith("/") && !destParam.startsWith("//")
      ? destParam
      : "/admin";

  // Where the magic-link callback lives. For tenants with a custom
  // domain we route there directly — the session cookie will be set
  // on the tenant's domain, which is what we need. For others we fall
  // back to the platform host with ?tenant= + preview_token so the
  // resolver finds the right tenant context.
  const useCustomDomain =
    tenant.custom_domain && tenant.status === "active";

  let callbackBase: URL;
  let nextPath = safeDest;
  if (useCustomDomain) {
    callbackBase = new URL(
      "/auth/callback",
      `https://${tenant.custom_domain}`,
    );
  } else {
    // Platform host — stitch tenant + preview into the eventual landing
    // URL so the resolver picks up the right tenant after sign-in.
    const dest = new URL(safeDest, url);
    dest.searchParams.set("tenant", tenant.slug);
    if (tenant.preview_token) {
      dest.searchParams.set("preview", tenant.preview_token);
    }
    nextPath = dest.pathname + dest.search;
    callbackBase = new URL("/auth/callback", url);
  }

  // Generate a one-time magic-link OTP signed in as the super admin.
  // We don't care about the `action_link` Supabase returns — we'll
  // hand the `hashed_token` directly to our /auth/callback route,
  // which calls `verifyOtp` server-side. That gives us a clean
  // server-side cookie set without a client-side hash-fragment dance.
  const { data, error } = await svc.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
    options: { redirectTo: callbackBase.toString() },
  });
  if (error || !data?.properties?.hashed_token) {
    // Best-effort fallback: send the operator to the login form on
    // the right domain. At worst they sign in manually.
    return NextResponse.redirect(callbackBase.toString());
  }

  callbackBase.searchParams.set("token_hash", data.properties.hashed_token);
  callbackBase.searchParams.set("type", "magiclink");
  callbackBase.searchParams.set("next", nextPath);

  return NextResponse.redirect(callbackBase);
}
