"use client";

import { useState, useTransition } from "react";
import {
  Sparkles,
  Wand2,
  Check,
  AlertCircle,
  Loader2,
  Globe,
} from "lucide-react";
import {
  aiPolishMeet,
  aiPolishWholeSite,
  type AiPolishSiteResult,
} from "@/app/master/tenants/actions";

/**
 * Master-side AI Polish panel.
 *
 * Two flows:
 *   1. "Polish whole site" — the primary CTA. One click, ~5-10s, every
 *      public page on the tenant gets a polished pass from Claude
 *      using the intake_data. Shows a per-page status grid.
 *   2. "Polish Meet section only" — the original Phase 13 flow, kept
 *      as a small secondary option for one-section retries.
 *
 * Operators stay on this page during the polish — server actions
 * block until done, but ~10s is fine for a click-and-wait UX.
 */
export default function AIPolishPanel({ slug }: { slug: string }) {
  const [pendingFull, startFullTransition] = useTransition();
  const [pendingMeet, startMeetTransition] = useTransition();
  const [siteResult, setSiteResult] = useState<AiPolishSiteResult | null>(null);
  const [meetResult, setMeetResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function runFull() {
    setError(null);
    setSiteResult(null);
    setMeetResult(null);
    startFullTransition(async () => {
      const res = await aiPolishWholeSite(slug);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSiteResult(res);
    });
  }

  function runMeet() {
    setError(null);
    setSiteResult(null);
    setMeetResult(null);
    startMeetTransition(async () => {
      const res = await aiPolishMeet(slug);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMeetResult(res.preview ?? "(applied)");
    });
  }

  const anyPending = pendingFull || pendingMeet;

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
        className="text-sm mb-5"
        style={{ color: "var(--muted-foreground)", lineHeight: 1.6 }}
      >
        Runs Claude over the customer&apos;s intake data and rewrites every
        editable copy block on the public site (home, about, buyers,
        sellers, path-to-ownership, partners, contact). The shape stays
        the same — hrefs, image keys, step numbers, stats are untouched.
        You can always re-edit by hand from{" "}
        <code className="text-[11px]">/admin/content</code>.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runFull}
          disabled={anyPending}
          className="admin-btn inline-flex items-center"
          style={anyPending ? { opacity: 0.6 } : undefined}
        >
          {pendingFull ? (
            <>
              <Loader2 size={13} className="mr-2 animate-spin" />
              Polishing every page&hellip;
            </>
          ) : (
            <>
              <Globe size={13} className="mr-2" />
              Polish whole site
            </>
          )}
        </button>
        <button
          type="button"
          onClick={runMeet}
          disabled={anyPending}
          className="admin-btn admin-btn-secondary inline-flex items-center text-xs"
          style={anyPending ? { opacity: 0.6 } : undefined}
        >
          {pendingMeet ? (
            <>
              <Loader2 size={11} className="mr-1.5 animate-spin" />
              Polishing&hellip;
            </>
          ) : (
            <>
              <Sparkles size={11} className="mr-1.5" />
              Just the &ldquo;Meet&rdquo; section
            </>
          )}
        </button>
        {pendingFull && (
          <span
            className="text-[11px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            7 pages in parallel — usually 5-10s.
          </span>
        )}
      </div>

      {/* Whole-site result */}
      {siteResult && siteResult.ok && (
        <div
          className="mt-5 p-4 rounded-md"
          style={{
            background: "color-mix(in srgb, var(--primary) 6%, var(--card))",
            border:
              "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Check size={14} style={{ color: "var(--primary)" }} />
            <p
              className="text-sm"
              style={{ color: "var(--card-foreground)", fontWeight: 600 }}
            >
              Polished {siteResult.okCount} of {siteResult.okCount + siteResult.errCount} pages
              {" · "}
              <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>
                {(siteResult.ms / 1000).toFixed(1)}s
              </span>
            </p>
          </div>
          <ul className="space-y-1.5">
            {siteResult.pages.map((p) => (
              <li
                key={p.page}
                className="flex items-start gap-2 text-[12px]"
                style={{ color: "var(--card-foreground)" }}
              >
                {p.ok ? (
                  <Check
                    size={12}
                    className="shrink-0 mt-[2px]"
                    style={{ color: "var(--primary)" }}
                  />
                ) : (
                  <AlertCircle
                    size={12}
                    className="shrink-0 mt-[2px]"
                    style={{ color: "var(--destructive)" }}
                  />
                )}
                <span style={{ fontWeight: 600, minWidth: 70 }}>
                  /{p.page === "home" ? "" : p.page}
                </span>
                {p.ok ? (
                  <span style={{ color: "var(--muted-foreground)" }}>
                    {p.sections} sections written
                  </span>
                ) : (
                  <span style={{ color: "var(--destructive)" }}>{p.error}</span>
                )}
              </li>
            ))}
          </ul>
          <p
            className="mt-3 text-[11px]"
            style={{ color: "var(--muted-foreground)", lineHeight: 1.5 }}
          >
            Polished copy is now in <code>content_blocks</code>. Visit the
            site or open admin to review. Re-run anytime to regenerate.
          </p>
        </div>
      )}

      {/* Single-section ("Meet") result */}
      {meetResult && (
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
            Meet section applied. New heading:{" "}
            <em>&ldquo;{meetResult}&rdquo;</em>
          </span>
        </div>
      )}

      {error && (
        <div
          className="mt-4 p-3 rounded-md flex items-start gap-2 text-sm"
          style={{
            background:
              "color-mix(in srgb, var(--destructive) 6%, transparent)",
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
