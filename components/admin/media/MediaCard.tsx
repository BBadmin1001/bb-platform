"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Crop,
  Wand2,
  Copy,
  Check,
  Pencil,
  Youtube,
  Image as ImageIcon,
} from "lucide-react";
import { cldUrl, youTubeThumbnail, type CropPreset } from "@/lib/cloudinary";
import { updateMediaAlt, deleteMedia } from "@/app/admin/media/actions";
import { cn } from "@/lib/cn";

export type MediaRow = {
  id: string;
  kind: "image" | "youtube";
  cloudinary_public_id: string | null;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  uploaded_at: string;
};

const CROP_PRESETS: { key: CropPreset; label: string }[] = [
  { key: "free", label: "Original" },
  { key: "square", label: "1:1 Square" },
  { key: "portrait", label: "3:4 Portrait" },
  { key: "landscape", label: "4:3 Landscape" },
  { key: "wide", label: "16:9 Wide" },
];

export default function MediaCard({
  media,
  selected,
  onToggleSelected,
}: {
  media: MediaRow;
  selected?: boolean;
  onToggleSelected?: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingAlt, setEditingAlt] = useState(false);
  const [alt, setAlt] = useState(media.alt ?? "");
  const [crop, setCrop] = useState<CropPreset>("free");
  const [removeBg, setRemoveBg] = useState(false);
  const [copied, setCopied] = useState(false);

  const isImage = media.kind === "image" && media.cloudinary_public_id;
  const isYoutube = media.kind === "youtube" && media.cloudinary_public_id;

  // Build a preview URL with the user's chosen transforms
  const previewSrc = isImage
    ? cldUrl(media.cloudinary_public_id!, {
        crop: crop === "free" ? undefined : crop,
        removeBackground: removeBg,
        width: 720,
      })
    : isYoutube
      ? youTubeThumbnail(media.cloudinary_public_id!)
      : media.url;

  // The URL the user copies — at delivery resolution (1920w default)
  const deliverableUrl = isImage
    ? cldUrl(media.cloudinary_public_id!, {
        crop: crop === "free" ? undefined : crop,
        removeBackground: removeBg,
        width: 1920,
      })
    : media.url;

  function handleSaveAlt() {
    startTransition(async () => {
      await updateMediaAlt(media.id, alt);
      setEditingAlt(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Delete this media item from the library? Any pages still using it will fall back to defaults.")) {
      return;
    }
    startTransition(async () => {
      await deleteMedia(media.id);
      router.refresh();
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(deliverableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div
      className={cn(
        "admin-card overflow-hidden flex flex-col transition-shadow",
        selected && "ring-2 ring-navy ring-offset-2 ring-offset-cream/20",
      )}
    >
      {/* Preview */}
      <div className="relative aspect-[4/3] bg-[repeating-conic-gradient(#0001_0%_25%,transparent_0%_50%)] bg-[length:20px_20px] flex items-center justify-center">
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt={media.alt ?? ""}
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <div className="text-ink/40 text-xs">No preview</div>
        )}
        <div className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] bg-black/60 text-white px-2 py-1 rounded">
          {isYoutube ? (
            <>
              <Youtube size={11} /> YouTube
            </>
          ) : (
            <>
              <ImageIcon size={11} /> Image
            </>
          )}
        </div>
        {onToggleSelected && (
          <button
            type="button"
            onClick={() => onToggleSelected(media.id)}
            className={cn(
              "absolute top-2 right-2 w-6 h-6 rounded-md border flex items-center justify-center transition",
              selected
                ? "bg-navy border-navy text-white"
                : "bg-white/90 border-black/15 text-transparent hover:border-navy/60 hover:text-navy/40",
            )}
            title={selected ? "Deselect" : "Select"}
            aria-pressed={selected}
          >
            <Check size={14} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Alt text */}
        <div>
          <label className="admin-label !mb-1.5">Alt text</label>
          {editingAlt ? (
            <div className="flex gap-1.5">
              <input
                type="text"
                className="admin-input flex-1"
                autoFocus
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Describe the image"
              />
              <button
                type="button"
                onClick={handleSaveAlt}
                disabled={pending}
                className="admin-btn !py-2 !px-3"
              >
                <Check size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingAlt(true)}
              className="text-xs text-ink/75 hover:text-ink flex items-center gap-1.5 group"
            >
              <span className="truncate">{media.alt || <em className="text-ink/40">— add description</em>}</span>
              <Pencil size={11} className="text-ink/40 group-hover:text-navy shrink-0" />
            </button>
          )}
        </div>

        {/* Image-only controls — crop preset + bg removal */}
        {isImage && (
          <>
            <div>
              <label className="admin-label !mb-1.5 flex items-center gap-1.5">
                <Crop size={11} /> Crop
              </label>
              <div className="flex flex-wrap gap-1">
                {CROP_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setCrop(p.key)}
                    className={cn(
                      "text-[11px] px-2 py-1 rounded border",
                      crop === p.key
                        ? "bg-navy text-white border-navy"
                        : "bg-white text-ink/70 border-black/10 hover:border-navy/40",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-ink/75 cursor-pointer">
              <input
                type="checkbox"
                checked={removeBg}
                onChange={(e) => setRemoveBg(e.target.checked)}
                className="rounded"
              />
              <Wand2 size={12} className="text-ink/55" /> Remove background
            </label>
            {removeBg && (
              <p className="text-[10px] text-ink/45 -mt-2 ml-1">
                Cloudinary AI add-on. May take a few seconds first time.
              </p>
            )}
          </>
        )}

        {/* Footer actions */}
        <div className="mt-auto pt-3 border-t border-black/8 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-[11px] text-ink/70 hover:text-navy"
            title="Copy delivery URL"
          >
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy URL"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-[11px] text-ink/55 hover:text-red-600"
            title="Delete"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
