"use client";

/**
 * Top bar on /sales — shows the rep's name + a sign-out button, and
 * for super admins a dropdown to view as any rep.
 */

import { useRouter } from "next/navigation";
import { LogOut, UserRound, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RepHeader({
  rep,
  isSuperAdmin,
  allReps,
}: {
  rep: { slug: string; full_name: string };
  isSuperAdmin: boolean;
  allReps: { id: string; slug: string; full_name: string; is_active: boolean }[];
}) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  function switchTo(slug: string) {
    router.push(`/sales?rep=${slug}`);
  }

  return (
    <header
      className="border-b"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{
              background: "color-mix(in srgb, var(--primary) 14%, transparent)",
              color: "var(--primary)",
            }}
          >
            <UserRound size={16} strokeWidth={1.6} />
          </span>
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.22em]"
              style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
            >
              Sales · BB Platform
            </p>
            <p
              className="text-base"
              style={{ color: "var(--card-foreground)", fontWeight: 600 }}
            >
              {rep.full_name}
            </p>
          </div>
          {isSuperAdmin && (
            <span
              className="ml-2 text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full inline-flex items-center gap-1"
              style={{
                color: "var(--primary)",
                background:
                  "color-mix(in srgb, var(--primary) 12%, transparent)",
                fontWeight: 700,
              }}
            >
              <Shield size={10} /> Viewing as
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isSuperAdmin && allReps.length > 0 && (
            <select
              value={rep.slug}
              onChange={(e) => switchTo(e.target.value)}
              className="admin-input text-xs"
              style={{ padding: "0.5rem 0.75rem" }}
            >
              {allReps.map((r) => (
                <option key={r.id} value={r.slug}>
                  {r.full_name}
                  {r.is_active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={signOut}
            className="admin-btn admin-btn-secondary inline-flex items-center"
          >
            <LogOut size={13} className="mr-2" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
