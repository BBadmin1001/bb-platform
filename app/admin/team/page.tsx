import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant/context";
import AdminShell from "@/components/admin/AdminShell";
import TeamManager, {
  type TeamRow,
} from "@/components/admin/team/TeamManager";

export const dynamic = "force-dynamic";

export default async function TeamAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const tenantId = await getCurrentTenantId();
  if (!tenantId) redirect("/admin");

  // Determine the caller's role on this tenant. Super-admins can do
  // anything; otherwise we look up their tenant_users entry.
  const svc = createServiceClient();
  const { data: superRow } = await svc
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const isSuper = !!superRow;
  const { data: me } = await svc
    .from("tenant_users")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();
  const isOwner = isSuper || me?.role === "owner";

  // Pull every team member on THIS tenant.
  const { data: teamRaw } = await svc
    .from("tenant_users")
    .select("user_id, role, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  // We need the email + display name for each member — auth.users
  // isn't accessible via RLS, so use the admin API to join in JS.
  const { data: usersListed } = await svc.auth.admin.listUsers();
  const usersById = new Map(
    (usersListed?.users ?? []).map((u) => [u.id, u]),
  );
  const team = (teamRaw ?? []).map((row) => {
    const u = usersById.get(row.user_id as string);
    return {
      id: row.user_id as string,
      email: u?.email ?? "(unknown)",
      display_name:
        (u?.user_metadata?.full_name as string | undefined) ?? null,
      role: row.role as "owner" | "editor",
      created_at: row.created_at as string,
    };
  });

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-ink/55 hover:text-ink mb-6"
        >
          <ArrowLeft size={14} /> Back to Site Editor
        </Link>
        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3"
          style={{ fontWeight: 500 }}
        >
          Team
        </p>
        <h1
          className="text-2xl md:text-3xl text-ink mb-2"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          Who has access.
        </h1>
        <p className="text-sm text-ink/65 max-w-2xl mb-8">
          {isOwner
            ? "Invite teammates by email — they get a one-click sign-in link, no password needed. Owners can manage the team; editors can edit everything else."
            : "Owners manage the team. Ask an owner to invite a new teammate or change roles."}
        </p>

        <TeamManager
          members={team as TeamRow[]}
          currentUserId={user.id}
          isOwner={!!isOwner}
        />
      </div>
    </AdminShell>
  );
}
