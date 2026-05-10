import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import TeamManager, {
  type TeamRow,
} from "@/components/admin/team/TeamManager";

export default async function TeamAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Pull caller's role + the full team
  const [{ data: me }, { data: team }] = await Promise.all([
    supabase
      .from("team_members")
      .select("role")
      .eq("id", user.id)
      .single(),
    supabase
      .from("team_members")
      .select("id, email, display_name, role, created_at")
      .order("created_at", { ascending: true }),
  ]);

  const isOwner = me?.role === "owner";

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
          members={(team ?? []) as TeamRow[]}
          currentUserId={user.id}
          isOwner={!!isOwner}
        />
      </div>
    </AdminShell>
  );
}
