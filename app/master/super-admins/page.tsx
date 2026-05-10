import { requireSuperAdmin } from "@/lib/master";
import SuperAdminsManager from "@/components/master/SuperAdminsManager";

export const dynamic = "force-dynamic";

export default async function SuperAdminsPage() {
  const { supabase, user } = await requireSuperAdmin();

  const { data: admins } = await supabase
    .from("super_admins")
    .select("user_id, created_at, notes, granted_by")
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-3xl mx-auto py-8">
      <p
        className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
        style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
      >
        Master · Super admins
      </p>
      <h1
        className="text-2xl md:text-3xl mb-2"
        style={{ color: "var(--foreground)", fontWeight: 600 }}
      >
        Platform-level operators.
      </h1>
      <p
        className="text-sm max-w-2xl mb-10"
        style={{ color: "var(--muted-foreground)" }}
      >
        Anyone in this list can reach <code className="admin-mono">/master/*</code>{" "}
        and edit any tenant's data. Keep this list small.
      </p>

      <SuperAdminsManager
        admins={(admins ?? []).map((a) => ({
          user_id: a.user_id,
          created_at: a.created_at,
          notes: a.notes ?? "",
          isSelf: a.user_id === user.id,
        }))}
      />
    </div>
  );
}
