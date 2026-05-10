"use client";

/**
 * Auto-rendered form fields driven by `lib/contentRegistry.ts` shapes.
 *
 * Every editable section in the admin uses this. New section types only need
 * to add a primitive to the `Field` union — no per-section UI needed.
 */

import { createContext, useContext, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, GripVertical } from "lucide-react";
import type { Field } from "@/lib/contentRegistry";
import ImagePicker, {
  type LibraryItem,
} from "@/components/admin/media/ImagePicker";
import VideoPicker, {
  type VideoLibraryItem,
} from "@/components/admin/media/VideoPicker";
import { cn } from "@/lib/cn";

/**
 * The Media Library is fetched once at the top of the section editor and
 * passed down to every image/video field via context (avoids prop drilling).
 * Image rows and YouTube rows live in the same `media` table — pickers
 * filter by `kind` themselves.
 */
const MediaLibraryContext = createContext<VideoLibraryItem[]>([]);

export function MediaLibraryProvider({
  library,
  children,
}: {
  library: VideoLibraryItem[];
  children: React.ReactNode;
}) {
  return (
    <MediaLibraryContext.Provider value={library}>
      {children}
    </MediaLibraryContext.Provider>
  );
}

type FieldRendererProps = {
  field: Field;
  value: unknown;
  onChange: (next: unknown) => void;
  /** Visual depth for indentation/styling */
  depth?: number;
};

export function FieldRenderer({ field, value, onChange, depth = 0 }: FieldRendererProps) {
  switch (field.type) {
    case "text":
    case "url":
      return (
        <div>
          <label className="admin-label">{field.label}</label>
          <input
            type={field.type === "url" ? "text" : "text"}
            className="admin-input"
            value={asString(value)}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.help && <p className="text-[11px] text-ink/50 mt-1.5">{field.help}</p>}
        </div>
      );

    case "paragraph":
      return (
        <div>
          <label className="admin-label">{field.label}</label>
          <textarea
            className="admin-input"
            rows={field.rows ?? 4}
            value={asString(value)}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.help && <p className="text-[11px] text-ink/50 mt-1.5">{field.help}</p>}
        </div>
      );

    case "list":
      return (
        <ListField
          field={field}
          value={asArray(value)}
          onChange={onChange}
          depth={depth}
        />
      );

    case "object":
      return (
        <ObjectField
          field={field}
          value={asRecord(value)}
          onChange={onChange}
          depth={depth}
        />
      );

    case "array":
      return (
        <ArrayField
          field={field}
          value={asArray(value)}
          onChange={onChange}
          depth={depth}
        />
      );

    case "image":
      return <ImageField field={field} value={value} onChange={onChange} />;

    case "video":
      return <VideoField field={field} value={value} onChange={onChange} />;
  }
}

// =============================================================================
// IMAGE — pick from media library, stored as { image_id: <uuid> }
// =============================================================================
function ImageField({
  field,
  value,
  onChange,
}: {
  field: Extract<Field, { type: "image" }>;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const library = useContext(MediaLibraryContext);
  const record = asRecord(value);
  const imageId = typeof record.image_id === "string" ? record.image_id : null;
  const ca = record.cropArea;
  const cropArea =
    ca &&
    typeof ca === "object" &&
    !Array.isArray(ca) &&
    typeof (ca as Record<string, unknown>).x === "number" &&
    typeof (ca as Record<string, unknown>).y === "number" &&
    typeof (ca as Record<string, unknown>).width === "number" &&
    typeof (ca as Record<string, unknown>).height === "number"
      ? (ca as { x: number; y: number; width: number; height: number })
      : null;

  return (
    <ImagePicker
      label={field.label}
      crop={field.crop ?? "free"}
      previewShape={field.previewShape}
      value={imageId}
      onChange={(id) =>
        onChange({ image_id: id, cropArea: cropArea ?? undefined })
      }
      cropArea={cropArea}
      onCropAreaChange={(next) =>
        onChange({ image_id: imageId, cropArea: next ?? undefined })
      }
      library={library.filter((m) => m.kind === "image")}
      emptyText={field.help ?? "No image selected — upload or pick from library."}
      fallbackUrl={field.fallback}
    />
  );
}

function VideoField({
  field,
  value,
  onChange,
}: {
  field: Extract<Field, { type: "video" }>;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const library = useContext(MediaLibraryContext);
  const record = asRecord(value);
  const mediaId = typeof record.media_id === "string" ? record.media_id : null;
  return (
    <VideoPicker
      label={field.label}
      value={mediaId}
      onChange={(id) => onChange({ media_id: id })}
      library={library}
      fallbackYouTubeId={field.fallbackYouTubeId}
    />
  );
}

// =============================================================================
// LIST — ordered list of strings (text or paragraph)
// =============================================================================
function ListField({
  field,
  value,
  onChange,
  depth,
}: {
  field: Extract<Field, { type: "list" }>;
  value: unknown[];
  onChange: (next: unknown) => void;
  depth: number;
}) {
  const items = value.map(asString);

  function update(i: number, next: string) {
    const copy = [...items];
    copy[i] = next;
    onChange(copy);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  }
  function add() {
    onChange([...items, ""]);
  }

  return (
    <div className={cn("space-y-2", depth > 0 && "ml-1")}>
      <label className="admin-label">{field.label}</label>
      {items.length === 0 && (
        <p className="text-xs text-ink/45 italic">No items yet.</p>
      )}
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex flex-col gap-1 pt-2">
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="text-ink/40 hover:text-ink disabled:opacity-30"
              title="Move up"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === items.length - 1}
              className="text-ink/40 hover:text-ink disabled:opacity-30"
              title="Move down"
            >
              <ChevronDown size={14} />
            </button>
          </div>
          {field.itemType === "paragraph" ? (
            <textarea
              rows={3}
              className="admin-input flex-1"
              value={item}
              onChange={(e) => update(i, e.target.value)}
            />
          ) : (
            <input
              type="text"
              className="admin-input flex-1"
              value={item}
              onChange={(e) => update(i, e.target.value)}
            />
          )}
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-ink/40 hover:text-red-600 mt-2.5"
            title="Remove"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 text-xs text-navy hover:underline"
      >
        <Plus size={14} /> Add item
      </button>
      {field.help && <p className="text-[11px] text-ink/50 mt-1.5">{field.help}</p>}
    </div>
  );
}

// =============================================================================
// OBJECT — fixed-shape record (e.g., a CTA: { label, href })
// =============================================================================
function ObjectField({
  field,
  value,
  onChange,
  depth,
}: {
  field: Extract<Field, { type: "object" }>;
  value: Record<string, unknown>;
  onChange: (next: unknown) => void;
  depth: number;
}) {
  return (
    <fieldset
      className={cn(
        "border border-black/10 rounded-md p-4 space-y-4",
        depth > 0 && "bg-black/[0.015]",
      )}
    >
      <legend className="admin-label px-1.5">{field.label}</legend>
      {Object.entries(field.shape).map(([childKey, childField]) => (
        <FieldRenderer
          key={childKey}
          field={childField}
          value={value?.[childKey]}
          onChange={(next) => onChange({ ...value, [childKey]: next })}
          depth={depth + 1}
        />
      ))}
      {field.help && <p className="text-[11px] text-ink/50">{field.help}</p>}
    </fieldset>
  );
}

// =============================================================================
// ARRAY — ordered list of objects (cards, steps, faqs, stats…)
// =============================================================================
function ArrayField({
  field,
  value,
  onChange,
  depth,
}: {
  field: Extract<Field, { type: "array" }>;
  value: unknown[];
  onChange: (next: unknown) => void;
  depth: number;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  function update(i: number, next: Record<string, unknown>) {
    const copy = [...value];
    copy[i] = next;
    onChange(copy);
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
    setOpenIdx(null);
  }
  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= value.length) return;
    const copy = [...value];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
    setOpenIdx(j);
  }
  function add() {
    const empty: Record<string, unknown> = {};
    Object.keys(field.itemShape).forEach((k) => (empty[k] = ""));
    onChange([...value, empty]);
    setOpenIdx(value.length);
  }

  return (
    <div className={cn("space-y-2", depth > 0 && "ml-1")}>
      <div className="flex items-center justify-between">
        <label className="admin-label !mb-0">{field.label}</label>
        <span className="text-[11px] text-ink/45">
          {value.length} {value.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="space-y-2">
        {value.map((rawItem, i) => {
          const item = asRecord(rawItem);
          const open = openIdx === i;
          const titleField = field.itemTitleField;
          const collapsed =
            titleField && item[titleField]
              ? asString(item[titleField]).slice(0, 80)
              : `${field.itemNoun ?? "Item"} ${i + 1}`;

          return (
            <div key={i} className="border border-black/10 rounded-md bg-white">
              <div className="flex items-center gap-2 p-3">
                <GripVertical size={14} className="text-ink/30 shrink-0" />
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="flex-1 text-left text-sm text-ink/85 hover:text-ink truncate"
                >
                  {collapsed || `${field.itemNoun ?? "Item"} ${i + 1}`}
                </button>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-ink/40 hover:text-ink disabled:opacity-20"
                  title="Move up"
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  className="text-ink/40 hover:text-ink disabled:opacity-20"
                  title="Move down"
                >
                  <ChevronDown size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-ink/40 hover:text-red-600"
                  title="Remove"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {open && (
                <div className="border-t border-black/8 p-4 space-y-4 bg-black/[0.015]">
                  {Object.entries(field.itemShape).map(([childKey, childField]) => (
                    <FieldRenderer
                      key={childKey}
                      field={childField}
                      value={item[childKey]}
                      onChange={(next) => update(i, { ...item, [childKey]: next })}
                      depth={depth + 1}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 text-xs text-navy hover:underline mt-1"
      >
        <Plus size={14} /> Add {field.itemNoun ?? "Item"}
      </button>
      {field.help && <p className="text-[11px] text-ink/50 mt-1.5">{field.help}</p>}
    </div>
  );
}

// =============================================================================
// helpers
// =============================================================================
function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}
