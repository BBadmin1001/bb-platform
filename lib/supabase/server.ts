import { cookies } from "next/headers";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";

/**
 * Per-request Supabase client for use in server components, route
 * handlers, and server actions.
 *
 * Uses the publishable (anon) key + the user's auth cookie, so RLS
 * applies as the signed-in user. Never share this client across
 * requests — token refreshes need to write back to *this* request's
 * Set-Cookie headers.
 *
 * For privileged server-side work that must bypass RLS (Stripe
 * webhooks, master-dashboard mutations, the migration script) use
 * `createAdminClient` from `./admin` instead.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      // In server components Next refuses cookie writes (the request
      // is already in flight). The proxy.ts middleware is responsible
      // for refreshing tokens, so it's safe to swallow that case.
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      } catch {
        /* noop — handled by proxy.ts */
      }
    },
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods },
  );
}
