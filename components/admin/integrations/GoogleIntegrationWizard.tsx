"use client";

/**
 * Google Places integration wizard — paste-and-test flow.
 *
 * Two states:
 *   • "Not connected" → 3-step wizard (API key → Place ID → test → save)
 *   • "Connected"     → status card with Sync now + Disconnect
 *
 * The wizard pre-fills the existing config when the row already exists,
 * so the admin can re-test or update credentials without re-typing.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  RefreshCcw,
  Star,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  testGoogleConnection,
  saveGoogleIntegration,
  syncGoogleReviewsNow,
  disconnectGoogle,
} from "@/app/admin/integrations/google/actions";

type ExistingConfig = {
  apiKey: string;
  placeId: string;
  enabled: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: "success" | "error" | null;
  lastSyncError: string | null;
};

type TestResult = {
  placeName: string;
  rating: number;
  reviewCount: number;
  sample: { author: string; rating: number; text: string }[];
};

export default function GoogleIntegrationWizard({
  existing,
}: {
  existing: ExistingConfig | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? "");
  const [placeId, setPlaceId] = useState(existing?.placeId ?? "");
  const [test, setTest] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const isConnected =
    Boolean(existing?.enabled && existing?.apiKey && existing?.placeId);

  function handleTest() {
    setError(null);
    setSavedMessage(null);
    setTest(null);
    startTransition(async () => {
      const res = await testGoogleConnection(apiKey, placeId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTest(res.data ?? null);
    });
  }

  function handleSave() {
    setError(null);
    setSavedMessage(null);
    startTransition(async () => {
      const res = await saveGoogleIntegration(apiKey, placeId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedMessage(
        res.data
          ? `Connected! Synced ${res.data.syncedCount} review${res.data.syncedCount === 1 ? "" : "s"} into the admin queue.`
          : "Connected!",
      );
      router.refresh();
    });
  }

  function handleSyncNow() {
    setError(null);
    setSavedMessage(null);
    startTransition(async () => {
      const res = await syncGoogleReviewsNow();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedMessage(
        res.data?.synced && res.data.synced > 0
          ? `Synced ${res.data.synced} new review${res.data.synced === 1 ? "" : "s"} from Google.`
          : `Already up to date (${res.data?.total ?? 0} reviews on Google, none new).`,
      );
      router.refresh();
    });
  }

  function handleDisconnect() {
    if (
      !confirm(
        "Disconnect Google Reviews? Already-imported reviews stay in the database. You can reconnect anytime by pasting the API key again.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await disconnectGoogle();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setApiKey("");
      setPlaceId("");
      setTest(null);
      setSavedMessage("Disconnected.");
      router.refresh();
    });
  }

  // ── CONNECTED STATE ──────────────────────────────────────────
  if (isConnected) {
    return (
      <div className="space-y-6">
        <div className="admin-card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <span
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] px-2 py-1 rounded-full"
                style={{
                  background: "color-mix(in srgb, var(--primary) 15%, transparent)",
                  color: "var(--primary)",
                  fontWeight: 700,
                }}
              >
                <Check size={11} /> Connected
              </span>
              <h3
                className="text-lg mt-3 mb-1"
                style={{ color: "var(--card-foreground)", fontWeight: 600 }}
              >
                Google Reviews are syncing automatically.
              </h3>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {existing?.lastSyncedAt
                  ? `Last synced ${formatRelative(existing.lastSyncedAt)} · ${existing.lastSyncStatus === "error" ? "error: " + (existing.lastSyncError ?? "unknown") : "ok"}`
                  : "Ready to sync."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={pending}
              className="admin-btn"
            >
              <RefreshCcw size={13} className="mr-2" />
              {pending ? "Syncing…" : "Sync now"}
            </button>
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
                background: "color-mix(in srgb, var(--primary) 12%, transparent)",
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
                background: "color-mix(in srgb, var(--destructive) 12%, transparent)",
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
            style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
          >
            Connection details
          </p>
          <div className="space-y-2 text-xs admin-mono">
            <div className="flex justify-between gap-4">
              <span style={{ color: "var(--muted-foreground)" }}>API key</span>
              <span style={{ color: "var(--card-foreground)" }}>
                {maskKey(existing?.apiKey ?? "")}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span style={{ color: "var(--muted-foreground)" }}>Place ID</span>
              <span style={{ color: "var(--card-foreground)" }} className="truncate">
                {existing?.placeId}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── WIZARD STATE ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Step 1 */}
      <Step number={1} title="Get your Google API key">
        <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          Open the Google Cloud Console, create or pick a project, enable the
          <strong> Places API (New) </strong>, then create an API key under
          Credentials. Google requires a billing account on file (you won&apos;t
          be charged unless you exceed 1,000 calls per day — this site never will).
        </p>
        <a
          href="https://console.cloud.google.com/apis/library/places.googleapis.com"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn admin-btn-secondary mb-4"
        >
          Open Google Cloud Console
          <ArrowUpRight size={13} className="ml-2" />
        </a>
        <label className="admin-label">Paste API key</label>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="AIzaSy…"
          className="admin-input admin-mono"
        />
      </Step>

      {/* Step 2 */}
      <Step number={2} title="Find your business Place ID">
        <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          The Place ID is a stable identifier for your business on Google
          Maps. Use Google&apos;s finder, search for &ldquo;Samina Bilal RE/MAX
          Galaxy&rdquo;, copy the ID that pops up (looks like{" "}
          <code className="admin-mono">ChIJ...</code>).
        </p>
        <a
          href="https://developers.google.com/maps/documentation/places/web-service/place-id"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn admin-btn-secondary mb-4"
        >
          Open Place ID Finder
          <ArrowUpRight size={13} className="ml-2" />
        </a>
        <label className="admin-label">Paste Place ID</label>
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          placeholder="ChIJ…"
          className="admin-input admin-mono"
        />
      </Step>

      {/* Step 3 */}
      <Step number={3} title="Test the connection">
        <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          We&apos;ll fetch your business and the latest 5 reviews. Nothing is
          saved or shown publicly until you click &ldquo;Save &amp; activate&rdquo; below.
        </p>
        <button
          type="button"
          onClick={handleTest}
          disabled={pending || !apiKey || !placeId}
          className="admin-btn"
        >
          {pending ? "Testing…" : "Test connection"}
        </button>

        {test && (
          <div
            className="mt-5 admin-card p-4"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 28%, var(--border))",
              background: "color-mix(in srgb, var(--primary) 5%, var(--card))",
            }}
          >
            <p className="text-xs mb-2 inline-flex items-center gap-1.5" style={{ color: "var(--primary)", fontWeight: 700 }}>
              <Check size={12} /> Connected to {test.placeName}
            </p>
            <p
              className="text-xs mb-3"
              style={{ color: "var(--card-foreground)" }}
            >
              <Star size={12} className="inline mr-1" style={{ color: "var(--primary)" }} />
              {test.rating.toFixed(1)} · {test.reviewCount} total reviews on Google
            </p>
            <div className="space-y-2">
              {test.sample.map((s, i) => (
                <div
                  key={i}
                  className="text-[11px] leading-relaxed pl-3 border-l-2"
                  style={{
                    borderColor: "color-mix(in srgb, var(--primary) 35%, transparent)",
                    color: "var(--card-foreground)",
                  }}
                >
                  <strong style={{ fontWeight: 600 }}>
                    {s.author} ·{" "}
                    {Array.from({ length: s.rating })
                      .map(() => "★")
                      .join("")}
                  </strong>
                  <br />
                  <span style={{ color: "var(--muted-foreground)" }}>
                    {s.text}…
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Step>

      {/* Save + activate */}
      <div className="admin-card p-5 sticky bottom-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1">
            {error && (
              <p
                className="text-xs inline-flex items-start gap-1.5"
                style={{ color: "var(--destructive)" }}
              >
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}
            {savedMessage && !error && (
              <p
                className="text-xs"
                style={{ color: "var(--primary)", fontWeight: 600 }}
              >
                {savedMessage}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !apiKey || !placeId}
            className="admin-btn"
          >
            {pending ? "Saving…" : "Save & activate"}
          </button>
        </div>
      </div>
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
            background: "color-mix(in srgb, var(--primary) 18%, var(--card))",
            color: "var(--primary)",
            fontWeight: 700,
            border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
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

function maskKey(key: string): string {
  if (!key) return "—";
  if (key.length <= 8) return "•".repeat(key.length);
  return key.slice(0, 6) + "•".repeat(Math.max(0, key.length - 10)) + key.slice(-4);
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
