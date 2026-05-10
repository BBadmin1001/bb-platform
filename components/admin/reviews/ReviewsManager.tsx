"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Save,
  Star,
  Eye,
  EyeOff,
  Pin,
  Check,
} from "lucide-react";
import {
  createReview,
  updateReview,
  deleteReview,
  reorderReviews,
  approveSubmission,
  rejectSubmission,
  approvePendingReview,
  hidePendingReview,
  type ReviewInput,
  type ReviewSource,
} from "@/app/admin/reviews/actions";
import { cn } from "@/lib/cn";

export type ReviewRow = {
  id: string;
  source: ReviewSource;
  external_id: string | null;
  author_name: string | null;
  author_short_label: string | null;
  rating: number | null;
  quote: string;
  is_featured_homepage: boolean;
  is_visible: boolean;
  /** 'pending' | 'approved' | 'rejected' — pending = awaiting admin decision */
  status?: "pending" | "approved" | "rejected";
  display_order: number;
  written_at?: string | null;
};

export type SubmissionRow = {
  id: string;
  author_name: string | null;
  author_email: string | null;
  author_phone?: string | null;
  rating: number | null;
  quote: string;
  status: "pending" | "approved" | "rejected";
  kind?: "public" | "internal";
  submitted_at: string;
};

const SOURCES: { key: ReviewSource; label: string }[] = [
  { key: "manual", label: "Manual / Other" },
  { key: "google", label: "Google" },
  { key: "zillow", label: "Zillow" },
  { key: "realtor", label: "Realtor.com" },
];

export default function ReviewsManager({
  initial,
  pendingGoogle = [],
  submissions,
  internalFeedback = [],
}: {
  initial: ReviewRow[];
  /** Reviews pulled from Google awaiting admin approval. */
  pendingGoogle?: ReviewRow[];
  /** Public-form submissions from /leave-review (kind='public'). */
  submissions: SubmissionRow[];
  /** Private-form submissions from /leave-review-internal (kind='internal'). */
  internalFeedback?: SubmissionRow[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<ReviewRow[]>(initial);
  const [editing, setEditing] = useState<ReviewRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    startTransition(async () => {
      await reorderReviews(next.map((x) => x.id));
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this review?")) return;
    startTransition(async () => {
      await deleteReview(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      {/* Pending Google reviews — awaiting admin approval before public display */}
      {pendingGoogle.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-xs tracking-[0.18em] uppercase"
              style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
            >
              Pending Google reviews ({pendingGoogle.length})
            </h2>
            <span
              className="text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full"
              style={{
                background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                color: "var(--primary)",
                fontWeight: 700,
              }}
            >
              From Google · auto-pulled
            </span>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
            These are live on Google already. Approve to also show on the website,
            or hide to keep them off the website (they stay on Google either way).
          </p>
          <div className="space-y-2">
            {pendingGoogle.map((r) => (
              <div key={r.id} className="admin-card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm" style={{ fontWeight: 500, color: "var(--card-foreground)" }}>
                      {r.author_name || "Anonymous"}
                      <span
                        className="ml-2 font-normal"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        · {r.author_short_label || (r.written_at ? new Date(r.written_at).toLocaleDateString() : "")}
                      </span>
                    </p>
                    <Stars value={r.rating ?? 5} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(async () => {
                          await approvePendingReview(r.id);
                          router.refresh();
                        })
                      }
                      className="text-xs inline-flex items-center gap-1"
                      style={{ color: "var(--primary)", fontWeight: 600 }}
                    >
                      <Check size={13} /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(async () => {
                          await hidePendingReview(r.id);
                          router.refresh();
                        })
                      }
                      className="text-xs inline-flex items-center gap-1"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <EyeOff size={13} /> Hide
                    </button>
                  </div>
                </div>
                <p
                  className="text-sm leading-relaxed italic"
                  style={{ color: "var(--card-foreground)" }}
                >
                  &ldquo;{r.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Private internal feedback — never auto-publishes anywhere */}
      {internalFeedback.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-xs tracking-[0.18em] uppercase"
              style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
            >
              Internal feedback ({internalFeedback.length})
            </h2>
            <span
              className="text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full"
              style={{
                background: "color-mix(in srgb, var(--destructive) 12%, transparent)",
                color: "var(--destructive)",
                fontWeight: 700,
              }}
            >
              Private · not on Google or website
            </span>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
            Private client feedback from your /leave-review-internal link. Only
            you see this. If a piece of feedback is great, click <em>Approve to
            website</em> to publish it (it still won&apos;t go to Google). Otherwise
            click <em>Mark resolved</em> to clear from this list.
          </p>
          <div className="space-y-2">
            {internalFeedback.map((s) => (
              <div
                key={s.id}
                className="admin-card p-4"
                style={{
                  borderColor: "color-mix(in srgb, var(--destructive) 20%, var(--border))",
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm" style={{ fontWeight: 500, color: "var(--card-foreground)" }}>
                      {s.author_name || "Anonymous"}
                      {s.author_email && (
                        <span
                          className="ml-2 font-normal"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          · {s.author_email}
                        </span>
                      )}
                    </p>
                    <Stars value={s.rating ?? 5} />
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {new Date(s.submitted_at).toLocaleDateString()}
                      {s.author_phone && ` · ${s.author_phone}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(async () => {
                          await approveSubmission(s.id);
                          router.refresh();
                        })
                      }
                      className="text-xs inline-flex items-center gap-1"
                      style={{ color: "var(--primary)", fontWeight: 600 }}
                      title="Promote to public website (still won't post to Google)"
                    >
                      <Check size={13} /> Approve to website
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(async () => {
                          await rejectSubmission(s.id);
                          router.refresh();
                        })
                      }
                      className="text-xs inline-flex items-center gap-1"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <X size={13} /> Mark resolved
                    </button>
                  </div>
                </div>
                <p
                  className="text-sm leading-relaxed italic"
                  style={{ color: "var(--card-foreground)" }}
                >
                  &ldquo;{s.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending submissions */}
      {submissions.length > 0 && (
        <section>
          <h2
            className="text-xs tracking-[0.18em] uppercase text-ink/55 mb-3"
            style={{ fontWeight: 500 }}
          >
            Pending submissions ({submissions.length})
          </h2>
          <div className="space-y-2">
            {submissions.map((s) => (
              <div key={s.id} className="admin-card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm" style={{ fontWeight: 500 }}>
                      {s.author_name || "Anonymous"}{" "}
                      <span className="text-ink/45 font-normal">
                        · {new Date(s.submitted_at).toLocaleDateString()}
                      </span>
                    </p>
                    <Stars value={s.rating ?? 5} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(async () => {
                          await approveSubmission(s.id);
                          router.refresh();
                        })
                      }
                      className="text-xs text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                    >
                      <Check size={13} /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(async () => {
                          await rejectSubmission(s.id);
                          router.refresh();
                        })
                      }
                      className="text-xs text-ink/55 hover:text-red-600 inline-flex items-center gap-1"
                    >
                      <X size={13} /> Reject
                    </button>
                  </div>
                </div>
                <p className="text-sm text-ink/85 leading-relaxed italic">
                  &ldquo;{s.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-xs tracking-[0.18em] uppercase text-ink/55"
            style={{ fontWeight: 500 }}
          >
            Reviews ({items.length})
          </h2>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="admin-btn"
          >
            <Plus size={14} className="mr-2" /> Add review
          </button>
        </div>

        {items.length === 0 ? (
          <div className="admin-card p-10 text-center">
            <p className="text-sm text-ink/65">
              No reviews yet. Add your first manually, or share your{" "}
              <a
                href="/leave-review"
                target="_blank"
                className="text-navy underline"
              >
                /leave-review
              </a>{" "}
              link with a recent client.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((r, i) => (
              <div key={r.id} className="admin-card p-4 flex gap-3">
                <div className="flex flex-col gap-0.5 pt-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-ink/40 hover:text-ink disabled:opacity-30"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1}
                    className="text-ink/40 hover:text-ink disabled:opacity-30"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm" style={{ fontWeight: 500 }}>
                      {r.author_short_label || r.author_name || "Anonymous"}
                    </p>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-ink/45">
                      {r.source}
                    </span>
                    {r.is_featured_homepage && (
                      <span className="text-[10px] inline-flex items-center gap-1 text-emerald-700">
                        <Pin size={10} /> Homepage
                      </span>
                    )}
                    {!r.is_visible && (
                      <span className="text-[10px] inline-flex items-center gap-1 text-ink/40">
                        <EyeOff size={10} /> Hidden
                      </span>
                    )}
                  </div>
                  <Stars value={r.rating ?? 5} />
                  <p className="text-sm text-ink/80 leading-relaxed italic mt-2 line-clamp-3">
                    &ldquo;{r.quote}&rdquo;
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      className="text-navy hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="text-ink/55 hover:text-red-600 inline-flex items-center gap-1"
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {(adding || editing) && (
        <ReviewDialog
          existing={editing ?? undefined}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={() => {
            setAdding(false);
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          fill={i < value ? "currentColor" : "none"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function ReviewDialog({
  existing,
  onClose,
  onSaved,
}: {
  existing?: ReviewRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState<ReviewInput>({
    source: existing?.source ?? "manual",
    external_id: existing?.external_id ?? null,
    author_name: existing?.author_name ?? "",
    author_short_label: existing?.author_short_label ?? "",
    rating: existing?.rating ?? 5,
    quote: existing?.quote ?? "",
    is_featured_homepage: existing?.is_featured_homepage ?? false,
    is_visible: existing?.is_visible ?? true,
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ReviewInput>(k: K, val: ReviewInput[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = existing
        ? await updateReview(existing.id, v)
        : await createReview(v);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-md max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-sm" style={{ fontWeight: 500 }}>
            {existing ? "Edit review" : "Add review"}
          </h3>
          <button onClick={onClose} className="text-ink/55 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="admin-label">Quote</label>
            <textarea
              rows={4}
              className="admin-input"
              value={v.quote}
              onChange={(e) => set("quote", e.target.value)}
              placeholder="What the client said about working with Samina."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Author Name</label>
              <input
                className="admin-input"
                value={v.author_name}
                onChange={(e) => set("author_name", e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="admin-label">Short Label</label>
              <input
                className="admin-input"
                value={v.author_short_label}
                onChange={(e) => set("author_short_label", e.target.value)}
                placeholder="First-time buyer"
              />
            </div>
            <div>
              <label className="admin-label">Source</label>
              <select
                className="admin-input"
                value={v.source}
                onChange={(e) => set("source", e.target.value as ReviewSource)}
              >
                {SOURCES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="admin-label">Rating</label>
              <select
                className="admin-input"
                value={v.rating}
                onChange={(e) => set("rating", parseInt(e.target.value, 10))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={v.is_featured_homepage}
                onChange={(e) =>
                  set("is_featured_homepage", e.target.checked)
                }
              />
              <span className="text-sm text-ink/75">
                Feature on homepage strip
              </span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={v.is_visible}
                onChange={(e) => set("is_visible", e.target.checked)}
              />
              <span className="text-sm text-ink/75">Show on public site</span>
            </label>
          </div>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-black/10 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="admin-btn admin-btn-secondary">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={pending || !v.quote}
            className={cn("admin-btn")}
          >
            <Save size={14} className="mr-2" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
