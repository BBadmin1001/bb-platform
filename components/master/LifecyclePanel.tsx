"use client";

/**
 * LifecyclePanel — operational workflow strip on /master/tenants/[slug].
 *
 * Five stages from intake to live. The master operator clicks
 * "Advance to <next>" once whatever happens at this stage is done
 * (polishing wrapped, client signed off on the preview, domain
 * verified, etc.).
 *
 * The "preview link" block is also surfaced here because it's the
 * primary thing master sends the client during the
 * `ready_for_review` stage.
 */

import { useState, useTransition } from "react";
import {
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  setTenantLifecycleStage,
  rotatePreviewToken,
  type LifecycleStage,
} from "@/app/master/tenants/actions";

const STAGES: { id: LifecycleStage; label: string; blurb: string }[] = [
  {
    id: "intake",
    label: "Intake",
    blurb:
      "Customer paid, intake content seeded. Ready to start polishing.",
  },
  {
    id: "polishing",
    label: "Polishing",
    blurb:
      "Internal team is editing copy + photos + brand. Use the admin panel to make it shine.",
  },
  {
    id: "ready_for_review",
    label: "Awaiting Review",
    blurb:
      "Polishing wrapped. Send the client the preview link below for sign-off.",
  },
  {
    id: "ready_for_domain",
    label: "Awaiting Domain",
    blurb:
      "Client approved. Waiting for them to point their domain at us — the domain panel below tracks DNS.",
  },
  {
    id: "live",
    label: "Live",
    blurb: "Public on their custom domain.",
  },
];

const NEXT: Record<LifecycleStage, LifecycleStage | null> = {
  intake: "polishing",
  polishing: "ready_for_review",
  ready_for_review: "ready_for_domain",
  ready_for_domain: "live",
  live: null,
};

export default function LifecyclePanel({
  slug,
  initialStage,
  initialPreviewToken,
  masterHost,
}: {
  slug: string;
  initialStage: LifecycleStage;
  initialPreviewToken: string;
  masterHost: string;
}) {
  const [stage, setStage] = useState<LifecycleStage>(initialStage);
  const [previewToken, setPreviewToken] = useState(initialPreviewToken);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const stageMeta = STAGES.find((s) => s.id === stage)!;
  const nextStage = NEXT[stage];
  const stageIndex = STAGES.findIndex((s) => s.id === stage);

  const previewUrl = `https://${masterHost}/?tenant=${slug}&preview=${previewToken}`;

  function advance() {
    if (!nextStage) return;
    setError(null);
    startTransition(async () => {
      const res = await setTenantLifecycleStage(slug, nextStage);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStage(nextStage);
    });
  }

  function moveBack(target: LifecycleStage) {
    setError(null);
    startTransition(async () => {
      const res = await setTenantLifecycleStage(slug, target);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStage(target);
    });
  }

  function rotate() {
    setError(null);
    startTransition(async () => {
      const res = await rotatePreviewToken(slug);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.previewToken) setPreviewToken(res.previewToken);
    });
  }

  async function copyPreview() {
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select the URL manually below.");
    }
  }

  return (
    <section className="admin-card p-6 mb-10">
      <div className="flex items-center gap-2 mb-4">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{
            background: "color-mix(in srgb, var(--primary) 14%, transparent)",
            color: "var(--primary)",
          }}
        >
          <Sparkles size={14} strokeWidth={1.6} />
        </span>
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Workflow
        </p>
      </div>

      {/* Stage progress strip */}
      <ol className="grid grid-cols-5 gap-2 mb-5">
        {STAGES.map((s, i) => {
          const done = i < stageIndex;
          const active = i === stageIndex;
          return (
            <li
              key={s.id}
              className="text-center"
              style={{ minWidth: 0 }}
            >
              <button
                type="button"
                onClick={() => i < stageIndex && moveBack(s.id)}
                disabled={i >= stageIndex || pending}
                className="w-full flex flex-col items-center gap-1.5"
                title={
                  i < stageIndex
                    ? `Move back to ${s.label}`
                    : i === stageIndex
                    ? "Current stage"
                    : "Not reached yet"
                }
                style={{ cursor: i < stageIndex ? "pointer" : "default" }}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px]"
                  style={{
                    background: done
                      ? "var(--primary)"
                      : active
                      ? "color-mix(in srgb, var(--primary) 18%, var(--card))"
                      : "color-mix(in srgb, var(--foreground) 6%, var(--card))",
                    color: done ? "white" : "var(--card-foreground)",
                    fontWeight: 700,
                    border:
                      active && !done
                        ? "1px solid var(--primary)"
                        : "1px solid transparent",
                  }}
                >
                  {done ? <Check size={12} strokeWidth={2.5} /> : i + 1}
                </span>
                <span
                  className="text-[10px] uppercase tracking-[0.16em] truncate"
                  style={{
                    color: active
                      ? "var(--primary)"
                      : done
                      ? "var(--card-foreground)"
                      : "var(--muted-foreground)",
                    fontWeight: active ? 700 : 600,
                    maxWidth: "100%",
                  }}
                >
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Current stage blurb + advance */}
      <div
        className="p-4 rounded-md mb-4"
        style={{
          background: "color-mix(in srgb, var(--primary) 5%, var(--card))",
          border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
        }}
      >
        <p
          className="text-[11px] uppercase tracking-[0.22em] mb-1"
          style={{ color: "var(--primary)", fontWeight: 700 }}
        >
          Current stage · {stageMeta.label}
        </p>
        <p
          className="text-sm mb-3"
          style={{ color: "var(--card-foreground)" }}
        >
          {stageMeta.blurb}
        </p>
        {nextStage && (
          <button
            type="button"
            onClick={advance}
            disabled={pending}
            className="admin-btn inline-flex items-center"
            style={pending ? { opacity: 0.6 } : undefined}
          >
            Advance to {STAGES.find((s) => s.id === nextStage)?.label}
            <ChevronRight size={14} className="ml-1.5" />
          </button>
        )}
      </div>

      {/* Preview link block */}
      <div
        className="p-4 rounded-md"
        style={{
          background:
            "color-mix(in srgb, var(--foreground) 4%, var(--card))",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="text-[11px] uppercase tracking-[0.22em] mb-2"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Preview link
        </p>
        <p
          className="text-xs mb-3"
          style={{ color: "var(--muted-foreground)" }}
        >
          Share this URL with the client to let them review the polished
          site before going live. Works regardless of <code>status</code> —
          a tokenized URL anyone can open.
        </p>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            readOnly
            value={previewUrl}
            className="flex-1 admin-input text-[11px] admin-mono"
            style={{ minWidth: "12rem" }}
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={copyPreview}
            className="admin-btn admin-btn-secondary inline-flex items-center"
          >
            {copied ? (
              <>
                <Check size={13} className="mr-1.5" />
                Copied
              </>
            ) : (
              <>
                <Copy size={13} className="mr-1.5" />
                Copy
              </>
            )}
          </button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-secondary inline-flex items-center"
          >
            <ExternalLink size={13} className="mr-1.5" />
            Open
          </a>
          <button
            type="button"
            onClick={rotate}
            disabled={pending}
            className="admin-btn admin-btn-secondary inline-flex items-center"
            style={pending ? { opacity: 0.6 } : undefined}
            title="Rotate the token — invalidates the old URL"
          >
            <RefreshCw
              size={13}
              className={"mr-1.5 " + (pending ? "animate-spin" : "")}
            />
            Rotate
          </button>
        </div>
      </div>

      {error && (
        <p
          className="text-xs mt-3"
          style={{ color: "var(--destructive)" }}
        >
          {error}
        </p>
      )}
    </section>
  );
}
