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
  Eye,
  EyeOff,
} from "lucide-react";
import {
  createClosing,
  updateClosing,
  deleteClosing,
  reorderClosings,
  type ClosingInput,
} from "@/app/admin/closings/actions";
import ImagePicker, { type LibraryItem } from "@/components/admin/media/ImagePicker";
import type { CropArea } from "@/components/admin/media/CropEditor";
import { cldUrl } from "@/lib/cloudinary";
import { DEFAULT_CLOSING_PHOTO } from "@/lib/imageDefaults";

export type ClosingRow = {
  id: string;
  image_id: string | null;
  image_crop: CropArea | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  closed_year: number | null;
  display_order: number;
  is_visible: boolean;
  media: { cloudinary_public_id: string | null; url: string } | null;
};

export default function ClosingsManager({
  initial,
  library,
}: {
  initial: ClosingRow[];
  library: LibraryItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<ClosingRow[]>(initial);
  const [editing, setEditing] = useState<ClosingRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    startTransition(async () => {
      await reorderClosings(next.map((x) => x.id));
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this closing?")) return;
    startTransition(async () => {
      await deleteClosing(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      router.refresh();
    });
  }

  return (
    <>
      {items.length === 0 ? (
        <div className="admin-card p-10 text-center">
          <p className="text-sm text-ink/65 mb-5">
            No closings yet. Add your first sale to start filling the gallery.
          </p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="admin-btn"
          >
            <Plus size={14} className="mr-2" /> Add a closing
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="admin-btn"
            >
              <Plus size={14} className="mr-2" /> Add closing
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((c, i) => {
              const thumb = c.media?.cloudinary_public_id
                ? cldUrl(c.media.cloudinary_public_id, {
                    crop: "landscape",
                    width: 720,
                  })
                : (c.media?.url || DEFAULT_CLOSING_PHOTO);
              return (
                <div
                  key={c.id}
                  className="admin-card overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-[4/3] bg-black/5">
                    {thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={c.neighborhood ?? "Closing"}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-2 left-2 flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="bg-white/90 hover:bg-white disabled:opacity-40 rounded-full p-1.5 shadow"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === items.length - 1}
                        className="bg-white/90 hover:bg-white disabled:opacity-40 rounded-full p-1.5 shadow"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    <div className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] bg-black/60 text-white px-2 py-1 rounded">
                      {c.is_visible ? <Eye size={10} /> : <EyeOff size={10} />}
                      {c.closed_year ?? ""}
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <p
                      className="text-sm text-ink"
                      style={{ fontWeight: 500 }}
                    >
                      {c.neighborhood || (
                        <em className="text-ink/40">Untitled</em>
                      )}
                    </p>
                    <p className="text-xs text-ink/55">
                      {c.city}
                      {c.state ? `, ${c.state}` : ""}
                    </p>
                    <div className="mt-auto pt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="text-xs text-navy hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="text-xs text-ink/55 hover:text-red-600 inline-flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {(adding || editing) && (
        <ClosingDialog
          existing={editing ?? undefined}
          library={library}
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
    </>
  );
}

function ClosingDialog({
  existing,
  library,
  onClose,
  onSaved,
}: {
  existing?: ClosingRow;
  library: LibraryItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState<ClosingInput>({
    image_id: existing?.image_id ?? null,
    image_crop: existing?.image_crop ?? null,
    neighborhood: existing?.neighborhood ?? "",
    city: existing?.city ?? "",
    state: existing?.state ?? "VA",
    closed_year: existing?.closed_year ?? new Date().getFullYear(),
    is_visible: existing?.is_visible ?? true,
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ClosingInput>(k: K, val: ClosingInput[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = existing
        ? await updateClosing(existing.id, v)
        : await createClosing(v);
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
      <div className="bg-white rounded-md max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-sm" style={{ fontWeight: 500 }}>
            {existing ? "Edit closing" : "New closing"}
          </h3>
          <button onClick={onClose} className="text-ink/55 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <ImagePicker
            label="Photo"
            crop="landscape"
            value={v.image_id}
            onChange={(id) => set("image_id", id)}
            cropArea={v.image_crop ?? null}
            onCropAreaChange={(c) => set("image_crop", c)}
            library={library}
            fallbackUrl={DEFAULT_CLOSING_PHOTO}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Neighborhood</label>
              <input
                className="admin-input"
                value={v.neighborhood}
                onChange={(e) => set("neighborhood", e.target.value)}
                placeholder="Lake Ridge"
              />
            </div>
            <div>
              <label className="admin-label">City</label>
              <input
                className="admin-input"
                value={v.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Woodbridge"
              />
            </div>
            <div>
              <label className="admin-label">State</label>
              <input
                className="admin-input"
                value={v.state}
                onChange={(e) => set("state", e.target.value)}
                placeholder="VA"
                maxLength={2}
              />
            </div>
            <div>
              <label className="admin-label">Year closed</label>
              <input
                type="number"
                className="admin-input"
                value={v.closed_year}
                onChange={(e) =>
                  set("closed_year", parseInt(e.target.value, 10) || 0)
                }
              />
            </div>
          </div>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={v.is_visible}
              onChange={(e) => set("is_visible", e.target.checked)}
            />
            <span className="text-sm text-ink/75">Show on public site</span>
          </label>
          {error && (
            <p className="text-xs text-red-700">{error}</p>
          )}
        </div>
        <div className="px-5 py-4 border-t border-black/10 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="admin-btn admin-btn-secondary">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={pending}
            className="admin-btn"
          >
            <Save size={14} className="mr-2" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
