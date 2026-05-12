"use client";

import { useState, useTransition } from "react";
import { Save, Check, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import {
  saveCalendlyIntegration,
  disconnectCalendly,
} from "@/app/admin/integrations/calendly/actions";

export default function CalendlyWizard({
  initialUrl,
  isConnected,
}: {
  initialUrl: string;
  isConnected: boolean;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveCalendlyIntegration(url);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
    });
  }

  function disconnect() {
    if (!confirm("Disconnect Calendly? The scheduling widget will stop showing on the public site."))
      return;
    setError(null);
    startTransition(async () => {
      const res = await disconnectCalendly();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setUrl("");
      setSavedAt(Date.now());
    });
  }

  return (
    <div className="space-y-6">
      <div className="admin-card p-5">
        <label className="admin-label">Calendly scheduling URL</label>
        <input
          type="url"
          className="admin-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://calendly.com/your-name/30min"
        />
        <p
          className="mt-2 text-[11px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          Find this URL in Calendly → Account → My Calendly Link, or
          per-event under Share → Copy Link. We embed it as an inline
          widget on your contact page.{" "}
          <a
            href="https://help.calendly.com/hc/en-us/articles/223193268"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--primary)",
              textDecoration: "underline",
            }}
          >
            Calendly help <ExternalLink size={10} className="inline" />
          </a>
        </p>
      </div>

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

      <div className="flex items-center gap-3">
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
        {savedAt && !pending && (
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
