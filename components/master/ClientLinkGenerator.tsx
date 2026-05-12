"use client";

/**
 * Per-client onboarding link generator (Phase 18).
 *
 * Sales rep workflow:
 *   1. Pick the rep from a dropdown.
 *   2. Enter the client label (e.g. "Jane Smith / Compass Atlanta") —
 *      required so the rep can track which link belongs to which deal.
 *   3. Optionally pre-fill the client's email (pre-populates the wizard
 *      first step so the customer doesn't have to retype).
 *   4. Set the agreed setup price ($600 minimum, no max).
 *   5. Click Generate. The system returns a unique URL with a sealed
 *      token. The price cannot be lowered by the customer editing the
 *      URL — it lives in the DB and is re-resolved at submit time.
 *
 * Below the form, every active link this rep has generated is listed
 * with its status pill (pending → clicked → submitted) and a "Copy
 * URL" / "Deactivate" pair of actions.
 */

import { useState, useTransition } from "react";
import {
  Plus,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  XCircle,
} from "lucide-react";
import {
  createSalesRepLink,
  setLinkActive,
} from "@/app/master/sales-reps/actions";
import { SETUP_FEE_MIN_CENTS } from "@/lib/salesRepConstants";

type Rep = {
  id: string;
  slug: string;
  full_name: string;
  is_active: boolean;
};

type LinkRow = {
  id: string;
  rep_id: string;
  link_token: string;
  client_label: string;
  client_email: string | null;
  agreed_setup_cents: number;
  created_at: string;
  clicked_at: string | null;
  submitted_at: string | null;
  is_active: boolean;
};

export default function ClientLinkGenerator({
  reps,
  initialLinks,
  masterHost,
}: {
  reps: Rep[];
  initialLinks: LinkRow[];
  masterHost: string;
}) {
  const activeReps = reps.filter((r) => r.is_active);
  const [repId, setRepId] = useState<string>(activeReps[0]?.id ?? "");
  const [clientLabel, setClientLabel] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [priceDollars, setPriceDollars] = useState("600");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [lastCreated, setLastCreated] = useState<{
    token: string;
    url: string;
  } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkRow[]>(initialLinks);

  function generate() {
    setError(null);
    setLastCreated(null);

    const priceNum = parseFloat(priceDollars);
    if (!Number.isFinite(priceNum) || priceNum * 100 < SETUP_FEE_MIN_CENTS) {
      setError(`Price must be at least $${(SETUP_FEE_MIN_CENTS / 100).toFixed(0)}.`);
      return;
    }
    if (!repId) {
      setError("Pick a sales rep.");
      return;
    }
    if (!clientLabel.trim()) {
      setError("Realtor name is required.");
      return;
    }

    startTransition(async () => {
      const res = await createSalesRepLink({
        rep_id: repId,
        client_label: clientLabel,
        client_email: clientEmail || undefined,
        agreed_setup_cents: Math.round(priceNum * 100),
        notes: notes || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLastCreated({ token: res.link_token, url: res.url });
      // Prepend a new link row to the local list. Use the REAL row
      // id (not the token) so deactivate works correctly (A4-002).
      setLinks([
        {
          id: res.link_id,
          rep_id: repId,
          link_token: res.link_token,
          client_label: clientLabel.trim(),
          client_email: clientEmail.trim() || null,
          agreed_setup_cents: Math.round(priceNum * 100),
          created_at: new Date().toISOString(),
          clicked_at: null,
          submitted_at: null,
          is_active: true,
        },
        ...links,
      ]);
      // Reset client-side fields but keep rep + price for fast follow-up
      // deals from the same rep.
      setClientLabel("");
      setClientEmail("");
      setNotes("");
    });
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      // ignore — old browsers; manual select still works
    }
  }

  function toggleActive(link: LinkRow) {
    if (
      link.is_active &&
      !confirm(
        `Deactivate this link for ${link.client_label}? The URL will stop working immediately. You can reactivate later.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await setLinkActive(link.id, !link.is_active);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLinks(
        links.map((l) =>
          l.id === link.id ? { ...l, is_active: !l.is_active } : l,
        ),
      );
    });
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
          <LinkIcon size={14} strokeWidth={1.6} />
        </span>
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Generate client onboarding link
        </p>
      </div>
      <p
        className="text-sm mb-5"
        style={{ color: "var(--muted-foreground)" }}
      >
        One tracked link per client deal. Pricing is sealed server-side —
        customers can&apos;t edit the URL to lower the price. Minimum $
        {(SETUP_FEE_MIN_CENTS / 100).toFixed(0)}.
      </p>

      {activeReps.length === 0 ? (
        <p
          className="text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          Create an active sales rep below before generating a link.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="admin-label">Sales rep</label>
            <select
              className="admin-input"
              value={repId}
              onChange={(e) => setRepId(e.target.value)}
            >
              {activeReps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name} (?ref={r.slug})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-label">
              Agreed setup price · USD
            </label>
            <div className="flex items-center gap-2">
              <span
                style={{
                  color: "var(--muted-foreground)",
                  fontWeight: 600,
                }}
              >
                $
              </span>
              <input
                type="number"
                min={SETUP_FEE_MIN_CENTS / 100}
                step="50"
                className="admin-input"
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
              />
            </div>
            <p
              className="text-[10px] mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              Minimum ${(SETUP_FEE_MIN_CENTS / 100).toFixed(0)}. No max.
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="admin-label">
              Realtor name <span style={{ color: "var(--destructive)" }}>*</span>
            </label>
            <input
              type="text"
              className="admin-input"
              value={clientLabel}
              onChange={(e) => setClientLabel(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <div className="md:col-span-2">
            <label className="admin-label">
              Realtor email (optional · pre-fills the wizard)
            </label>
            <input
              type="email"
              className="admin-input"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="jane@compass.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="admin-label">
              Notes (optional · for your eyes only)
            </label>
            <input
              type="text"
              className="admin-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Met at Saturday open house · wants flyers add-on"
            />
          </div>
        </div>
      )}

      {error && (
        <p
          className="text-xs mb-3 flex items-center gap-1"
          style={{ color: "var(--destructive)" }}
        >
          <AlertCircle size={12} />
          {error}
        </p>
      )}

      {activeReps.length > 0 && (
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="admin-btn inline-flex items-center"
          style={pending ? { opacity: 0.6 } : undefined}
        >
          {pending ? (
            <>
              <Loader2 size={13} className="mr-2 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Plus size={13} className="mr-2" />
              Generate link
            </>
          )}
        </button>
      )}

      {lastCreated && (
        <div
          className="mt-4 p-3 rounded-md"
          style={{
            background: "color-mix(in srgb, var(--primary) 6%, var(--card))",
            border:
              "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
          }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.22em] mb-2"
            style={{ color: "var(--primary)", fontWeight: 700 }}
          >
            Link ready — send to your client
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              readOnly
              value={lastCreated.url}
              className="admin-input admin-mono text-[11px] flex-1"
              style={{ minWidth: "14rem" }}
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              onClick={() => copyUrl(lastCreated.url)}
              className="admin-btn admin-btn-secondary inline-flex items-center"
            >
              {copiedUrl === lastCreated.url ? (
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
          </div>
        </div>
      )}

      {/* Existing links list */}
      {links.length > 0 && (
        <div className="mt-6">
          <p
            className="text-[10px] uppercase tracking-[0.22em] mb-3"
            style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
          >
            All client links
          </p>
          <ul className="space-y-2">
            {links.map((l) => {
              const url = `https://${masterHost}/get-started?link=${l.link_token}`;
              const statusLabel = l.submitted_at
                ? "Submitted"
                : l.clicked_at
                  ? "Clicked"
                  : "Pending";
              const statusColor = l.submitted_at
                ? "var(--primary)"
                : l.clicked_at
                  ? "var(--card-foreground)"
                  : "var(--muted-foreground)";
              return (
                <li
                  key={l.id}
                  className="p-3 rounded-md flex items-center gap-3 flex-wrap"
                  style={{
                    background:
                      "color-mix(in srgb, var(--foreground) 4%, var(--card))",
                    border: "1px solid var(--border)",
                    opacity: l.is_active ? 1 : 0.55,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm truncate"
                      style={{
                        color: "var(--card-foreground)",
                        fontWeight: 600,
                      }}
                    >
                      {l.client_label}{" "}
                      <span
                        className="text-[11px] ml-2"
                        style={{ color: "var(--muted-foreground)", fontWeight: 400 }}
                      >
                        ${(l.agreed_setup_cents / 100).toFixed(0)}
                      </span>
                    </p>
                    <p
                      className="text-[10px] admin-mono truncate"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {url}
                    </p>
                  </div>
                  <span
                    className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                    style={{
                      color: statusColor,
                      background: "color-mix(in srgb, currentColor 12%, transparent)",
                      fontWeight: 700,
                    }}
                  >
                    {l.is_active ? statusLabel : "Disabled"}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyUrl(url)}
                    className="text-[11px]"
                    style={{ color: "var(--card-foreground)" }}
                    title="Copy URL"
                  >
                    {copiedUrl === url ? (
                      <Check size={13} />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(l)}
                    className="text-[11px]"
                    style={{ color: l.is_active ? "var(--destructive)" : "var(--primary)" }}
                    title={l.is_active ? "Deactivate" : "Reactivate"}
                  >
                    <XCircle size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
