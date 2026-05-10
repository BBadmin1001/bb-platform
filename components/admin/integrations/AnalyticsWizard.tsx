"use client";

/**
 * Google Analytics paste-and-go wizard.
 *
 *   Not connected → 2-step paste flow (open GA console, paste ID, save)
 *   Connected     → status card with the Measurement ID + Disconnect button
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  AlertCircle,
  Trash2,
  BarChart3,
} from "lucide-react";
import {
  saveAnalyticsIntegration,
  disconnectAnalytics,
} from "@/app/admin/integrations/analytics/actions";

interface ExistingConfig {
  measurementId: string;
  enabled: boolean;
}

export default function AnalyticsWizard({
  existing,
}: {
  existing: ExistingConfig | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [measurementId, setMeasurementId] = useState(
    existing?.measurementId ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const isConnected = Boolean(existing?.enabled && existing?.measurementId);

  function handleSave() {
    setError(null);
    setSavedMessage(null);
    startTransition(async () => {
      const res = await saveAnalyticsIntegration(measurementId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedMessage(
        "Connected! The Google Analytics tag is now live on every page.",
      );
      router.refresh();
    });
  }

  function handleDisconnect() {
    if (
      !confirm(
        "Disconnect Google Analytics? The tag will be removed from every page and visitors will no longer be tracked. Your historical data stays in Google Analytics — only the tag is removed.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await disconnectAnalytics();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMeasurementId("");
      setSavedMessage("Disconnected. The GA tag is no longer injected.");
      router.refresh();
    });
  }

  // ── Connected state ─────────────────────────────────────────
  if (isConnected) {
    return (
      <div className="space-y-6">
        <div className="admin-card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <span
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] px-2 py-1 rounded-full"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 15%, transparent)",
                  color: "var(--primary)",
                  fontWeight: 700,
                }}
              >
                <Check size={11} /> Connected
              </span>
              <h3
                className="text-lg mt-3 mb-1"
                style={{
                  color: "var(--card-foreground)",
                  fontWeight: 600,
                }}
              >
                Tracking visitors on every page.
              </h3>
              <p
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Data shows up in your Google Analytics dashboard within 24
                hours of first install. Bookmark the link below.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={`https://analytics.google.com/analytics/web/`}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn"
            >
              <BarChart3 size={13} className="mr-2" />
              Open Google Analytics
              <ArrowUpRight size={13} className="ml-1.5" />
            </a>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={pending}
              className="admin-btn admin-btn-secondary"
            >
              <Trash2 size={13} className="mr-2" />
              Disconnect
            </button>
          </div>

          {savedMessage && (
            <div
              className="mt-4 text-xs px-3 py-2 rounded"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "var(--primary)",
                fontWeight: 500,
              }}
            >
              {savedMessage}
            </div>
          )}
          {error && (
            <div
              className="mt-4 text-xs px-3 py-2 rounded inline-flex items-start gap-2"
              style={{
                background:
                  "color-mix(in srgb, var(--destructive) 12%, transparent)",
                color: "var(--destructive)",
              }}
            >
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="admin-card p-5">
          <p
            className="text-[10px] uppercase tracking-[0.22em] mb-3"
            style={{
              color: "var(--muted-foreground)",
              fontWeight: 600,
            }}
          >
            Measurement ID
          </p>
          <p
            className="admin-mono text-sm"
            style={{ color: "var(--card-foreground)" }}
          >
            {existing?.measurementId}
          </p>
        </div>
      </div>
    );
  }

  // ── Wizard state ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Step number={1} title="Get your GA4 Measurement ID">
        <p
          className="text-xs mb-3 leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          If you already have a Google Analytics 4 account, open it and grab
          the Measurement ID from{" "}
          <strong>Admin → Data Streams → Web → Measurement ID</strong>. If
          you don&apos;t have one yet, the same page will walk you through
          creating a property — it takes about 2 minutes.
        </p>
        <a
          href="https://analytics.google.com/analytics/web/"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn admin-btn-secondary mb-4"
        >
          Open Google Analytics
          <ArrowUpRight size={13} className="ml-2" />
        </a>
        <label className="admin-label">Paste Measurement ID</label>
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={measurementId}
          onChange={(e) => setMeasurementId(e.target.value)}
          placeholder="G-XXXXXXXXXX"
          className="admin-input admin-mono"
        />
        <p
          className="text-[11px] mt-1.5"
          style={{ color: "var(--muted-foreground)" }}
        >
          Starts with <code className="admin-mono">G-</code> — that&apos;s the
          GA4 format. Older{" "}
          <code className="admin-mono">UA-</code> IDs from Universal Analytics
          aren&apos;t supported (Google retired UA in 2024).
        </p>
      </Step>

      <Step number={2} title="Save & install">
        <p
          className="text-xs mb-4 leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          As soon as you save, the tracking script is injected on every page
          of the public site. Visitors start being counted immediately;
          dashboards in Google Analytics populate within ~24 hours of first
          traffic.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !measurementId}
          className="admin-btn"
        >
          {pending ? "Saving…" : "Save & install"}
        </button>

        {error && (
          <p
            className="mt-3 text-xs inline-flex items-start gap-1.5"
            style={{ color: "var(--destructive)" }}
          >
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}
        {savedMessage && (
          <p
            className="mt-3 text-xs"
            style={{ color: "var(--primary)", fontWeight: 600 }}
          >
            {savedMessage}
          </p>
        )}
      </Step>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-card p-6">
      <div className="flex items-start gap-4 mb-4">
        <span
          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs"
          style={{
            background:
              "color-mix(in srgb, var(--primary) 18%, var(--card))",
            color: "var(--primary)",
            fontWeight: 700,
            border:
              "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
          }}
        >
          {number}
        </span>
        <h3
          className="text-base"
          style={{ color: "var(--card-foreground)", fontWeight: 600 }}
        >
          {title}
        </h3>
      </div>
      <div className="pl-11">{children}</div>
    </section>
  );
}
