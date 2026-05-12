"use client";

import { useState, useTransition } from "react";
import {
  Save,
  Check,
  AlertCircle,
  Loader2,
  Zap,
} from "lucide-react";
import {
  saveLeadWebhook,
  disconnectLeadWebhook,
  testLeadWebhook,
} from "@/app/admin/integrations/lead-webhook/actions";

export default function LeadWebhookWizard({
  initialUrl,
  initialApiKey,
  initialLabel,
  isConnected,
}: {
  initialUrl: string;
  initialApiKey: string;
  initialLabel: string;
  isConnected: boolean;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [label, setLabel] = useState(initialLabel);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    status?: number;
    error?: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveLeadWebhook({ url, apiKey, label });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
    });
  }

  function runTest() {
    setError(null);
    setTestResult(null);
    startTransition(async () => {
      const res = await testLeadWebhook({ url, apiKey });
      setTestResult({
        ok: res.ok,
        status: res.status,
        error: res.ok ? undefined : res.error,
      });
    });
  }

  function disconnect() {
    if (!confirm("Disconnect the CRM webhook? New leads will stop being forwarded."))
      return;
    setError(null);
    startTransition(async () => {
      const res = await disconnectLeadWebhook();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
    });
  }

  return (
    <div className="space-y-6">
      <div className="admin-card p-5 space-y-4">
        <div>
          <label className="admin-label">CRM name (label)</label>
          <input
            type="text"
            className="admin-input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Follow Up Boss"
          />
          <p
            className="mt-1 text-[11px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            Just for your own tracking — shows up in master logs.
          </p>
        </div>
        <div>
          <label className="admin-label">Webhook URL</label>
          <input
            type="url"
            className="admin-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.followupboss.com/v1/events"
          />
          <p
            className="mt-1 text-[11px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            HTTPS only. Every form submission POSTs JSON to this URL.
          </p>
        </div>
        <div>
          <label className="admin-label">API key (optional)</label>
          <input
            type="text"
            className="admin-input admin-mono"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your CRM API key"
          />
          <p
            className="mt-1 text-[11px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            If set, sent as both <code>X-API-Key</code> and{" "}
            <code>Authorization: Bearer ...</code>. Many CRMs accept either.
          </p>
        </div>
      </div>

      {testResult && (
        <div
          className="p-3 rounded-md text-sm flex items-start gap-2"
          style={{
            background: testResult.ok
              ? "color-mix(in srgb, var(--primary) 6%, transparent)"
              : "color-mix(in srgb, var(--destructive) 6%, transparent)",
            border: `1px solid ${
              testResult.ok
                ? "color-mix(in srgb, var(--primary) 18%, transparent)"
                : "color-mix(in srgb, var(--destructive) 18%, transparent)"
            }`,
            color: testResult.ok ? "var(--primary)" : "var(--destructive)",
          }}
        >
          {testResult.ok ? (
            <Check size={14} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
          )}
          <span>
            {testResult.ok
              ? `Test POST succeeded (HTTP ${testResult.status}). Your CRM accepted the test lead.`
              : `Test failed: ${testResult.error}`}
          </span>
        </div>
      )}

      {error && (
        <div
          className="p-3 rounded-md text-sm flex items-start gap-2"
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

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={save}
          disabled={pending || !url.trim()}
          className="admin-btn inline-flex items-center"
          style={pending ? { opacity: 0.6 } : undefined}
        >
          {pending ? (
            <>
              <Loader2 size={13} className="mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save size={13} className="mr-2" />
              {isConnected ? "Update" : "Connect"}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={runTest}
          disabled={pending || !url.trim()}
          className="admin-btn admin-btn-secondary inline-flex items-center"
        >
          <Zap size={13} className="mr-2" />
          Send test lead
        </button>
        {isConnected && (
          <button
            type="button"
            onClick={disconnect}
            disabled={pending}
            className="text-xs"
            style={{ color: "var(--destructive)", fontWeight: 600 }}
          >
            Disconnect
          </button>
        )}
        {savedAt && !pending && !testResult && (
          <span
            className="inline-flex items-center gap-1 text-xs"
            style={{ color: "var(--primary)" }}
          >
            <Check size={12} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
