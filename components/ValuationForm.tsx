"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { submitBuiltInForm } from "@/app/admin/forms/actions";

export default function ValuationForm({
  realtorName,
}: {
  /** Tenant realtor's display name — woven into the post-submit copy.
   *  Falls back to a neutral phrasing when empty so non-Samina tenants
   *  don't see "Samina will review…". */
  realtorName?: string;
}) {
  const firstName = realtorName?.trim().split(/\s+/)[0] || "We";
  const [v, setV] = useState({
    address: "",
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof v>(k: K, val: string) {
    setV((p) => ({ ...p, [k]: val }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await submitBuiltInForm({
        source: "sellers-valuation",
        data: { ...v, message: v.notes },
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
      <div className="glass-light p-8 md:p-12 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-5">
          <Check size={22} className="text-emerald-700" strokeWidth={1.5} />
        </div>
        <p className="text-base md:text-lg text-ink leading-[1.85] font-light">
          Got it — {firstName} will review your property and respond within 24
          hours.
        </p>
      </div>
    );
  }

  const fields = [
    {
      l: "Property Address",
      k: "address" as const,
      t: "text",
      p: "1234 Main St, Woodbridge, VA 22192",
      req: true,
    },
    { l: "Your Name", k: "name" as const, t: "text", p: "", req: true },
    { l: "Email", k: "email" as const, t: "email", p: "", req: true },
    { l: "Phone", k: "phone" as const, t: "tel", p: "", req: false },
  ];

  return (
    <form onSubmit={submit} className="glass-light p-7 md:p-14 space-y-12">
      {fields.map((f) => (
        <div key={f.l}>
          <label className="block eyebrow mb-4">{f.l}</label>
          <input
            type={f.t}
            placeholder={f.p}
            required={f.req}
            value={v[f.k]}
            onChange={(e) => set(f.k, e.target.value)}
            className="w-full bg-transparent border-b border-ink/25 py-3 text-lg font-light placeholder:text-ink-subtle focus:outline-none focus:border-navy transition-colors"
          />
        </div>
      ))}
      <div>
        <label className="block eyebrow mb-4">Anything I should know?</label>
        <textarea
          rows={4}
          placeholder="Recent renovations, timing, special features, etc."
          value={v.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="w-full bg-transparent border-b border-ink/25 py-3 text-base font-light placeholder:text-ink-subtle focus:outline-none focus:border-navy transition-colors resize-none"
        />
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="pt-4">
        <button type="submit" disabled={pending} className="btn-solid">
          {pending ? "Sending…" : "Get My Valuation"}
        </button>
        <p className="mt-6 text-xs text-ink-subtle italic">
          Typical response time: within 24 hours.
        </p>
      </div>
    </form>
  );
}
