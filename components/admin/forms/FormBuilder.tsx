"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  Pencil,
  X,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import {
  upsertForm,
  deleteForm,
  type FormInput,
} from "@/app/admin/forms/actions";
import {
  fieldNameFromLabel,
  FIELD_TYPE_LABELS,
  type FormField,
  type FormFieldType,
} from "@/lib/forms";

export default function FormBuilder({
  existingId,
  initial,
}: {
  existingId?: string;
  initial: FormInput;
}) {
  const router = useRouter();
  const [v, setV] = useState<FormInput>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingFieldIdx, setEditingFieldIdx] = useState<number | null>(null);
  const [addingField, setAddingField] = useState(false);
  const [copied, setCopied] = useState(false);

  function set<K extends keyof FormInput>(k: K, val: FormInput[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  function moveField(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= v.fields.length) return;
    const next = [...v.fields];
    [next[i], next[j]] = [next[j], next[i]];
    set("fields", next);
  }
  function removeField(i: number) {
    if (!confirm("Delete this field?")) return;
    set(
      "fields",
      v.fields.filter((_, idx) => idx !== i),
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await upsertForm(v, existingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (!existingId) {
        router.push(`/admin/forms/${res.slug ?? v.slug}`);
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!existingId) return;
    if (!confirm(`Delete ${v.title || "this form"}? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteForm(existingId);
      router.push("/admin/forms");
      router.refresh();
    });
  }

  async function copyShareLink() {
    if (!v.slug) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/form/${v.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
      <Link
        href="/admin/forms"
        className="inline-flex items-center gap-1.5 text-xs text-ink/55 hover:text-ink mb-6"
      >
        <ArrowLeft size={14} /> All forms
      </Link>

      <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
        <div>
          <p
            className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3"
            style={{ fontWeight: 500 }}
          >
            {existingId ? "Edit Form" : "New Form"}
          </p>
          <h1
            className="text-2xl md:text-3xl text-ink mb-2"
            style={{ fontWeight: 600, letterSpacing: "0.01em" }}
          >
            {v.title || "Untitled form"}
          </h1>
          {existingId && v.slug && (
            <div className="flex items-center gap-3 text-xs text-ink/65">
              <code className="text-[11px] bg-black/5 px-1.5 py-0.5 rounded">
                /form/{v.slug}
              </code>
              <button
                type="button"
                onClick={copyShareLink}
                className="inline-flex items-center gap-1 text-navy hover:underline"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <a
                href={`/form/${v.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-navy hover:underline"
              >
                <ExternalLink size={12} /> Preview
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Basics */}
        <div className="admin-card p-6 space-y-4">
          <h2 className="text-xs tracking-[0.18em] uppercase text-ink/55" style={{ fontWeight: 500 }}>
            Basics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Title</label>
              <input
                className="admin-input"
                value={v.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Buyer Questionnaire"
              />
            </div>
            <div>
              <label className="admin-label">Slug (URL)</label>
              <input
                className="admin-input"
                value={v.slug}
                onChange={(e) =>
                  set(
                    "slug",
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]+/g, "-")
                      .replace(/^-+|-+$/g, ""),
                  )
                }
                placeholder="buyer-questionnaire"
              />
            </div>
          </div>
          <div>
            <label className="admin-label">Description</label>
            <textarea
              rows={3}
              className="admin-input"
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="A short note shown above the form."
            />
          </div>
        </div>

        {/* Fields */}
        <div className="admin-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs tracking-[0.18em] uppercase text-ink/55" style={{ fontWeight: 500 }}>
              Fields
            </h2>
            <button
              type="button"
              onClick={() => setAddingField(true)}
              className="text-xs text-navy hover:underline inline-flex items-center gap-1"
            >
              <Plus size={13} /> Add field
            </button>
          </div>

          {v.fields.length === 0 ? (
            <p className="text-xs text-ink/45 italic">No fields yet.</p>
          ) : (
            <div className="space-y-2">
              {v.fields.map((f, i) => (
                <div
                  key={i}
                  className="border border-black/10 rounded-md p-3 flex items-center gap-3 bg-white"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveField(i, -1)}
                      disabled={i === 0}
                      className="text-ink/40 hover:text-ink disabled:opacity-30"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(i, 1)}
                      disabled={i === v.fields.length - 1}
                      className="text-ink/40 hover:text-ink disabled:opacity-30"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ fontWeight: 500 }}>
                      {f.label}{" "}
                      {f.required && <span className="text-red-600">*</span>}
                    </p>
                    <p className="text-[11px] text-ink/55">
                      <code className="text-[10px]">{f.name}</code> ·{" "}
                      {FIELD_TYPE_LABELS[f.type]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingFieldIdx(i)}
                      className="text-ink/55 hover:text-navy"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeField(i)}
                      className="text-ink/55 hover:text-red-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="admin-card p-6 space-y-4">
          <h2 className="text-xs tracking-[0.18em] uppercase text-ink/55" style={{ fontWeight: 500 }}>
            Submission
          </h2>
          <div>
            <label className="admin-label">Submit button label</label>
            <input
              className="admin-input"
              value={v.submit_label}
              onChange={(e) => set("submit_label", e.target.value)}
            />
          </div>
          <div>
            <label className="admin-label">Success message</label>
            <textarea
              rows={2}
              className="admin-input"
              value={v.success_message}
              onChange={(e) => set("success_message", e.target.value)}
            />
          </div>
          <div>
            <label className="admin-label">
              Notify email{" "}
              <span className="font-normal normal-case text-ink/45">
                (optional — gets a copy when someone submits)
              </span>
            </label>
            <input
              type="email"
              className="admin-input"
              value={v.notify_email ?? ""}
              onChange={(e) => set("notify_email", e.target.value || null)}
              placeholder="samina@example.com"
            />
          </div>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={v.is_published}
              onChange={(e) => set("is_published", e.target.checked)}
            />
            <span className="text-sm text-ink/75">
              Published — accessible at <code className="text-[11px]">/form/{v.slug || "[slug]"}</code>
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded mt-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mt-6 sticky bottom-4 bg-white border border-black/10 rounded-md p-3 shadow-sm">
        <div>
          {existingId && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-red-700 hover:text-red-800 rounded hover:bg-red-50"
            >
              <Trash2 size={13} /> Delete form
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/forms"
            className="px-4 py-2 text-xs text-ink/65 hover:text-ink rounded hover:bg-black/5"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={pending || !v.title || !v.slug}
            className="admin-btn"
          >
            <Save size={14} className="mr-2" /> Save
          </button>
        </div>
      </div>

      {(addingField || editingFieldIdx !== null) && (
        <FieldDialog
          existing={
            editingFieldIdx !== null ? v.fields[editingFieldIdx] : undefined
          }
          onClose={() => {
            setAddingField(false);
            setEditingFieldIdx(null);
          }}
          onSave={(field) => {
            if (editingFieldIdx !== null) {
              const next = [...v.fields];
              next[editingFieldIdx] = field;
              set("fields", next);
            } else {
              set("fields", [...v.fields, field]);
            }
            setAddingField(false);
            setEditingFieldIdx(null);
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// FIELD DIALOG
// =============================================================================
function FieldDialog({
  existing,
  onClose,
  onSave,
}: {
  existing?: FormField;
  onClose: () => void;
  onSave: (field: FormField) => void;
}) {
  const [label, setLabel] = useState(existing?.label ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState<FormFieldType>(existing?.type ?? "text");
  const [required, setRequired] = useState(existing?.required ?? false);
  const [placeholder, setPlaceholder] = useState(existing?.placeholder ?? "");
  const [help, setHelp] = useState(existing?.help ?? "");
  const [optionsText, setOptionsText] = useState(
    (existing?.options ?? []).map((o) => o.label).join("\n"),
  );
  const [error, setError] = useState<string | null>(null);

  function autoName() {
    if (label && (!name || !existing)) {
      setName(fieldNameFromLabel(label));
    }
  }

  function save() {
    if (!label) {
      setError("Label is required.");
      return;
    }
    const finalName = name || fieldNameFromLabel(label);
    const options =
      type === "select" || type === "radio"
        ? optionsText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => ({ value: s.toLowerCase().replace(/[^a-z0-9]+/g, "_"), label: s }))
        : undefined;
    onSave({
      label,
      name: finalName,
      type,
      required,
      placeholder: placeholder || undefined,
      help: help || undefined,
      options,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-md max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-sm" style={{ fontWeight: 500 }}>
            {existing ? "Edit field" : "Add field"}
          </h3>
          <button onClick={onClose} className="text-ink/55 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="admin-label">Label</label>
            <input
              className="admin-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={autoName}
              placeholder="Your phone"
            />
          </div>
          <div>
            <label className="admin-label">
              Field name{" "}
              <span className="font-normal normal-case text-ink/45">
                (key on the lead row)
              </span>
            </label>
            <input
              className="admin-input"
              value={name}
              onChange={(e) =>
                setName(e.target.value.replace(/[^a-z0-9_]+/gi, "_"))
              }
              placeholder="your_phone"
            />
          </div>
          <div>
            <label className="admin-label">Type</label>
            <select
              className="admin-input"
              value={type}
              onChange={(e) => setType(e.target.value as FormFieldType)}
            >
              {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          {(type === "select" || type === "radio") && (
            <div>
              <label className="admin-label">
                Options{" "}
                <span className="font-normal normal-case text-ink/45">
                  (one per line)
                </span>
              </label>
              <textarea
                rows={4}
                className="admin-input"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder={`First-time buyer\nMove-up buyer\nInvestor`}
              />
            </div>
          )}
          <div>
            <label className="admin-label">Placeholder</label>
            <input
              className="admin-input"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
            />
          </div>
          <div>
            <label className="admin-label">Help text</label>
            <input
              className="admin-input"
              value={help}
              onChange={(e) => setHelp(e.target.value)}
              placeholder="Shown below the input"
            />
          </div>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
            />
            <span className="text-sm text-ink/75">Required</span>
          </label>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-black/10 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="admin-btn admin-btn-secondary">
            Cancel
          </button>
          <button onClick={save} className="admin-btn">
            <Save size={14} className="mr-2" /> Save field
          </button>
        </div>
      </div>
    </div>
  );
}
