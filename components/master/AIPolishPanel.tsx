"use client";

import { useState, useTransition } from "react";
import { Sparkles, Wand2, Check, AlertCircle, Loader2 } from "lucide-react";
import { aiPolishMeet } from "@/app/master/tenants/actions";

/**
 * Master-side panel that runs AI polish on a tenant's home.meet
 * section. Shows the resulting headline as a confirmation so master
 * can verify the result without leaving the page.
 *
 * Phase 13 starts with home.meet only — the single most visible
 * paragraph of bespoke copy on a tenant site. Once master is
 * comfortable with the output we can extend to hero / about / etc.
 */
export default function AIPolishPanel({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await aiPolishMeet(slug);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.preview ?? "(applied)");
    });
  }

  return (
    <section className="admin-card p-6 mb-10">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{
            background: "color-mix(in srgb, var(--primary) 14%, transparent)",
            color: "var(--primary)",
          }}
        >
          <Wand2 size={14} strokeWidth={1.6} />
        </span>
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          AI polish
        </p>
      </div>

      <p
        className="text-sm mb-4"
        style={{ color: "var(--muted-foreground)", lineHeight: 1.6 }}
      >
        Click below to regenerate the home page&apos;s &ldquo;Meet
        [Realtor]&rdquo; section using the customer&apos;s intake data
        + house style rules. Replaces the current copy. You can always
        re-edit by hand from{" "}
        <code className="text-[11px]">/admin/content</code> on their
        tenant.
      </p>

      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="admin-btn inline-flex items-center"
        style={pending ? { opacity: 0.6 } : undefined}
      >
        {pending ? (
          <>
            <Loader2 size={13} className="mr-2 animate-spin" />
            Polishing…
          </>
        ) : (
          <>
            <Sparkles size={13} className="mr-2" />
            Polish &ldquo;Meet&rdquo; section
          </>
        )}
      </button>

      {result && (
        <div
          className="mt-4 p-3 rounded-md flex items-start gap-2 text-sm"
          style={{
            background:
              "color-mix(in srgb, var(--primary) 6%, var(--card))",
            border:
              "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
          }}
        >
          <Check
            size={14}
            className="shrink-0 mt-0.5"
            style={{ color: "var(--primary)" }}
          />
          <span style={{ color: "var(--card-foreground)" }}>
            Applied. New heading: <em>&ldquo;{result}&rdquo;</em>
          </span>
        </div>
      )}

      {error && (
        <div
          className="mt-4 p-3 rounded-md flex items-start gap-2 text-sm"
          style={{
            background: "color-mix(in srgb, var(--destructive) 6%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--destructive) 18%, transparent)",
            color: "var(--destructive)",
          }}
        >
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}
