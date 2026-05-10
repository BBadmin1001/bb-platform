"use client";

/**
 * Lightweight multi-tag input. Type a value, hit Enter or "," to commit.
 * Click the × on a chip to remove. Optional `suggestions` are shown as
 * quick-add chips below the input — clicking one appends it.
 *
 * No external deps — small enough to be inlined here vs pulling react-select.
 */

import { useState, type KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Quick-add chips shown below the input. Clicking one appends. */
  suggestions?: string[];
  /** Optional cap (e.g. ZIPs ~5 digits). Default unlimited. */
  maxLength?: number;
  ariaLabel?: string;
}

export default function TagInput({
  value,
  onChange,
  placeholder,
  suggestions = [],
  maxLength,
  ariaLabel,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const tag = raw.trim().replace(/,$/, "").trim();
    if (!tag) return;
    if (value.includes(tag)) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      // Easy removal of the last chip
      onChange(value.slice(0, -1));
    }
  }

  function remove(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }

  const remainingSuggestions = suggestions.filter((s) => !value.includes(s));

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-md transition-colors"
        style={{
          background: "var(--card)",
          border: "1px solid var(--input)",
          minHeight: "44px",
        }}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
            style={{
              background: "color-mix(in srgb, var(--primary) 14%, transparent)",
              color: "var(--primary)",
              fontWeight: 600,
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="opacity-70 hover:opacity-100"
              aria-label={`Remove ${tag}`}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => commit(draft)}
          placeholder={value.length === 0 ? placeholder : ""}
          maxLength={maxLength}
          aria-label={ariaLabel}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
          style={{ color: "var(--card-foreground)" }}
        />
      </div>

      {remainingSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {remainingSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition"
              style={{
                background: "var(--card)",
                color: "var(--muted-foreground)",
                borderColor: "var(--border)",
              }}
            >
              <Plus size={10} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
