"use client";

/**
 * ImagePicker — pick an image from the Media Library or upload a new one,
 * then optionally fine-tune the crop with the in-place CropEditor.
 *
 *   <ImagePicker
 *     value={imageId}
 *     onChange={setImageId}
 *     cropArea={cropArea}
 *     onCropAreaChange={setCropArea}
 *     library={mediaRows}
 *     crop="wide"
 *   />
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, X, Check, Upload, Crop as CropIcon } from "lucide-react";
import {
  cldUrl,
  cloudinaryConfigured,
  uploadToCloudinary,
  type CropPreset,
} from "@/lib/cloudinary";
import { saveImageRecord } from "@/app/admin/media/actions";
import CropEditor, { type CropArea } from "./CropEditor";
import { cn } from "@/lib/cn";

export type LibraryItem = {
  id: string;
  cloudinary_public_id: string | null;
  url: string;
  alt: string | null;
};

export default function ImagePicker({
  value,
  onChange,
  cropArea,
  onCropAreaChange,
  library,
  crop = "wide",
  previewShape = "rect",
  label = "Image",
  emptyText = "No image selected.",
  fallbackUrl,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  /** Current user-applied crop window (0–1 percentages). */
  cropArea?: CropArea | null;
  /** Persist a new crop window. Pass null to clear (Cloudinary smart-crop
   *  takes over). Optional — if omitted, the "Adjust crop" UI is hidden. */
  onCropAreaChange?: (crop: CropArea | null) => void;
  library: LibraryItem[];
  crop?: CropPreset;
  /** Cosmetic preview frame — "circle" masks the preview to a circle. */
  previewShape?: "rect" | "circle";
  label?: string;
  emptyText?: string;
  /** URL to preview when no image has been picked yet — usually the page's
   *  current default so admins see what they're about to replace. */
  fallbackUrl?: string;
}) {
  const router = useRouter();
  const [browsing, setBrowsing] = useState(false);
  const [editingCrop, setEditingCrop] = useState(false);
  const [, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = library.find((m) => m.id === value);
  const previewSrc = selected?.cloudinary_public_id
    ? cldUrl(selected.cloudinary_public_id, {
        crop,
        width: 720,
        cropArea: cropArea ?? undefined,
      })
    : (selected?.url ?? fallbackUrl ?? null);
  const showingFallback = !selected && Boolean(fallbackUrl);

  // Source URL fed to the Crop Editor — the unmodified original (no preset
  // aspect-fill, no user crop, just delivery format)
  const cropSourceUrl = selected?.cloudinary_public_id
    ? cldUrl(selected.cloudinary_public_id, { width: 1600 })
    : selected?.url ?? null;

  async function handleUpload(file: File) {
    if (!cloudinaryConfigured()) {
      setError("Cloudinary isn't configured — add env vars and restart.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const res = await uploadToCloudinary(file);
      const save = await saveImageRecord({
        publicId: res.public_id,
        url: res.secure_url,
        width: res.width,
        height: res.height,
      });
      if (!save.ok) throw new Error(save.error);
      // Reset any prior crop when a new image is uploaded
      onCropAreaChange?.(null);
      onChange(save.id);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="admin-label">{label}</label>

      {/* Selected preview */}
      <div className="admin-card overflow-hidden">
        <div
          className={cn(
            "relative bg-[repeating-conic-gradient(#0001_0%_25%,transparent_0%_50%)] bg-[length:20px_20px] flex items-center justify-center",
            previewShape === "circle" ? "aspect-square p-6" : "aspect-[16/9]",
          )}
        >
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={selected?.alt ?? ""}
              className={cn(
                previewShape === "circle"
                  ? "relative w-32 h-32 md:w-40 md:h-40 rounded-full object-cover ring-2 ring-white/70 shadow-lg"
                  : "absolute inset-0 w-full h-full object-cover",
              )}
            />
          ) : (
            <div className="text-ink/50 text-xs flex flex-col items-center gap-2">
              <ImageIcon size={28} strokeWidth={1.25} />
              {emptyText}
            </div>
          )}
          {showingFallback && (
            <div className="absolute top-2 left-2 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded">
              Default — pick or upload to replace
            </div>
          )}
          {selected && cropArea && (
            <div className="absolute bottom-2 left-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded inline-flex items-center gap-1">
              <CropIcon size={10} /> Custom crop
            </div>
          )}
          {selected && (
            <button
              type="button"
              onClick={() => {
                onCropAreaChange?.(null);
                onChange(null);
              }}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white text-ink/70 hover:text-red-600 rounded-full p-1.5 shadow"
              title="Remove"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="p-3 flex items-center justify-between gap-2 border-t border-black/8 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setBrowsing(true)}
              className="text-xs text-navy hover:underline inline-flex items-center gap-1.5"
            >
              <ImageIcon size={13} /> Pick from library
            </button>
            <label className="text-xs text-navy hover:underline inline-flex items-center gap-1.5 cursor-pointer">
              <Upload size={13} />
              {uploading ? "Uploading…" : "Upload new"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {selected && onCropAreaChange && cropSourceUrl && (
            <button
              type="button"
              onClick={() => setEditingCrop(true)}
              className="text-xs text-navy hover:underline inline-flex items-center gap-1.5"
              title="Drag + zoom to fine-tune the framing"
            >
              <CropIcon size={13} /> Adjust crop
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-700 mt-1.5">{error}</p>
      )}

      {/* Crop editor modal */}
      {editingCrop && cropSourceUrl && (
        <CropEditor
          imageSrc={cropSourceUrl}
          initialCrop={cropArea ?? undefined}
          cropPreset={crop}
          onSave={(next) => {
            onCropAreaChange?.(next);
            setEditingCrop(false);
          }}
          onCancel={() => setEditingCrop(false)}
        />
      )}

      {/* Browse modal */}
      {browsing && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
          onClick={(e) => e.target === e.currentTarget && setBrowsing(false)}
        >
          <div className="bg-white rounded-md max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between">
              <h3 className="text-sm" style={{ fontWeight: 500 }}>
                Pick from Media Library
              </h3>
              <button
                type="button"
                onClick={() => setBrowsing(false)}
                className="text-ink/55 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {library.length === 0 ? (
                <p className="text-sm text-ink/55 text-center py-12">
                  No images uploaded yet. Use &ldquo;Upload new&rdquo; on the
                  picker, or visit{" "}
                  <a
                    href="/admin/media"
                    target="_blank"
                    className="text-navy underline"
                  >
                    Media Library
                  </a>
                  .
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {library.map((m) => {
                    const src = m.cloudinary_public_id
                      ? cldUrl(m.cloudinary_public_id, { crop, width: 480 })
                      : m.url;
                    const isSelected = value === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          // Clear any previous user crop when a new image is picked
                          if (m.id !== value) {
                            onCropAreaChange?.(null);
                          }
                          onChange(m.id);
                          setBrowsing(false);
                        }}
                        className={cn(
                          "relative aspect-[16/9] overflow-hidden rounded border bg-black/5",
                          isSelected
                            ? "border-navy ring-2 ring-navy/40"
                            : "border-black/10 hover:border-navy/40",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={m.alt ?? ""}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 bg-navy text-white rounded-full p-1">
                            <Check size={12} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
