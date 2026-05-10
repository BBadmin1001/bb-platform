"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, Trash2 } from "lucide-react";
import {
  createTenant,
  updateTenant,
  deleteTenant,
  type TenantInput,
} from "@/app/master/tenants/actions";

const STATUS_OPTIONS: TenantInput["status"][] = [
  "pending",
  "active",
  "suspended",
  "archived",
];

interface Props {
  initial?: Partial<TenantInput> & { id?: string };
  /** Tenant id when editing — absent in create mode. */
  editingId?: string;
}

export default function TenantForm({ initial, editingId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [v, setV] = useState<TenantInput>({
    slug: initial?.slug ?? "",
    realtor_name: initial?.realtor_name ?? "",
    brokerage: initial?.brokerage ?? "",
    contact_email: initial?.contact_email ?? "",
    contact_phone: initial?.contact_phone ?? "",
    state_abbr: initial?.state_abbr ?? "",
    custom_domain: initial?.custom_domain ?? "",
    status: (initial?.status as TenantInput["status"]) ?? "pending",
  });

  function set<K extends keyof TenantInput>(k: K, val: TenantInput[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = editingId
        ? await updateTenant(editingId, v)
        : await createTenant(v);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
      const slug = res.slug ?? v.slug;
      if (!editingId || slug !== initial?.slug) {
        router.push(`/master/tenants/${slug}`);
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!editingId) return;
    if (
      !confirm(
        `Delete tenant "${v.realtor_name}"? This cascades to every row of their content, media, communities, leads, etc. and cannot be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteTenant(editingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/master/tenants");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-32">
      <section className="admin-card p-6 space-y-5">
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Identity
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
              placeholder="samina"
              className="admin-input admin-mono"
            />
            <p
              className="text-[11px] mt-1.5"
              style={{ color: "var(--muted-foreground)" }}
            >
              Subdomain identifier. Site lives at{" "}
              <code className="admin-mono">{v.slug || "<slug>"}.bbplatform.com</code>.
            </p>
          </div>

          <div>
            <label className="admin-label">Custom domain (optional)</label>
            <input
              value={v.custom_domain ?? ""}
              onChange={(e) => set("custom_domain", e.target.value || null)}
              placeholder="saminabilal.com"
              className="admin-input admin-mono"
            />
          </div>
        </div>

        <div>
          <label className="admin-label">Realtor / business name</label>
          <input
            required
            value={v.realtor_name}
            onChange={(e) => set("realtor_name", e.target.value)}
            placeholder="Samina Bilal"
            className="admin-input"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="admin-label">Brokerage</label>
            <input
              value={v.brokerage ?? ""}
              onChange={(e) => set("brokerage", e.target.value || null)}
              placeholder="RE/MAX Galaxy"
              className="admin-input"
            />
          </div>
          <div>
            <label className="admin-label">State (2 letters)</label>
            <input
              value={v.state_abbr ?? ""}
              onChange={(e) =>
                set(
                  "state_abbr",
                  e.target.value.toUpperCase().slice(0, 2) || null,
                )
              }
              placeholder="VA"
              className="admin-input admin-mono"
              maxLength={2}
            />
          </div>
        </div>
      </section>

      <section className="admin-card p-6 space-y-5">
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Contact
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="admin-label">Email</label>
            <input
              type="email"
              required
              value={v.contact_email}
              onChange={(e) => set("contact_email", e.target.value)}
              placeholder="agent@example.com"
              className="admin-input"
            />
          </div>
          <div>
            <label className="admin-label">Phone</label>
            <input
              type="tel"
              value={v.contact_phone ?? ""}
              onChange={(e) => set("contact_phone", e.target.value || null)}
              placeholder="(703) 555-0100"
              className="admin-input"
            />
          </div>
        </div>
      </section>

      <section className="admin-card p-6 space-y-5">
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Status
        </p>

        <div>
          <label className="admin-label">Lifecycle</label>
          <select
            value={v.status}
            onChange={(e) => set("status", e.target.value as TenantInput["status"])}
            className="admin-input"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p
            className="text-[11px] mt-1.5"
            style={{ color: "var(--muted-foreground)" }}
          >
            <strong>pending</strong>: provisioning, hidden from public.{" "}
            <strong>active</strong>: live + reachable.{" "}
            <strong>suspended</strong>: temporarily down (non-payment, etc).{" "}
            <strong>archived</strong>: kept for records only.
          </p>
        </div>
      </section>

      {/* Sticky footer */}
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
          {savedAt && !error && (
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
              title="Delete tenant"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button type="submit" disabled={pending} className="admin-btn">
            <Save size={13} className="mr-2" />
            {pending
              ? "Saving…"
              : editingId
                ? "Save changes"
                : "Create tenant"}
          </button>
        </div>
      </div>
    </form>
  );
}
