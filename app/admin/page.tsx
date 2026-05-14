import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

/**
 * /admin is the platform sign-in page after the May-2026 pivot.
 *
 * Routing after a successful auth check:
 *   - super admins → /master
 *   - sales reps → /sales
 *   - anyone else → kept on /admin (no tenant admin exists anymore)
 *
 * Unauthenticated visitors get the login form inline so we don't have
 * to round-trip through /admin/login. `?from=<path>` is honored so a
 * deep link bounce returns the operator to the page they wanted after
 * sign in (mostly for /sales reps coming from internal nav).
 */
export default async function AdminEntryPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const from = (await searchParams)?.from;
    return <AdminLoginForm from={from} />;
  }

  // Already signed in? Send them to the right dashboard.
  const [{ data: superRow }, { data: repRow }] = await Promise.all([
    supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("sales_reps")
      .select("id")
      .or(`user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
      .maybeSingle(),
  ]);

  if (superRow) redirect("/master");
  if (repRow) redirect("/sales");
  // Fallback — signed in but neither super admin nor rep. Stay here
  // and show the login form (lets them sign out via header).
  return <AdminLoginForm from={undefined} />;
}
