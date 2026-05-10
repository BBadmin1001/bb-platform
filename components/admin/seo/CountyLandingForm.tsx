"use client";

/**
 * CountyLandingForm — used by both /admin/seo/counties/new (create) and
 * /admin/seo/counties/[slug]/edit (edit). Single source of truth so the
 * fields stay in sync across both routes.
 *
 * Fields:
 *   • County name + state (required) — slug is auto-derived from these
 *   • Hero image (optional) — falls back to the brand featured image
 *   • Custom heading + intro (optional) — defaults to a sensible auto-built
 *     copy when blank
 *   • Custom meta description (optional)
 *   • Service areas (multi-tag) — neighborhoods/towns inside the county
 *   • Zip codes (multi-tag) — drives local SEO + helps with intent matching
 *   • Publish toggle
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Eye, Trash2, ArrowUpRight, AlertCircle } from "lucide-react";
import ImagePicker, {
  type LibraryItem,
} from "@/components/admin/media/ImagePicker";
import TagInput from "@/components/admin/TagInput";
import {
  createCountyLanding,
  updateCountyLanding,
  deleteCountyLanding,
  type CountyLandingInput,
} from "@/app/admin/seo/counties/actions";
import { US_STATES, STATE_NAMES } from "@/lib/counties";

interface FormProps {
  /** Optional starting values for edit mode. When undefined, form is empty. */
  initial?: Partial<CountyLandingInput> & { slug?: string };
  /** Slug of the row being edited; absent in create mode. */
  editingSlug?: string;
  /** Media library options for the hero ImagePicker. */
  library: LibraryItem[];
}

export default function CountyLandingForm({
  initial,
  editingSlug,
  library,
}: FormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [v, setV] = useState<CountyLandingInput>({
    county_name: initial?.county_name ?? "",
    state_abbr: initial?.state_abbr ?? "VA",
    zip_codes: initial?.zip_codes ?? [],
    service_areas: initial?.service_areas ?? [],
    hero_image_id: initial?.hero_image_id ?? null,
    custom_heading: initial?.custom_heading ?? null,
    custom_intro: initial?.custom_intro ?? null,
    custom_meta_description: initial?.custom_meta_description ?? null,
    is_published: initial?.is_published ?? false,
  });

  function set<K extends keyof CountyLandingInput>(
    k: K,
    val: CountyLandingInput[K],
  ) {
    setV((p) => ({ ...p, [k]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = editingSlug
        ? await updateCountyLanding(editingSlug, v)
        : await createCountyLanding(v);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
      // Navigate to /edit so additional saves point at the canonical URL.
      const targetSlug = res.slug ?? editingSlug;
      if (targetSlug && (!editingSlug || targetSlug !== editingSlug)) {
        router.push(`/admin/seo/counties/${targetSlug}/edit`);
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!editingSlug) return;
    if (
      !confirm(
        `Delete the landing page for ${v.county_name} County? This removes the public URL and can't be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteCountyLanding(editingSlug);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/admin/seo/counties");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-32">
      {/* ── Basics ─────────────────────────────────────────── */}
      <section className="admin-card p-6 space-y-5">
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Step 1 · Where
        </p>

        <div>
          <label className="admin-label">County name</label>
          <input
            required
            value={v.county_name}
            onChange={(e) => set("county_name", e.target.value)}
            placeholder="Loudoun"
            className="admin-input"
          />
          <p
            className="text-[11px] mt-1.5"
            style={{ color: "var(--muted-foreground)" }}
          >
            Just the name — &ldquo;County&rdquo; is added automatically.
          </p>
        </div>

        <div>
          <label className="admin-label">State</label>
          <select
            required
            value={v.state_abbr}
            onChange={(e) => set("state_abbr", e.target.value)}
            className="admin-input"
          >
            {US_STATES.map((s) => (
              <option key={s.abbr} value={s.abbr}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="admin-label">
            Service areas inside the county{" "}
            <span
              className="font-normal lowercase tracking-normal"
              style={{ color: "var(--muted-foreground)" }}
            >
              · optional
            </span>
          </label>
          <TagInput
            value={v.service_areas}
            onChange={(next) => set("service_areas", next)}
            placeholder="Type a city or town and hit Enter"
          />
        </div>

        <div>
          <label className="admin-label">
            ZIP codes covered{" "}
            <span
              className="font-normal lowercase tracking-normal"
              style={{ color: "var(--muted-foreground)" }}
            >
              · optional
            </span>
          </label>
          <TagInput
            value={v.zip_codes}
            onChange={(next) => set("zip_codes", next)}
            placeholder="20148, 20176, 22102 …"
            maxLength={5}
          />
        </div>
      </section>

      {/* ── Hero image ───────────────────────────────────── */}
      <section className="admin-card p-6 space-y-4">
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Step 2 · Hero image
        </p>
        <ImagePicker
          label="Header photo (optional)"
          crop="wide"
          value={v.hero_image_id}
          onChange={(id) => set("hero_image_id", id)}
          library={library}
          emptyText="Pick a wide photo that captures this county. Leave blank to use a clean text hero."
        />
      </section>

      {/* ── Optional content overrides ──────────────────── */}
      <section className="admin-card p-6 space-y-4">
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Step 3 · Custom copy{" "}
          <span
            className="font-normal lowercase tracking-normal ml-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            · all optional
          </span>
        </p>
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          Leave blank and a sensible default is auto-built using your brand
          identity, county name, and service areas. Override only when you
          want a specific voice.
        </p>

        <div>
          <label className="admin-label">Custom heading</label>
          <input
            value={v.custom_heading ?? ""}
            onChange={(e) => set("custom_heading", e.target.value || null)}
            placeholder={`Your ${v.county_name || "County"} County, ${STATE_NAMES[v.state_abbr]} Realtor.`}
            className="admin-input"
          />
        </div>
        <div>
          <label className="admin-label">Custom intro paragraph</label>
          <textarea
            rows={4}
            value={v.custom_intro ?? ""}
            onChange={(e) => set("custom_intro", e.target.value || null)}
            placeholder="Write a couple of sentences about why someone in this county should work with you. Leave blank for the auto-built copy."
            className="admin-input"
          />
        </div>
        <div>
          <label className="admin-label">SEO meta description</label>
          <textarea
            rows={2}
            value={v.custom_meta_description ?? ""}
            onChange={(e) =>
              set("custom_meta_description", e.target.value || null)
            }
            placeholder="160 characters max — what shows up in Google search results."
            maxLength={170}
            className="admin-input"
          />
          <p
            className="text-[11px] mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            {(v.custom_meta_description ?? "").length} / 160
          </p>
        </div>
      </section>

      {/* ── Sticky footer: publish + save ──────────────── */}
      <div
        className="fixed bottom-0 left-[240px] right-0 z-30 px-6 md:px-8 py-4 border-t backdrop-blur"
        style={{
          background: "color-mix(in srgb, var(--background) 95%, transparent)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={v.is_published}
              onChange={(e) => set("is_published", e.target.checked)}
              className="w-4 h-4"
            />
            <span style={{ color: "var(--card-foreground)", fontWeight: 600 }}>
              {v.is_published ? "Published" : "Draft"}
            </span>
            <span
              className="text-[11px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              {v.is_published
                ? "Visible at the public URL"
                : "Hidden — only visible to admins"}
            </span>
          </label>

          <div className="flex items-center gap-2">
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
            {editingSlug && v.is_published && (
              <a
                href={`/realtor-in/${editingSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn admin-btn-secondary"
              >
                <Eye size={13} className="mr-2" />
                Preview
                <ArrowUpRight size={11} className="ml-1.5" />
              </a>
            )}
            {editingSlug && (
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
              {pending
                ? "Saving…"
                : editingSlug
                  ? "Save changes"
                  : "Create landing page"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
