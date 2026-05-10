import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-only helpers for the master dashboard.
 *
 * Every /master/* page wraps its data fetching in `requireSuperAdmin()`.
 * Failure cases:
 *   • not signed in       → bounce to /admin (the login form)
 *   • signed in but not a super_admin → bounce to /admin (their tenant
 *     admin or the not-allowed home, since they don't see master)
 *
 * On success we return the supabase client (cookie-bound, so RLS still
 * applies, but `is_super_admin()` opens up the rows we need) plus the
 * authenticated user record.
 */
export async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin");
  }

  const { data: row } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) {
    redirect("/admin");
  }

  return { supabase, user };
}
