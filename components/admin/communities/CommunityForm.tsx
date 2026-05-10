"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, Plus, ChevronUp, ChevronDown } from "lucide-react";
import {
  upsertCommunity,
  deleteCommunity,
  type CommunityInput,
} from "@/app/admin/communities/actions";
import ImagePicker, { type LibraryItem } from "@/components/admin/media/ImagePicker";
import {
  DEFAULT_COMMUNITY_PHOTO,
  DEFAULT_COMMUNITY_HERO_PHOTO,
} from "@/lib/imageDefaults";

export default function CommunityForm({
  existingId,
  initial,
  library,
}: {
  existingId?: string;
  initial: CommunityInput;
  library: LibraryItem[];
}) {
  const router = useRouter();
  const [v, setV] = useState<CommunityInput>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CommunityInput>(key: K, val: CommunityInput[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await upsertCommunity(v, existingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/admin/communities");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!existingId) return;
    if (!confirm(`Delete ${v.name}? This can't be undone.`)) return;
    startTransition(async () => {
      const res = await deleteCommunity(existingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/admin/communities");
      router.refresh();
    });
  }

  // ──────────────── Price tiers helpers ────────────────
  function updateTier(i: number, patch: Partial<CommunityInput["price_tiers"][number]>) {
    const next = [...v.price_tiers];
    next[i] = { ...next[i], ...patch };
    set("price_tiers", next);
  }
  function addTier() {
    set("price_tiers", [...v.price_tiers, { tier: "", description: "" }]);
  }
  function removeTier(i: number) {
    set(
      "price_tiers",
      v.price_tiers.filter((_, idx) => idx !== i),
    );
  }
  function moveTier(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= v.price_tiers.length) return;
    const next = [...v.price_tiers];
    [next[i], next[j]] = [next[j], next[i]];
    set("price_tiers", next);
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
      <Link
        href="/admin/communities"
        className="inline-flex items-center gap-1.5 text-xs text-ink/55 hover:text-ink mb-6"
      >
        <ArrowLeft size={14} /> All communities
      </Link>

      <div className="mb-8">
        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3"
          style={{ fontWeight: 500 }}
        >
          {existingId ? "Edit Community" : "New Community"}
        </p>
        <h1
          className="text-2xl md:text-3xl text-ink mb-2"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          {v.name || "Untitled"}
        </h1>
      </div>

      <div className="space-y-6">
        {/* Basics */}
        <div className="admin-card p-6 space-y-4">
          <h2
            className="text-xs tracking-[0.18em] uppercase text-ink/55"
            style={{ fontWeight: 500 }}
          >
            Basics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Name</label>
              <input
                className="admin-input"
                value={v.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Slug (URL)</label>
              <input
                className="admin-input"
                value={v.slug}
                onChange={(e) => set("slug", slugify(e.target.value))}
              />
            </div>
            <div>
              <label className="admin-label">State</label>
              <input
                className="admin-input"
                value={v.state}
                onChange={(e) => set("state", e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label">Visible on site</label>
              <label className="inline-flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={v.is_visible}
                  onChange={(e) => set("is_visible", e.target.checked)}
                />
                <span className="text-sm text-ink/75">
                  {v.is_visible ? "Showing publicly" : "Hidden"}
                </span>
              </label>
            </div>
          </div>
          <div>
            <label className="admin-label">Tagline</label>
            <input
              className="admin-input"
              value={v.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="One short editorial line"
            />
          </div>
        </div>

        {/* Image */}
        <div className="admin-card p-6 space-y-6">
          <ImagePicker
            label="Community Photo"
            crop="wide"
            value={v.image_id}
            onChange={(id) => set("image_id", id)}
            cropArea={v.image_crop ?? null}
            onCropAreaChange={(c) => set("image_crop", c)}
            library={library}
            emptyText="No photo selected — upload or pick from library."
            fallbackUrl={DEFAULT_COMMUNITY_PHOTO}
          />
          <div className="pt-6 border-t border-black/8">
            <ImagePicker
              label="Hero Photo (optional)"
              crop="wide"
              value={v.hero_image_id}
              onChange={(id) => set("hero_image_id", id)}
              cropArea={v.hero_image_crop ?? null}
              onCropAreaChange={(c) => set("hero_image_crop", c)}
              library={library}
              emptyText="Leave blank to reuse the Community Photo above. Pick a different shot here if you want a wider/different hero on the community detail page."
              fallbackUrl={DEFAULT_COMMUNITY_HERO_PHOTO}
            />
          </div>
        </div>

        {/* Editorial body */}
        <div className="admin-card p-6 space-y-4">
          <h2
            className="text-xs tracking-[0.18em] uppercase text-ink/55"
            style={{ fontWeight: 500 }}
          >
            Editorial
          </h2>
          <div>
            <label className="admin-label">About</label>
            <textarea
              rows={5}
              className="admin-input"
              value={v.about}
              onChange={(e) => set("about", e.target.value)}
              placeholder="A few sentences about the neighborhood — feel, anchors, who it suits."
            />
          </div>
          <div>
            <label className="admin-label">This year&rsquo;s market summary</label>
            <textarea
              rows={4}
              className="admin-input"
              value={v.market_year_summary}
              onChange={(e) => set("market_year_summary", e.target.value)}
              placeholder="What the {data_year} market is doing here, in plain language."
            />
          </div>
          <div>
            <label className="admin-label">Samina&rsquo;s Quote</label>
            <textarea
              rows={3}
              className="admin-input"
              value={v.samina_quote}
              onChange={(e) => set("samina_quote", e.target.value)}
              placeholder="Pull-quote that appears next to the photo."
            />
          </div>
        </div>

        {/* Market data — yearly numbers */}
        <div className="admin-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-xs tracking-[0.18em] uppercase text-ink/55"
              style={{ fontWeight: 500 }}
            >
              Market data
            </h2>
            <p className="text-[11px] text-ink/45">
              Update each year — typically December or January.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="admin-label">Median Price</label>
              <input
                className="admin-input"
                value={v.median_price}
                onChange={(e) => set("median_price", e.target.value)}
                placeholder="$460K"
              />
            </div>
            <div>
              <label className="admin-label">YoY Change</label>
              <input
                className="admin-input"
                value={v.yoy_change}
                onChange={(e) => set("yoy_change", e.target.value)}
                placeholder="+5.5%"
              />
            </div>
            <div>
              <label className="admin-label">YoY Direction</label>
              <select
                className="admin-input"
                value={v.yoy_direction}
                onChange={(e) =>
                  set("yoy_direction", e.target.value as CommunityInput["yoy_direction"])
                }
              >
                <option value="up">Up (green)</option>
                <option value="down">Down (orange)</option>
                <option value="flat">Flat</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Days on Market</label>
              <input
                className="admin-input"
                value={v.days_on_market}
                onChange={(e) => set("days_on_market", e.target.value)}
                placeholder="42 days"
              />
            </div>
            <div>
              <label className="admin-label">Market Type</label>
              <select
                className="admin-input"
                value={v.market_type}
                onChange={(e) => set("market_type", e.target.value)}
              >
                <option value="Balanced">Balanced</option>
                <option value="Seller's">Seller&rsquo;s</option>
                <option value="Buyer's">Buyer&rsquo;s</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Data Year</label>
              <input
                className="admin-input"
                type="number"
                value={v.data_year}
                onChange={(e) => set("data_year", parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
        </div>

        {/* Price tiers */}
        <div className="admin-card p-6 space-y-3">
          <h2
            className="text-xs tracking-[0.18em] uppercase text-ink/55"
            style={{ fontWeight: 500 }}
          >
            Price Tiers
          </h2>
          <p className="text-xs text-ink/55 -mt-2">
            What buyers can expect at each price band. Shown on the community
            detail page.
          </p>

          {v.price_tiers.length === 0 && (
            <p className="text-xs text-ink/45 italic">No tiers yet.</p>
          )}

          {v.price_tiers.map((t, i) => (
            <div key={i} className="border border-black/10 rounded-md p-3 bg-black/[0.015]">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 pt-1">
                  <button
                    type="button"
                    onClick={() => moveTier(i, -1)}
                    disabled={i === 0}
                    className="text-ink/40 hover:text-ink disabled:opacity-30"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTier(i, 1)}
                    disabled={i === v.price_tiers.length - 1}
                    className="text-ink/40 hover:text-ink disabled:opacity-30"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    className="admin-input"
                    placeholder="Under $500K"
                    value={t.tier}
                    onChange={(e) => updateTier(i, { tier: e.target.value })}
                  />
                  <input
                    className="admin-input sm:col-span-2"
                    placeholder="Townhome, 3 bd / 2-3 ba, 1,500–2,000 sqft"
                    value={t.description}
                    onChange={(e) =>
                      updateTier(i, { description: e.target.value })
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeTier(i)}
                  className="text-ink/40 hover:text-red-600 mt-2.5"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addTier}
            className="inline-flex items-center gap-1.5 text-xs text-navy hover:underline"
          >
            <Plus size={14} /> Add tier
          </button>
        </div>

        {/* Life facts */}
        <div className="admin-card p-6 space-y-4">
          <h2
            className="text-xs tracking-[0.18em] uppercase text-ink/55"
            style={{ fontWeight: 500 }}
          >
            Life
          </h2>
          {(["schools", "parks", "dining", "commute"] as const).map((k) => (
            <div key={k}>
              <label className="admin-label capitalize">{k}</label>
              <input
                className="admin-input"
                value={v.life[k] ?? ""}
                onChange={(e) =>
                  set("life", { ...v.life, [k]: e.target.value })
                }
              />
            </div>
          ))}
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
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/communities"
            className="px-4 py-2 text-xs text-ink/65 hover:text-ink rounded hover:bg-black/5"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !v.name || !v.slug}
            className="admin-btn"
          >
            <Save size={14} className="mr-2" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
