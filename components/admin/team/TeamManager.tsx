"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Crown,
  User as UserIcon,
  Mail,
  X,
  Send,
} from "lucide-react";
import {
  inviteTeamMember,
  setMemberRole,
  removeMember,
} from "@/app/admin/team/actions";

export type TeamRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: "owner" | "editor";
  created_at: string;
};

export default function TeamManager({
  members,
  currentUserId,
  isOwner,
}: {
  members: TeamRow[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [inviting, setInviting] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleRemove(id: string) {
    if (!confirm("Remove this team member? They'll lose admin access immediately.")) return;
    startTransition(async () => {
      const res = await removeMember(id);
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  }

  function handleRole(id: string, role: "owner" | "editor") {
    startTransition(async () => {
      const res = await setMemberRole(id, role);
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2
          className="text-xs tracking-[0.18em] uppercase text-ink/55"
          style={{ fontWeight: 500 }}
        >
          Members ({members.length})
        </h2>
        {isOwner && (
          <button
            type="button"
            onClick={() => setInviting(true)}
            className="admin-btn"
          >
            <Plus size={14} className="mr-2" /> Invite
          </button>
        )}
      </div>

      <div className="space-y-2">
        {members.map((m) => {
          const isMe = m.id === currentUserId;
          return (
            <div
              key={m.id}
              className="admin-card p-4 flex items-center gap-4"
            >
              <div className="w-9 h-9 rounded-full bg-cream-soft flex items-center justify-center shrink-0">
                {m.role === "owner" ? (
                  <Crown size={15} className="text-amber-600" />
                ) : (
                  <UserIcon size={15} className="text-navy" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm" style={{ fontWeight: 500 }}>
                    {m.display_name || m.email}
                  </p>
                  {isMe && (
                    <span className="text-[10px] uppercase tracking-[0.18em] text-ink/45">
                      you
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink/55">{m.email}</p>
              </div>

              {isOwner ? (
                <>
                  <select
                    value={m.role}
                    onChange={(e) =>
                      handleRole(m.id, e.target.value as "owner" | "editor")
                    }
                    disabled={pending}
                    className="text-xs border border-black/10 rounded px-2 py-1.5 bg-white"
                  >
                    <option value="owner">Owner</option>
                    <option value="editor">Editor</option>
                  </select>
                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => handleRemove(m.id)}
                      className="text-ink/55 hover:text-red-600"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </>
              ) : (
                <span className="text-xs text-ink/55 capitalize">{m.role}</span>
              )}
            </div>
          );
        })}
      </div>

      {inviting && (
        <InviteDialog
          onClose={() => setInviting(false)}
          onSent={() => {
            setInviting(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function InviteDialog({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "editor">("editor");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function send() {
    setError(null);
    startTransition(async () => {
      const res = await inviteTeamMember({ email, role });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSent();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-md max-w-md w-full">
        <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between">
          <h3 className="text-sm" style={{ fontWeight: 500 }}>
            Invite a team member
          </h3>
          <button onClick={onClose} className="text-ink/55 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="admin-label">Email</label>
            <input
              type="email"
              autoFocus
              className="admin-input"
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-[11px] text-ink/45 mt-1.5">
              They&rsquo;ll get a magic-link email to sign in. No password
              needed on their end.
            </p>
          </div>
          <div>
            <label className="admin-label">Role</label>
            <select
              className="admin-input"
              value={role}
              onChange={(e) => setRole(e.target.value as "owner" | "editor")}
            >
              <option value="editor">Editor — can edit content + leads</option>
              <option value="owner">Owner — can also manage the team</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-black/10 flex items-center justify-end gap-2">
          <button onClick={onClose} className="admin-btn admin-btn-secondary">
            Cancel
          </button>
          <button
            onClick={send}
            disabled={pending || !email}
            className="admin-btn"
          >
            <Send size={14} className="mr-2" />
            {pending ? "Sending…" : "Send invite"}
          </button>
        </div>
      </div>
    </div>
  );
}
