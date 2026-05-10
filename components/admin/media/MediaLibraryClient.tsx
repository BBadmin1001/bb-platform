"use client";

/**
 * Client wrapper around the media grid. Owns the multi-select state and the
 * sticky bulk-action bar that appears once anything is selected.
 *
 * Pure presentation/coordination — actual deletes go through the
 * `deleteMediaMany` server action.
 */

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X, CheckSquare, Square } from "lucide-react";
import MediaCard, { type MediaRow } from "./MediaCard";
import { deleteMediaMany } from "@/app/admin/media/actions";

export default function MediaLibraryClient({ items }: { items: MediaRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = items.length > 0 && selected.size === items.length;
  const selectedCount = selected.size;

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((m) => m.id)));
    }
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function handleBulkDelete() {
    if (selectedCount === 0) return;
    const msg =
      selectedCount === 1
        ? "Delete the selected item from the library? It will also be removed from Cloudinary to free storage."
        : `Delete ${selectedCount} items from the library? They will also be removed from Cloudinary to free storage.`;
    if (!confirm(msg)) return;

    startTransition(async () => {
      const res = await deleteMediaMany(selectedIds);
      setSelected(new Set());
      router.refresh();
      if (!res.ok && res.error) {
        alert(`Couldn't delete: ${res.error}`);
      } else if (res.failed > 0) {
        alert(
          `Deleted from the library, but ${res.failed} Cloudinary file(s) couldn't be removed. They may need a manual purge in the Cloudinary console.`,
        );
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <p className="text-xs text-ink/55 tracking-[0.18em] uppercase">
          Library · {items.length} item{items.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex items-center gap-1.5 text-[11px] text-ink/65 hover:text-navy"
        >
          {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
          {allSelected ? "Clear selection" : "Select all"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((m) => (
          <MediaCard
            key={m.id}
            media={m}
            selected={selected.has(m.id)}
            onToggleSelected={toggleOne}
          />
        ))}
      </div>

      {/* Sticky bulk-action bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 admin-card px-4 py-3 shadow-2xl border-navy/20 flex items-center gap-3 bg-white">
          <span className="text-sm text-ink">
            <strong style={{ fontWeight: 600 }}>{selectedCount}</strong> selected
          </span>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            style={{ fontWeight: 500 }}
          >
            <Trash2 size={13} />
            {pending ? "Deleting…" : "Delete selected"}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-md text-ink/70 hover:text-ink"
          >
            <X size={13} /> Cancel
          </button>
        </div>
      )}
    </>
  );
}
