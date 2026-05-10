"use client";

/**
 * VideoPicker — pick a YouTube clip from the Media Library to use as a
 * background video. Stored value is `{ media_id: <uuid> }`.
 *
 * Only YouTube media rows are listed (kind="youtube"). To add a new clip,
 * use the "Add YouTube background" button on the Media Library page.
 */

import { useState } from "react";
import Link from "next/link";
import { Youtube, X, Check, Plus } from "lucide-react";
import { youTubeThumbnail } from "@/lib/cloudinary";
import { cn } from "@/lib/cn";

export type VideoLibraryItem = {
  id: string;
  cloudinary_public_id: string | null; // for YouTube rows this is the video ID
  url: string;
  alt: string | null;
  kind: "image" | "youtube";
};

export default function VideoPicker({
  value,
  onChange,
  library,
  label = "Video",
  fallbackYouTubeId,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  library: VideoLibraryItem[];
  label?: string;
  fallbackYouTubeId?: string;
}) {
  const [browsing, setBrowsing] = useState(false);
  const youtubeOnly = library.filter((m) => m.kind === "youtube");
  const selected = youtubeOnly.find((m) => m.id === value);
  const previewId = selected?.cloudinary_public_id ?? fallbackYouTubeId ?? null;
  const previewSrc = previewId ? youTubeThumbnail(previewId) : null;
  const showingFallback = !selected && Boolean(fallbackYouTubeId);

  return (
    <div>
      <label className="admin-label">{label}</label>

      <div className="admin-card overflow-hidden">
        <div className="relative aspect-[16/9] bg-black/80 flex items-center justify-center">
          {previewSrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt={selected?.alt ?? ""}
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
              <div className="relative inline-flex w-14 h-14 rounded-full bg-white/95 items-center justify-center">
                <Youtube size={22} className="text-red-600" strokeWidth={2} />
              </div>
            </>
          ) : (
            <div className="text-white/60 text-xs flex flex-col items-center gap-2">
              <Youtube size={28} strokeWidth={1.25} />
              No video selected.
            </div>
          )}
          {showingFallback && (
            <div className="absolute top-2 left-2 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded">
              Default — pick another to replace
            </div>
          )}
          {selected && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white text-ink/70 hover:text-red-600 rounded-full p-1.5 shadow"
              title="Remove"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="p-3 flex items-center justify-between gap-2 border-t border-black/8">
          <button
            type="button"
            onClick={() => setBrowsing(true)}
            className="text-xs text-navy hover:underline inline-flex items-center gap-1.5"
          >
            <Youtube size={13} /> Pick from library
          </button>
          <Link
            href="/admin/media"
            target="_blank"
            className="text-xs text-navy hover:underline inline-flex items-center gap-1.5"
          >
            <Plus size={13} />
            Add YouTube clip
          </Link>
        </div>
      </div>

      {browsing && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
          onClick={(e) => e.target === e.currentTarget && setBrowsing(false)}
        >
          <div className="bg-white rounded-md max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between">
              <h3 className="text-sm" style={{ fontWeight: 500 }}>
                Pick a YouTube video
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
              {youtubeOnly.length === 0 ? (
                <p className="text-sm text-ink/55 text-center py-12">
                  No YouTube videos yet. Add one from{" "}
                  <Link
                    href="/admin/media"
                    target="_blank"
                    className="text-navy underline"
                  >
                    Media Library
                  </Link>
                  &nbsp;→ &ldquo;Add YouTube background.&rdquo;
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {youtubeOnly.map((m) => {
                    const id = m.cloudinary_public_id;
                    const src = id ? youTubeThumbnail(id) : m.url;
                    const isSelected = value === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onChange(m.id);
                          setBrowsing(false);
                        }}
                        className={cn(
                          "relative aspect-video overflow-hidden rounded border bg-black/80",
                          isSelected
                            ? "border-navy ring-2 ring-navy/40"
                            : "border-black/10 hover:border-navy/40",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={m.alt ?? ""}
                          className="absolute inset-0 w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="inline-flex w-10 h-10 rounded-full bg-white/95 items-center justify-center">
                            <Youtube size={16} className="text-red-600" strokeWidth={2} />
                          </div>
                        </div>
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
