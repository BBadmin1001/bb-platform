"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, Trash2, X } from "lucide-react";
import {
  createPlan,
  updatePlan,
  deletePlan,
  type PlanInput,
} from "@/app/master/plans/actions";

interface Props {
  initial?: Partial<PlanInput> & { id?: string };
  editingId?: string;
}

export default function PlanForm({ initial, editingId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [v, setV] = useState<PlanInput>({
    slug: initial?.slug ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    price_cents: initial?.price_cents ?? 3000,
    interval: (initial?.interval as PlanInput["interval"]) ?? "monthly",
    features: initial?.features ?? [],
    is_active: initial?.is_active ?? true,
    display_order: initial?.display_order ?? 100,
  });

  const [featureDraft, setFeatureDraft] = useState("");

  function set<K extends keyof PlanInput>(k: K, val: PlanInput[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  function addFeature() {
    const f = featureDraft.trim();
    if (!f || v.features.includes(f)) return;
    set("features", [...v.features, f]);
    setFeatureDraft("");
  }

  function removeFeature(f: string) {
    set("features", v.features.filter((x) => x !== f));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = editingId ? await updatePlan(editingId, v) : await createPlan(v);
      if (!res.ok) return setError(res.error);
      setSaved(true);
      const slug = res.slug ?? v.slug;
      if (!editingId || slug !== initial?.slug) {
        router.push(`/master/plans/${slug}`);
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!editingId) return;
    if (
      !confirm(
        `Delete plan "${v.name}"? Existing tenant_subscriptions referencing it will be orphaned.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deletePlan(editingId);
      if (!res.ok) return setError(res.error);
      router.push("/master/plans");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-32">
      <section className="admin-card p-6 space-y-5">
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Basics
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="admin-label">Slug</label>
            <input
              required
              value={v.slug}
              onChange={(e) =>
                set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))
              }
              className="admin-input admin-mono"
              placeholder="marketing"
            />
          </div>
          <div>
            <label className="admin-label">Name</label>
            <input
              required
              value={v.name}
              onChange={(e) => set("name", e.target.value)}
              className="admin-input"
              placeholder="Marketing Plan"
            />
          </div>
        </div>

        <div>
          <label className="admin-label">Description</label>
          <textarea
            rows={2}
            value={v.description ?? ""}
            onChange={(e) => set("description", e.target.value || null)}
            placeholder="One-line pitch shown to customers."
            className="admin-input"
          />
        </div>
      </section>

      <section className="admin-card p-6 space-y-5">
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Pricing
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="admin-label">Price (USD cents)</label>
            <input
              type="number"
              min={0}
              required
              value={v.price_cents}
              onChange={(e) =>
                set("price_cents", parseInt(e.target.value || "0", 10))
              }
              className="admin-input admin-mono"
            />
            <p
              className="text-[11px] mt-1.5"
              style={{ color: "var(--muted-foreground)" }}
            >
              ${(v.price_cents / 100).toFixed(2)} / {v.interval}
            </p>
          </div>
          <div>
            <label className="admin-label">Interval</label>
            <select
              value={v.interval}
              onChange={(e) =>
                set("interval", e.target.value as PlanInput["interval"])
              }
              className="admin-input"
            >
              <option value="monthly">monthly</option>
              <option value="yearly">yearly</option>
            </select>
          </div>
        </div>
      </section>

      <section className="admin-card p-6 space-y-5">
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Feature flags
        </p>
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          Strings written to <code className="admin-mono">tenants.features</code> when
          a tenant subscribes. Code reads them via the feature-gate helpers.
        </p>

        <div className="flex flex-wrap gap-2 mb-2">
          {v.features.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 text-xs admin-mono px-2.5 py-1 rounded"
              style={{
                background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                color: "var(--primary)",
              }}
            >
              {f}
              <button
                type="button"
                onClick={() => removeFeature(f)}
                className="opacity-60 hover:opacity-100"
                aria-label="Remove"
              >
                <X size={11} />
              </button>
            </span>
          ))}
          {v.features.length === 0 && (
            <span
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              No features yet.
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={featureDraft}
            onChange={(e) => setFeatureDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFeature();
              }
            }}
            placeholder="analytics"
            className="admin-input admin-mono flex-1"
          />
          <button
            type="button"
            onClick={addFeature}
            className="admin-btn admin-btn-secondary"
          >
            Add
          </button>
        </div>
      </section>

      <section className="admin-card p-6 space-y-5">
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Display
        </p>

        <div className="grid grid-cols-2 gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={v.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="w-4 h-4"
            />
            <span style={{ fontWeight: 600 }}>
              {v.is_active ? "Active (shown to customers)" : "Inactive (hidden)"}
            </span>
          </label>
          <div>
            <label className="admin-label">Display order</label>
            <input
              type="number"
              value={v.display_order}
              onChange={(e) =>
                set("display_order", parseInt(e.target.value || "100", 10))
              }
              className="admin-input admin-mono"
            />
          </div>
        </div>
      </section>

      <div
        className="fixed bottom-0 left-[240px] right-0 z-30 px-6 md:px-8 py-4 border-t backdrop-blur"
        style={{
          background: "color-mix(in srgb, var(--background) 95%, transparent)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-end gap-3">
          {error && (
            <span
              className="text-xs inline-flex items-center gap-1.5"
              style={{ color: "var(--destructive)" }}
            >
              <AlertCircle size={12} />
              {error}
            </span>
          )}
          {saved && !error && (
            <span
              className="text-xs"
              style={{ color: "var(--primary)", fontWeight: 600 }}
            >
              Saved
            </span>
          )}
          {editingId && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="admin-btn admin-btn-secondary"
              style={{ color: "var(--destructive)" }}
            >
              <Trash2 size={13} />
            </button>
          )}
          <button type="submit" disabled={pending} className="admin-btn">
            <Save size={13} className="mr-2" />
            {pending ? "Saving…" : editingId ? "Save changes" : "Create plan"}
          </button>
        </div>
      </div>
    </form>
  );
}
