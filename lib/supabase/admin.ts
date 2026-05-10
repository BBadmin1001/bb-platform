import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client. Bypasses RLS — use ONLY in:
 *   • Stripe webhook handlers (no auth context)
 *   • Master-dashboard mutations the super admin's session can't reach
 *   • The Samina migration / seed scripts
 *
 * The `server-only` import makes Next.js throw at build time if this
 * module ever gets pulled into a client bundle. The service-role key
 * is read from `SUPABASE_SERVICE_ROLE_KEY` — never `NEXT_PUBLIC_*`.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "createAdminClient: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
