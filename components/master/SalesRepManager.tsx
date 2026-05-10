"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Copy,
  Check,
  X,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  upsertSalesRep,
  deleteSalesRep,
} from "@/app/master/sales-reps/actions";

type Rep = {
  id: string;
  slug: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  notes: string | null;
};

type Stats = { total: number; paid: number; revenueCents: number };

export default function SalesRepManager({
  initialReps,
  statsBySlug,
  masterHost,
}: {
  initialReps: Rep[];
  statsBySlug: Record<string, Stats>;
  masterHost: string;
}) {
  const [reps, setReps] = useState<Rep[]>(initialReps);
  const [editing, setEditing] = useState<Partial<Rep> | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function newRep() {
    setEditing({
      slug: "",
      full_name: "",
      email: "",
      is_active: true,
      notes: "",
    });
    setError(null);
  }

  function edit(r: Rep) {
    setEditing(r);
    setError(null);
  }

  function cancel() {
    setEditing(null);
    setError(null);
  }

  function save() {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const res = await upsertSalesRep({
        id: editing.id,
        slug: (editing.slug ?? "").trim().toLowerCase(),
        full_name: (editing.full_name ?? "").trim(),
        email: (editing.email ?? "")?.trim() || null,
        is_active: editing.is_active ?? true,
        notes: (editing.notes ?? "")?.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Refresh local state by reload — reps stats need a server refetch anyway.
      window.location.reload();
    });
  }

  function remove(r: Rep) {
    if (!confirm(`Delete sales rep "${r.full_name}"? Their existing prospect records keep the rep slug for attribution.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteSalesRep(r.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setReps(reps.filter((x) => x.id !== r.id));
    });
  }

  async function copyLink(slug: string) {
    const url = trackedLink(masterHost, slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(slug);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Couldn't copy — select the URL manually below.");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p
          className="text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          {reps.length} {reps.length === 1 ? "rep" : "reps"}
        </p>
        <button
          type="button"
          onClick={newRep}
          className="admin-btn inline-flex items-center"
        >
          <Plus size={13} className="mr-2" /> Add rep
        </button>
      </div>

      {editing && (
        <div className="admin-card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p
              className="text-xs uppercase tracking-[0.18em]"
              style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
            >
              {editing.id ? "Edit rep" : "New rep"}
            </p>
            <button
              type="button"
              onClick={cancel}
              className="text-[11px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Full name</label>
              <input
                type="text"
                className="admin-input"
                value={editing.full_name ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, full_name: e.target.value })
                }
                placeholder="Jenny Smith"
              />
            </div>
            <div>
              <label className="admin-label">Slug (?ref=…)</label>
              <input
                type="text"
                className="admin-input admin-mono"
                value={editing.slug ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, slug: e.target.value.toLowerCase() })
                }
                placeholder="jenny"
              />
            </div>
            <div>
              <label className="admin-label">Email (optional)</label>
              <input
                type="email"
                className="admin-input"
                value={editing.email ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, email: e.target.value })
                }
                placeholder="jenny@brandbonjour.com"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.is_active ?? true}
                  onChange={(e) =>
                    setEditing({ ...editing, is_active: e.target.checked })
                  }
                />
                Active
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="admin-label">Notes (optional)</label>
              <textarea
                className="admin-input"
                rows={2}
                value={editing.notes ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
                }
                placeholder="Internal notes — territory, commission rate, etc."
              />
            </div>
          </div>
          {error && (
            <p
              className="mt-3 text-xs"
              style={{ color: "var(--destructive)" }}
            >
              {error}
            </p>
          )}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="admin-btn"
              style={pending ? { opacity: 0.6 } : undefined}
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {reps.length === 0 ? (
        <div className="admin-card p-10 text-center">
          <p
            className="text-sm mb-3"
            style={{ color: "var(--muted-foreground)" }}
          >
            No sales reps yet.
          </p>
          {!editing && (
            <button
              type="button"
              onClick={newRep}
              className="admin-btn"
            >
              <Plus size={13} className="mr-2" /> Add your first rep
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {reps.map((r) => {
            const s = statsBySlug[r.slug] ?? {
              total: 0,
              paid: 0,
              revenueCents: 0,
            };
            const link = trackedLink(masterHost, r.slug);
            return (
              <div
                key={r.id}
                className="admin-card p-5 flex flex-wrap items-start justify-between gap-4"
                style={{ opacity: r.is_active ? 1 : 0.6 }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3
                      className="text-base"
                      style={{
                        color: "var(--card-foreground)",
                        fontWeight: 600,
                      }}
                    >
                      {r.full_name}
                    </h3>
                    {!r.is_active && (
                      <span
                        className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded"
                        style={{
                          color: "var(--muted-foreground)",
                          background: "rgba(0,0,0,0.05)",
                        }}
                      >
                        Archived
                      </span>
                    )}
                    <code
                      className="text-[11px] px-1.5 py-0.5 rounded"
                      style={{
                        background:
                          "color-mix(in srgb, var(--primary) 8%, transparent)",
                        color: "var(--primary)",
                      }}
                    >
                      ?ref={r.slug}
                    </code>
                  </div>
                  {r.email && (
                    <p
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {r.email}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-3 mt-3 max-w-md">
                    <Stat label="Prospects" value={s.total} />
                    <Stat label="Paid" value={s.paid} />
                    <Stat
                      label="Revenue"
                      value={`$${(s.revenueCents / 100).toFixed(0)}`}
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <input
                      type="text"
                      readOnly
                      value={link}
                      onFocus={(e) => e.target.select()}
                      className="admin-input admin-mono text-[11px]"
                      style={{ flex: 1, minWidth: "16rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => copyLink(r.slug)}
                      className="admin-btn admin-btn-secondary inline-flex items-center"
                    >
                      {copied === r.slug ? (
                        <>
                          <Check size={12} className="mr-1.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={12} className="mr-1.5" /> Copy link
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => edit(r)}
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(r)}
                    className="text-xs"
                    style={{ color: "var(--destructive)" }}
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-[0.22em] mb-0.5"
        style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
      >
        {label}
      </p>
      <p
        className="text-base"
        style={{ color: "var(--card-foreground)", fontWeight: 600 }}
      >
        {value}
      </p>
    </div>
  );
}

function trackedLink(masterHost: string, slug: string): string {
  return `https://${masterHost}/get-started?ref=${encodeURIComponent(slug)}`;
}
