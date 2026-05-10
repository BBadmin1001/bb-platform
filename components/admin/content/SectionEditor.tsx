"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, RotateCcw, Check } from "lucide-react";
import type { SectionDef } from "@/lib/contentRegistry";
import { FieldRenderer, MediaLibraryProvider } from "./Fields";
import type { VideoLibraryItem } from "@/components/admin/media/VideoPicker";
import { saveSection } from "@/app/admin/content/actions";

export default function SectionEditor({
  section,
  initialValue,
  defaultValue,
  pageHref,
  library,
}: {
  section: SectionDef;
  initialValue: Record<string, unknown>;
  defaultValue: Record<string, unknown>;
  pageHref: string;
  library: VideoLibraryItem[];
}) {
  const router = useRouter();
  const [value, setValue] = useState<Record<string, unknown>>(initialValue);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveSection(section.page, section.key, JSON.stringify(value));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedAt(new Date());
      router.refresh();
    });
  }

  function handleResetToDefault() {
    if (
      !confirm(
        "Reset this section to its original copy? Your current edits will be saved to history but replaced.",
      )
    )
      return;
    setValue(defaultValue);
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
      <Link
        href={pageHref}
        className="inline-flex items-center gap-1.5 text-xs text-ink/55 hover:text-ink mb-6"
      >
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="mb-8">
        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3"
          style={{ fontWeight: 500 }}
        >
          {section.page} · {section.key}
        </p>
        <h1
          className="text-2xl md:text-3xl text-ink mb-2"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          {section.label}
        </h1>
        {section.description && (
          <p className="text-sm text-ink/65">{section.description}</p>
        )}
      </div>

      <div className="admin-card p-6 md:p-8 space-y-6">
        <MediaLibraryProvider library={library}>
          {Object.entries(section.shape).map(([key, field]) => (
            <FieldRenderer
              key={key}
              field={field}
              value={value[key]}
              onChange={(next) => setValue({ ...value, [key]: next })}
            />
          ))}
        </MediaLibraryProvider>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded mt-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mt-6 sticky bottom-4 bg-white border border-black/10 rounded-md p-3 shadow-sm">
        <div className="flex items-center gap-3 text-xs text-ink/60">
          {pending ? (
            <span>Saving…</span>
          ) : savedAt ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <Check size={14} /> Saved {timeAgo(savedAt)}
            </span>
          ) : (
            <span>Edits are saved when you click Save.</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-ink/65 hover:text-ink rounded hover:bg-black/5"
            title="Reset to original"
          >
            <RotateCcw size={13} /> Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="admin-btn"
          >
            <Save size={14} className="mr-2" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

function timeAgo(d: Date): string {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
}
