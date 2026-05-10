"use client";

/**
 * Interactive crop editor — opens as a modal over the image picker.
 * Drag to reposition, scroll/pinch/slider to zoom, save persists the
 * crop coordinates as percentages of the source image (0–1).
 *
 * The chosen crop is later applied at delivery time via Cloudinary's
 * `c_crop,x_<x>,y_<y>,w_<w>,h_<h>` URL transform — the original media is
 * never modified, so admins can re-crop later or remove the crop entirely.
 */

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { X, Save, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";

export type CropArea = {
  /** All four are 0–1, percentages of source image dimensions */
  x: number;
  y: number;
  width: number;
  height: number;
};

const ASPECT_RATIOS: Record<
  "square" | "portrait" | "landscape" | "wide" | "free",
  number | undefined
> = {
  square: 1,
  portrait: 3 / 4,
  landscape: 4 / 3,
  wide: 16 / 9,
  free: undefined,
};

export default function CropEditor({
  imageSrc,
  initialCrop,
  cropPreset = "free",
  onSave,
  onCancel,
}: {
  imageSrc: string;
  initialCrop?: CropArea;
  cropPreset?: "square" | "portrait" | "landscape" | "wide" | "free";
  onSave: (cropArea: CropArea | null) => void;
  onCancel: () => void;
}) {
  // react-easy-crop uses pixel offsets for `crop`; we convert to/from
  // percentage on save/load so storage is resolution-independent.
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(
    ASPECT_RATIOS[cropPreset],
  );

  const onCropComplete = useCallback(
    (croppedAreaPercentage: Area) => {
      // react-easy-crop's `croppedArea` is in percentages (0–100)
      setCroppedArea(croppedAreaPercentage);
    },
    [],
  );

  function handleSave() {
    if (!croppedArea) {
      onSave(null);
      return;
    }
    // Convert from 0–100 to 0–1 for storage + downstream Cloudinary URLs
    onSave({
      x: croppedArea.x / 100,
      y: croppedArea.y / 100,
      width: croppedArea.width / 100,
      height: croppedArea.height / 100,
    });
  }

  function reset() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAspect(ASPECT_RATIOS[cropPreset]);
  }

  // Initial crop position — convert stored percentages back to pixel offsets
  // for react-easy-crop's `initialCroppedAreaPercentages` prop
  const initialCroppedAreaPercentages = initialCrop
    ? {
        x: initialCrop.x * 100,
        y: initialCrop.y * 100,
        width: initialCrop.width * 100,
        height: initialCrop.height * 100,
      }
    : undefined;

  const ratioOptions = [
    { key: "free" as const, label: "Free" },
    { key: "square" as const, label: "1:1" },
    { key: "portrait" as const, label: "3:4" },
    { key: "landscape" as const, label: "4:3" },
    { key: "wide" as const, label: "16:9" },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-md w-full max-w-3xl max-h-[95vh] flex flex-col">
        {/* Header — fixed at top, never shrinks */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-black/10 flex items-center justify-between bg-white rounded-t-md">
          <h3 className="text-sm" style={{ fontWeight: 500 }}>
            Adjust crop
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-ink/55 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable middle: cropper canvas + controls. Shrinks first when
             viewport gets short so the footer always stays visible. */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Cropper canvas */}
          <div className="relative bg-black/90 h-[45vh] min-h-[280px]">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              initialCroppedAreaPercentages={initialCroppedAreaPercentages}
              objectFit="contain"
              showGrid
            />
          </div>

          {/* Controls */}
          <div className="p-5 space-y-4 border-t border-black/8 bg-white">
          {/* Aspect ratio chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-[0.18em] text-ink/55 mr-2">
              Aspect
            </span>
            {ratioOptions.map((r) => {
              const ratio = ASPECT_RATIOS[r.key];
              const active = aspect === ratio;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setAspect(ratio)}
                  className={`text-[11px] px-2.5 py-1 rounded border ${
                    active
                      ? "bg-navy text-white border-navy"
                      : "bg-white text-ink/70 border-black/10 hover:border-navy/40"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <ZoomOut size={14} className="text-ink/55" />
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-navy"
            />
            <ZoomIn size={14} className="text-ink/55" />
            <span className="text-[11px] text-ink/55 w-10 text-right">
              {zoom.toFixed(1)}×
            </span>
          </div>

          <p className="text-[11px] text-ink/45">
            Drag the photo to reposition. Use the slider to zoom in or out.
            Original photo is never modified — you can re-crop or reset later.
          </p>
          </div>
        </div>
        {/* end of scrollable middle */}

        {/* Footer actions — fixed at bottom, never shrinks, always tappable */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-black/10 flex items-center justify-between bg-white rounded-b-md flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-xs text-ink/65 hover:text-ink"
          >
            <RefreshCw size={13} /> Reset
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onSave(null);
              }}
              className="text-xs text-ink/65 hover:text-ink px-3 py-2"
              title="Remove user crop — Cloudinary smart-crop takes over"
            >
              Remove crop
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="admin-btn admin-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="admin-btn"
            >
              <Save size={14} className="mr-2" /> Save crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
