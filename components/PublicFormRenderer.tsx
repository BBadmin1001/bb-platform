"use client";

import { useState, useTransition } from "react";
import { Send, Check } from "lucide-react";
import type { FormField } from "@/lib/forms";
import { submitFormPublic } from "@/app/admin/forms/actions";

export default function PublicFormRenderer({
  formId,
  slug,
  fields,
  submitLabel,
  successMessage,
}: {
  formId: string;
  slug: string;
  fields: FormField[];
  submitLabel: string;
  successMessage: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});

  function update(name: string, value: unknown) {
    setData((p) => ({ ...p, [name]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await submitFormPublic({
        formId,
        source: slug,
        data,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="bg-white rounded-md border border-emerald-200 p-10 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-5">
          <Check size={22} className="text-emerald-700" strokeWidth={1.5} />
        </div>
        <p className="text-base text-ink leading-relaxed">{successMessage}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-md border border-black/10 p-6 md:p-10 space-y-6"
    >
      {fields.map((f) => (
        <FieldInput
          key={f.name}
          field={f}
          value={data[f.name]}
          onChange={(v) => update(f.name, v)}
        />
      ))}

      {error && <p className="text-xs text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center px-7 py-3 bg-navy text-white text-sm rounded hover:bg-navy-dark disabled:opacity-50"
        style={{ fontWeight: 500, letterSpacing: "0.04em" }}
      >
        <Send size={14} className="mr-2" />
        {pending ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const baseClasses =
    "w-full p-3 border border-black/15 rounded text-sm focus:outline-none focus:border-navy";

  const labelEl = (
    <label
      className="text-xs uppercase tracking-[0.18em] text-ink/55 block mb-2"
      style={{ fontWeight: 500 }}
    >
      {field.label}
      {field.required && <span className="text-red-600 ml-1">*</span>}
    </label>
  );

  switch (field.type) {
    case "textarea":
      return (
        <div>
          {labelEl}
          <textarea
            required={field.required}
            rows={5}
            className={baseClasses}
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.help && (
            <p className="text-[11px] text-ink/45 mt-1">{field.help}</p>
          )}
        </div>
      );
    case "select":
      return (
        <div>
          {labelEl}
          <select
            required={field.required}
            className={baseClasses}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select…</option>
            {(field.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {field.help && (
            <p className="text-[11px] text-ink/45 mt-1">{field.help}</p>
          )}
        </div>
      );
    case "radio":
      return (
        <div>
          {labelEl}
          <div className="space-y-1.5">
            {(field.options ?? []).map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={field.name}
                  value={o.value}
                  required={field.required}
                  checked={value === o.value}
                  onChange={() => onChange(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      );
    case "checkbox":
      return (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-1"
            required={field.required}
          />
          <span className="text-sm text-ink/75">
            {field.label}
            {field.required && <span className="text-red-600 ml-1">*</span>}
            {field.help && (
              <span className="block text-[11px] text-ink/45 mt-0.5">
                {field.help}
              </span>
            )}
          </span>
        </label>
      );
    default: {
      const inputType =
        field.type === "phone"
          ? "tel"
          : field.type === "url"
            ? "url"
            : field.type === "number"
              ? "number"
              : field.type === "date"
                ? "date"
                : field.type === "email"
                  ? "email"
                  : "text";
      return (
        <div>
          {labelEl}
          <input
            type={inputType}
            required={field.required}
            className={baseClasses}
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.help && (
            <p className="text-[11px] text-ink/45 mt-1">{field.help}</p>
          )}
        </div>
      );
    }
  }
}
