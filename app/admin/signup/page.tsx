import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import AdminSignupForm from "@/components/admin/AdminSignupForm";

export const metadata = { title: "First-Time Setup | Admin" };

export const dynamic = "force-dynamic";

/**
 * Bootstrap signup gate.
 *
 * Public for one purpose only: creating the very first super-admin
 * (you, the platform owner). Once any super_admins row exists this
 * page redirects to /admin — additional users come in via:
 *   - the Team invite flow inside an existing tenant's admin panel
 *     (owner-gated), or
 *   - the master dashboard provisioning flow when you stand up a
 *     new tenant for a paying customer.
 *
 * This keeps the public signup surface small — no random visitor
 * can self-onboard once the platform is up.
 */
export default async function SignupGate() {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("super_admins")
    .select("user_id", { count: "exact", head: true });

  if ((count ?? 0) > 0) {
    redirect("/admin");
  }

  return <AdminSignupForm />;
}
