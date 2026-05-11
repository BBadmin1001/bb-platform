"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, AlertCircle, Shield } from "lucide-react";
import {
  addSuperAdminByUid,
  removeSuperAdmin,
} from "@/app/master/super-admins/actions";

interface AdminRow {
  user_id: string;
  /** Best-effort populated by the server; can be empty when the
   *  Supabase admin lookup didn't return a user row. */
  email?: string;
  displayName?: string;
  created_at: string;
  notes: string;
  isSelf: boolean;
}

export default function SuperAdminsManager({
  admins,
}: {
  admins: AdminRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [uid, setUid] = useState("");
  const [notes, setNotes] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addSuperAdminByUid(uid.trim(), notes || null);
      if (!res.ok) return setError(res.error);
      setUid("");
      setNotes("");
      setAdding(false);
      router.refresh();
    });
  }

  function handleRemove(userId: string) {
    if (!confirm("Revoke super-admin role from this user?")) return;
    setError(null);
    startTransition(async () => {
      const res = await removeSuperAdmin(userId);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-2 mb-8">
        {admins.map((a) => (
          <div
            key={a.user_id}
            className="admin-card p-4 flex items-center gap-4"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{
                background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                color: "var(--primary)",
              }}
            >
              <Shield size={16} strokeWidth={1.6} />
            </span>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm truncate"
                style={{ color: "var(--card-foreground)", fontWeight: 600 }}
                title={a.user_id}
              >
                {a.displayName ? (
                  <>
                    {a.displayName}
                    {a.email && (
                      <span
                        className="ml-2 text-xs"
                        style={{
                          color: "var(--muted-foreground)",
                          fontWeight: 400,
                        }}
                      >
                        {a.email}
                      </span>
                    )}
                  </>
                ) : a.email ? (
                  a.email
                ) : (
                  <span className="admin-mono">{a.user_id}</span>
                )}
                {a.isSelf && (
                  <span
                    className="ml-2 text-[10px] uppercase tracking-[0.18em]"
                    style={{ color: "var(--primary)", fontWeight: 700 }}
                  >
                    you
                  </span>
                )}
              </p>
              <p
                className="text-[11px]"
                style={{ color: "var(--muted-foreground)" }}
              >
                {a.notes || "No notes"} · added {new Date(a.created_at).toLocaleDateString()}
                {(a.email || a.displayName) && (
                  <span
                    className="ml-2 admin-mono"
                    style={{ opacity: 0.6 }}
                    title="User ID"
                  >
                    {a.user_id.slice(0, 8)}…
                  </span>
                )}
              </p>
            </div>
            {!a.isSelf && (
              <button
                type="button"
                onClick={() => handleRemove(a.user_id)}
                disabled={pending}
                className="admin-btn admin-btn-secondary"
                style={{ color: "var(--destructive)" }}
                aria-label="Revoke"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="admin-btn"
        >
          <Plus size={14} className="mr-2" /> Add super-admin
        </button>
      ) : (
        <form onSubmit={handleAdd} className="admin-card p-6 space-y-4">
          <div>
            <label className="admin-label">Auth user UID</label>
            <input
              required
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="admin-input admin-mono"
            />
            <p
              className="text-[11px] mt-1.5"
              style={{ color: "var(--muted-foreground)" }}
            >
              Get this from the Supabase dashboard → Authentication → Users.
              The user must already exist as an auth.users row.
            </p>
          </div>
          <div>
            <label className="admin-label">Notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Co-founder, has emergency access"
              className="admin-input"
            />
          </div>
          {error && (
            <div
              className="text-xs inline-flex items-center gap-1.5"
              style={{ color: "var(--destructive)" }}
            >
              <AlertCircle size={12} />
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className="admin-btn admin-btn-secondary"
              disabled={pending}
            >
              Cancel
            </button>
            <button type="submit" disabled={pending} className="admin-btn">
              {pending ? "Adding…" : "Grant access"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
