import { requireSuperAdmin } from "@/lib/master";
import { createServiceClient } from "@/lib/supabase/server";
import SuperAdminsManager from "@/components/master/SuperAdminsManager";

export const dynamic = "force-dynamic";

export default async function SuperAdminsPage() {
  const { supabase, user } = await requireSuperAdmin();

  const { data: admins } = await supabase
    .from("super_admins")
    .select("user_id, created_at, notes, granted_by")
    .order("created_at", { ascending: true });

  // A3-011: enrich super_admins rows with email + display name so the
  // UI shows "admin@brandbonjour.com" instead of a raw UUID. Uses the
  // service-role admin API to read auth.users (only super-admins
  // reach this page, so no escalation risk).
  const adminApi = createServiceClient().auth.admin;
  const enriched = await Promise.all(
    (admins ?? []).map(async (a) => {
      let email = "";
      let displayName = "";
      try {
        const { data } = await adminApi.getUserById(a.user_id as string);
        const u = data?.user;
        if (u) {
          email = u.email || "";
          const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
          displayName =
            (typeof meta.display_name === "string" && meta.display_name) ||
            (typeof meta.full_name === "string" && meta.full_name) ||
            (typeof meta.name === "string" && meta.name) ||
            "";
        }
      } catch {
        // best-effort enrichment; fall through with empty strings
      }
      return {
        user_id: a.user_id as string,
        email,
        displayName,
        created_at: a.created_at,
        notes: (a.notes as string) ?? "",
        isSelf: a.user_id === user.id,
      };
    }),
  );

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
        and edit any tenant&apos;s data. Keep this list small.
      </p>

      <SuperAdminsManager admins={enriched} />
    </div>
  );
}
