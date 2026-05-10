"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, ExternalLink, Printer } from "lucide-react";
import {
  createOpenHouse,
  updateOpenHouse,
  deleteOpenHouse,
  type OpenHouseInput,
} from "@/app/admin/open-houses/actions";
import ImagePicker, {
  type LibraryItem,
} from "@/components/admin/media/ImagePicker";
import {
  OPEN_HOUSE_FEATURES,
  TOTAL_FLYER_PILLS,
  DESCRIPTION_WORD_LIMIT,
  countWords,
  clampToWords,
} from "@/lib/openHouseFeatures";

export default function OpenHouseForm({
  existingId,
  initial,
  library,
}: {
  existingId?: string;
  initial: OpenHouseInput;
  library: LibraryItem[];
}) {
  const router = useRouter();
  const [v, setV] = useState<OpenHouseInput>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof OpenHouseInput>(k: K, val: OpenHouseInput[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  // Bed + bath always take a slot. Garage takes one if > 0. Remaining slots
  // come from the optional `features` array.
  const reservedPills = 2 + (v.garage_spaces > 0 ? 1 : 0);
  const maxExtras = Math.max(0, TOTAL_FLYER_PILLS - reservedPills);

  function toggleFeature(key: string) {
    const has = v.features.includes(key);
    if (has) {
      set(
        "features",
        v.features.filter((f) => f !== key),
      );
      return;
    }
    if (v.features.length >= maxExtras) {
      setError(
        `Pick at most ${maxExtras} extra feature${maxExtras === 1 ? "" : "s"}. Bedrooms, bathrooms${
          v.garage_spaces > 0 ? ", and garage" : ""
        } already use the other pills.`,
      );
      return;
    }
    setError(null);
    set("features", [...v.features, key]);
  }

  // Auto-trim feature list when garage gets added/removed
  function setGarage(spaces: number) {
    const nextReserved = 2 + (spaces > 0 ? 1 : 0);
    const nextMax = Math.max(0, TOTAL_FLYER_PILLS - nextReserved);
    setV((p) => ({
      ...p,
      garage_spaces: spaces,
      features: p.features.slice(0, nextMax),
    }));
  }

  const wordCount = countWords(v.description);

  function setDescription(s: string) {
    if (countWords(s) <= DESCRIPTION_WORD_LIMIT) {
      set("description", s);
    } else {
      // Hard cap — clamp and let the user keep editing the head of it
      set("description", clampToWords(s, DESCRIPTION_WORD_LIMIT));
    }
  }

  function handleSave() {
    setError(null);
    if (!v.heading || !v.slug) {
      setError("Heading and slug are required.");
      return;
    }
    if (v.bedrooms == null || v.bedrooms < 0) {
      setError("Bedrooms is required.");
      return;
    }
    if (v.bathrooms == null || v.bathrooms < 0) {
      setError("Bathrooms is required.");
      return;
    }
    startTransition(async () => {
      const res = existingId
        ? await updateOpenHouse(existingId, v)
        : await createOpenHouse(v);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Always navigate to wherever the new slug landed — slugs are
      // re-derived from the address on every save, so the URL we're on
      // may no longer match if the address changed.
      if (res.slug) {
        router.push(`/admin/open-houses/${res.slug}`);
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!existingId) return;
    if (!confirm(`Delete this open house? This also removes its RSVP form.`))
      return;
    startTransition(async () => {
      const res = await deleteOpenHouse(existingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/admin/open-houses");
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
      <Link
        href="/admin/open-houses"
        className="inline-flex items-center gap-1.5 text-xs text-ink/55 hover:text-ink mb-6"
      >
        <ArrowLeft size={14} /> All open houses
      </Link>

      <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
        <div>
          <p
            className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3"
            style={{ fontWeight: 500 }}
          >
            {existingId ? "Edit Open House" : "New Open House"}
          </p>
          <h1
            className="text-2xl md:text-3xl text-ink mb-2"
            style={{ fontWeight: 600, letterSpacing: "0.01em" }}
          >
            {v.heading || "Untitled"}
          </h1>
          {existingId && (
            <div className="flex items-center gap-3 text-xs text-ink/65">
              <code className="text-[11px] bg-black/5 px-1.5 py-0.5 rounded">
                /open-house/{v.slug}
              </code>
              <a
                href={`/open-house/${v.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-navy hover:underline"
              >
                <ExternalLink size={12} /> Preview
              </a>
              <a
                href={`/open-house/${v.slug}?print=1`}
                target="_blank"
                className="inline-flex items-center gap-1 text-navy hover:underline"
              >
                <Printer size={12} /> Print flyer
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Basics */}
        <div className="admin-card p-6 space-y-4">
          <h2
            className="text-xs tracking-[0.18em] uppercase text-ink/55"
            style={{ fontWeight: 500 }}
          >
            Address
          </h2>
          <div>
            <label className="admin-label">Address (House # + Street)</label>
            <input
              className="admin-input"
              value={v.heading}
              onChange={(e) => set("heading", e.target.value)}
              placeholder="1234 Maple Lane"
            />
            <p className="text-[11px] text-ink/45 mt-1">
              The URL is auto-generated from the address — no slug to maintain.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="admin-label">City</label>
              <input
                className="admin-input"
                value={v.city ?? ""}
                onChange={(e) => set("city", e.target.value || null)}
                placeholder="Woodbridge"
              />
            </div>
            <div>
              <label className="admin-label">State (in full)</label>
              <input
                className="admin-input"
                value={v.state_full ?? ""}
                onChange={(e) => set("state_full", e.target.value || null)}
                placeholder="Virginia"
              />
            </div>
            <div>
              <label className="admin-label">Postal code</label>
              <input
                className="admin-input"
                value={v.postal_code ?? ""}
                onChange={(e) => set("postal_code", e.target.value || null)}
                placeholder="22192"
              />
            </div>
          </div>
          <div>
            <label className="admin-label">MLS # (optional)</label>
            <input
              className="admin-input"
              value={v.mls_id ?? ""}
              onChange={(e) => set("mls_id", e.target.value || null)}
              placeholder="VAPW2098765"
            />
          </div>

          {/* Day 1 */}
          <div className="pt-3 border-t border-black/8">
            <p
              className="text-[10px] tracking-[0.22em] uppercase text-ink/55 mb-3"
              style={{ fontWeight: 600 }}
            >
              Day 1
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="admin-label">Date</label>
                <input
                  type="date"
                  className="admin-input"
                  value={v.open_date ?? ""}
                  onChange={(e) => set("open_date", e.target.value || null)}
                />
              </div>
              <div>
                <label className="admin-label">Time</label>
                <input
                  className="admin-input"
                  value={v.open_time_label ?? ""}
                  onChange={(e) =>
                    set("open_time_label", e.target.value || null)
                  }
                  placeholder="1:00 PM – 4:00 PM"
                />
              </div>
            </div>
          </div>

          {/* Day 2 (optional) */}
          <div className="pt-3 border-t border-black/8">
            <p
              className="text-[10px] tracking-[0.22em] uppercase text-ink/55 mb-3"
              style={{ fontWeight: 600 }}
            >
              Day 2 <span className="text-ink/40 normal-case tracking-normal">(optional — for weekend opens)</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="admin-label">Date</label>
                <input
                  type="date"
                  className="admin-input"
                  value={v.open_date_2 ?? ""}
                  onChange={(e) => set("open_date_2", e.target.value || null)}
                />
              </div>
              <div>
                <label className="admin-label">Time</label>
                <input
                  className="admin-input"
                  value={v.open_time_label_2 ?? ""}
                  onChange={(e) =>
                    set("open_time_label_2", e.target.value || null)
                  }
                  placeholder="11:00 AM – 2:00 PM"
                />
              </div>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              checked={v.is_published}
              onChange={(e) => set("is_published", e.target.checked)}
            />
            <span className="text-sm text-ink/75">
              {v.is_published
                ? "Published — landing page is live"
                : "Draft — page returns 404 publicly"}
            </span>
          </label>
        </div>

        {/* Property specs */}
        <div className="admin-card p-6 space-y-4">
          <h2
            className="text-xs tracking-[0.18em] uppercase text-ink/55"
            style={{ fontWeight: 500 }}
          >
            Property Specs
          </h2>
          <p className="text-xs text-ink/55 -mt-2">
            Bedrooms and bathrooms always show on the flyer. Garage shows
            when set above zero.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="admin-label">
                Bedrooms{" "}
                <span className="text-red-600 normal-case">*</span>
              </label>
              <input
                type="number"
                min={0}
                step={1}
                required
                className="admin-input"
                value={v.bedrooms ?? ""}
                onChange={(e) =>
                  set(
                    "bedrooms",
                    e.target.value === ""
                      ? null
                      : parseInt(e.target.value, 10),
                  )
                }
                placeholder="4"
              />
            </div>
            <div>
              <label className="admin-label">
                Bathrooms{" "}
                <span className="text-red-600 normal-case">*</span>
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                required
                className="admin-input"
                value={v.bathrooms ?? ""}
                onChange={(e) =>
                  set(
                    "bathrooms",
                    e.target.value === ""
                      ? null
                      : parseFloat(e.target.value),
                  )
                }
                placeholder="2.5"
              />
            </div>
            <div>
              <label className="admin-label">Garage spaces</label>
              <input
                type="number"
                min={0}
                step={1}
                className="admin-input"
                value={v.garage_spaces}
                onChange={(e) =>
                  setGarage(parseInt(e.target.value, 10) || 0)
                }
                placeholder="0"
              />
              <p className="text-[11px] text-ink/45 mt-1">0 = no garage</p>
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="admin-card p-6 space-y-6">
          <h2
            className="text-xs tracking-[0.18em] uppercase text-ink/55"
            style={{ fontWeight: 500 }}
          >
            Photos
          </h2>
          <ImagePicker
            label="Hero photo (full-width landscape)"
            crop="wide"
            value={v.hero_image_id}
            onChange={(id) => set("hero_image_id", id)}
            cropArea={v.hero_image_crop}
            onCropAreaChange={(c) => set("hero_image_crop", c)}
            library={library}
            emptyText="The big landscape photo at the top of the flyer."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImagePicker
              label="Second photo"
              crop="landscape"
              value={v.second_image_id}
              onChange={(id) => set("second_image_id", id)}
              cropArea={v.second_image_crop}
              onCropAreaChange={(c) => set("second_image_crop", c)}
              library={library}
            />
            <ImagePicker
              label="Third photo"
              crop="landscape"
              value={v.third_image_id}
              onChange={(id) => set("third_image_id", id)}
              cropArea={v.third_image_crop}
              onCropAreaChange={(c) => set("third_image_crop", c)}
              library={library}
            />
          </div>
        </div>

        {/* Extra features */}
        <div className="admin-card p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2
              className="text-xs tracking-[0.18em] uppercase text-ink/55"
              style={{ fontWeight: 500 }}
            >
              Extra Features
            </h2>
            <span className="text-[11px] text-ink/55">
              {v.features.length} of {maxExtras} extras chosen
            </span>
          </div>
          {maxExtras === 0 ? (
            <p className="text-xs text-ink/55 italic">
              All four flyer pills are taken by Bedrooms, Bathrooms, and
              Garage. Set garage to 0 to free a slot for an extra feature.
            </p>
          ) : (
            <p className="text-xs text-ink/55 -mt-2">
              Pick up to {maxExtras} extra
              {maxExtras === 1 ? "" : "s"} to fill the remaining feature
              pills on the flyer.
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {OPEN_HOUSE_FEATURES.map((f) => {
              const checked = v.features.includes(f.key);
              const disabled =
                !checked && v.features.length >= maxExtras;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => toggleFeature(f.key)}
                  disabled={disabled}
                  className={`text-xs px-3 py-2 rounded border text-left transition-colors ${
                    checked
                      ? "bg-navy text-white border-navy"
                      : disabled
                        ? "bg-black/5 text-ink/35 border-black/10 cursor-not-allowed"
                        : "bg-white text-ink/75 border-black/10 hover:border-navy/40"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div className="admin-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-xs tracking-[0.18em] uppercase text-ink/55"
              style={{ fontWeight: 500 }}
            >
              Description
            </h2>
            <span
              className={`text-[11px] ${
                wordCount >= DESCRIPTION_WORD_LIMIT
                  ? "text-amber-700"
                  : "text-ink/55"
              }`}
            >
              {wordCount} / {DESCRIPTION_WORD_LIMIT} words
            </span>
          </div>
          <textarea
            rows={4}
            className="admin-input"
            value={v.description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Sun-drenched four-bedroom in Lake Ridge with a rare flat lot, two-car garage, and a kitchen made for hosting."
          />
          <p className="text-[11px] text-ink/45">
            Capped at {DESCRIPTION_WORD_LIMIT} words to keep the flyer
            readable on A4.
          </p>
        </div>

        {/* Auto-form note */}
        <div className="admin-card p-5 bg-cream-soft/40 border-dashed">
          <p className="text-xs uppercase tracking-[0.18em] text-ink/55 mb-2">
            RSVP Form
          </p>
          <p className="text-sm text-ink/75 leading-relaxed">
            A sign-up form is{" "}
            {existingId ? "already attached" : "auto-created on save"} so
            visitors can RSVP from the landing page. Fields: name, email,
            phone, party size. Submissions land in your{" "}
            <a
              href="/admin/inbox"
              className="text-navy underline underline-offset-2"
            >
              Inbox
            </a>
            .
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded mt-4">
          {error}
        </div>
      )}

      {/* Sticky save bar */}
      <div className="flex items-center justify-between mt-6 sticky bottom-4 bg-white border border-black/10 rounded-md p-3 shadow-sm">
        <div>
          {existingId && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-red-700 hover:text-red-800 rounded hover:bg-red-50"
            >
              <Trash2 size={13} /> Delete open house
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/open-houses"
            className="px-4 py-2 text-xs text-ink/65 hover:text-ink rounded hover:bg-black/5"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !v.heading || !v.slug}
            className="admin-btn"
          >
            <Save size={14} className="mr-2" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
