/**
 * Supabase auth callback — verifies a magic-link OTP and sets the
 * session cookies on the **current** hostname.
 *
 * Used by the master "Open admin" SSO flow:
 *   1. Master generates a magic-link hashed_token as the super admin
 *      via the service-role admin API.
 *   2. Master redirects the operator to
 *        https://<tenant-domain>/auth/callback?token_hash=<...>&type=magiclink&next=/admin
 *   3. This route calls `verifyOtp({ token_hash, type })`, which sets
 *      the auth cookies on the tenant's domain via the cookie-bound
 *      Supabase server client.
 *   4. We 302 to `next` (defaulting to `/admin`).
 *
 * Worst-case fallback: anything goes wrong → bounce to `/admin`, which
 * shows the login form. Operator can still sign in manually.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  "magiclink",
  "signup",
  "invite",
  "recovery",
  "email",
  "email_change",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const typeParam = url.searchParams.get("type") as EmailOtpType | null;
  const type =
    typeParam && ALLOWED_OTP_TYPES.has(typeParam) ? typeParam : "magiclink";
  // Same-origin path only — prevents open-redirect abuse if someone
  // crafted a malicious callback URL.
  const nextParam = url.searchParams.get("next");
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/admin";

  // On Netlify's SSR runtime, `request.url` reflects the internal
  // deploy-preview origin (e.g. `<hash>--<site>.netlify.app`) rather
  // than the user-facing host. If we build redirect URLs against
  // `request.url`, the user gets bounced to that internal URL instead
  // of staying on the tenant's custom domain — and the session cookie
  // we just set on the right host doesn't apply. Use the forwarded
  // host header so the redirect stays on the host the user actually
  // typed.
  const userHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const userProto =
    request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const baseOrigin = userHost
    ? `${userProto}://${userHost}`
    : url.origin;
  const redirectTo = (path: string) =>
    NextResponse.redirect(new URL(path, baseOrigin));

  if (!tokenHash) {
    return redirectTo("/admin");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });
  if (error) {
    return redirectTo(`/admin?from=${encodeURIComponent(safeNext)}`);
  }

  return redirectTo(safeNext);
}
