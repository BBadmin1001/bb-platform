"use client";

/**
 * Sales rep dashboard body.
 *
 * Sections:
 *   1. Stat cards: pipeline $, pipeline count, closed-this-month $,
 *                  closed-this-month count.
 *   2. Last 6 months overview: count + revenue per month.
 *   3. Generate client link form (realtor name required, $600 min).
 *   4. All generated links with status pills.
 *   5. All prospects this rep has brought in.
 */

import { useMemo, useState, useTransition } from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle2,
  Plus,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  createMyClientLink,
  setMyLinkActive,
} from "@/app/master/sales-reps/actions";
import { SETUP_FEE_MIN_CENTS } from "@/lib/salesRepConstants";

type LinkRow = {
  id: string;
  link_token: string;
  client_label: string;
  client_email: string | null;
  agreed_setup_cents: number;
  created_at: string;
  clicked_at: string | null;
  submitted_at: string | null;
  is_active: boolean;
  prospect_id: string | null;
};

type Prospect = {
  id: string;
  contact_name: string;
  business_name: string;
  email: string;
  status: string;
  agreed_setup_cents: number | null;
  paid_at: string | null;
  created_at: string;
  intake_submitted_at: string | null;
};

const CLOSED_STATUSES = new Set(["paid", "provisioned"]);
const OPEN_STATUSES = new Set(["new", "contacted", "quoted"]);

function isClosed(status: string) {
  return CLOSED_STATUSES.has(status);
}
function isOpen(status: string) {
  return OPEN_STATUSES.has(status);
}

export default function RepDashboard({
  rep,
  commissionPct,
  links: initialLinks,
  prospects,
  masterHost,
}: {
  rep: { id: string; slug: string; full_name: string };
  /** Percent (0-100) of revenue the rep earns. Master configures from
   *  /master/sales-reps; rep can't change it themselves. */
  commissionPct: number;
  links: LinkRow[];
  prospects: Prospect[];
  masterHost: string;
}) {
  // Pipeline + monthly summaries are derived from `prospects` so they
  // don't drift from the master numbers.
  const stats = useMemo(() => {
    const now = new Date();
    const monthKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const thisMonth = monthKey(now);

    let pipelineCount = 0;
    let pipelineCents = 0;
    let closedThisMonthCount = 0;
    let closedThisMonthCents = 0;

    const monthly = new Map<
      string,
      { label: string; count: number; cents: number }
    >();
    // Seed 6 months back so empty months still render in the strip.
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = monthKey(d);
      monthly.set(k, {
        label: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
        count: 0,
        cents: 0,
      });
    }

    for (const p of prospects) {
      const status = p.status;
      const cents = p.agreed_setup_cents ?? 0;

      if (isOpen(status)) {
        pipelineCount += 1;
        pipelineCents += cents;
      }

      // Bucket by month — use paid_at when closed, else created_at.
      const ts = isClosed(status) && p.paid_at ? p.paid_at : p.created_at;
      if (ts) {
        const d = new Date(ts);
        const k = monthKey(d);
        const bucket = monthly.get(k);
        if (bucket) {
          if (isClosed(status)) {
            bucket.count += 1;
            bucket.cents += cents;
          }
        }
        if (isClosed(status) && k === thisMonth) {
          closedThisMonthCount += 1;
          closedThisMonthCents += cents;
        }
      }
    }

    return {
      pipelineCount,
      pipelineCents,
      closedThisMonthCount,
      closedThisMonthCents,
      monthly: Array.from(monthly.values()),
    };
  }, [prospects]);

  return (
    <div className="space-y-10">
      {/* Stat cards — show COMMISSION (rep's earnings) instead of raw
          revenue. Rate is set per-rep by master from /master/sales-reps. */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={DollarSign}
            label={`Pipeline commission (${commissionPct.toFixed(0)}%)`}
            value={`$${((stats.pipelineCents * commissionPct) / 100 / 100).toFixed(0)}`}
            hint={`${stats.pipelineCount} open ${stats.pipelineCount === 1 ? "deal" : "deals"}`}
            color="var(--primary)"
          />
          <StatCard
            icon={Users}
            label="In pipeline"
            value={String(stats.pipelineCount)}
            hint="Open prospects"
          />
          <StatCard
            icon={CheckCircle2}
            label="Commission this month"
            value={`$${((stats.closedThisMonthCents * commissionPct) / 100 / 100).toFixed(0)}`}
            hint={`${stats.closedThisMonthCount} ${stats.closedThisMonthCount === 1 ? "deal" : "deals"}`}
            color="var(--primary)"
          />
          <StatCard
            icon={TrendingUp}
            label="Total closed"
            value={String(
              prospects.filter((p) => isClosed(p.status)).length,
            )}
            hint="All time"
          />
        </div>
        {commissionPct === 0 && (
          <p
            className="mt-3 text-[11px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            Commission rate is 0% — ask master to set it from{" "}
            <code>/master/sales-reps</code>.
          </p>
        )}
      </section>

      {/* Last-6-months strip */}
      <section className="admin-card p-5">
        <p
          className="text-[10px] uppercase tracking-[0.22em] mb-4"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Last 6 months · closed deals
        </p>
        <div className="grid grid-cols-6 gap-2">
          {stats.monthly.map((m) => (
            <div
              key={m.label}
              className="text-center p-3 rounded-md"
              style={{
                background:
                  m.count > 0
                    ? "color-mix(in srgb, var(--primary) 8%, var(--card))"
                    : "color-mix(in srgb, var(--foreground) 3%, var(--card))",
                border: "1px solid var(--border)",
              }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.18em] mb-1"
                style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
              >
                {m.label}
              </p>
              <p
                className="text-base"
                style={{
                  color: m.count > 0 ? "var(--primary)" : "var(--muted-foreground)",
                  fontWeight: 700,
                }}
              >
                {m.count}
              </p>
              <p
                className="text-[10px]"
                style={{ color: "var(--muted-foreground)" }}
              >
                ${((m.cents * commissionPct) / 100 / 100).toFixed(0)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Link generator */}
      <LinkGenerator
        rep={rep}
        masterHost={masterHost}
        initialLinks={initialLinks}
      />

      {/* Prospects list */}
      <section className="admin-card p-6">
        <p
          className="text-[10px] uppercase tracking-[0.22em] mb-4"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Your prospects · {prospects.length}
        </p>
        {prospects.length === 0 ? (
          <p
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No prospects yet. Generate a link below and send it to a client.
          </p>
        ) : (
          <ul className="space-y-2">
            {prospects.map((p) => {
              const pill = pillForStatus(p.status);
              return (
                <li
                  key={p.id}
                  className="p-3 rounded-md flex items-center gap-3 flex-wrap"
                  style={{
                    background:
                      "color-mix(in srgb, var(--foreground) 4%, var(--card))",
                    border: "1px solid var(--border)",
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
                      {p.contact_name}{" "}
                      <span
                        className="text-[11px] ml-2"
                        style={{
                          color: "var(--muted-foreground)",
                          fontWeight: 400,
                        }}
                      >
                        {p.business_name}
                      </span>
                    </p>
                    <p
                      className="text-[11px] truncate"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {p.email} ·{" "}
                      {p.agreed_setup_cents
                        ? `$${(p.agreed_setup_cents / 100).toFixed(0)}`
                        : "no price set"}
                      {p.paid_at && (
                        <>
                          {" "}
                          · paid{" "}
                          {new Date(p.paid_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </>
                      )}
                    </p>
                  </div>
                  <span
                    className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                    style={{
                      color: pill.color,
                      background:
                        "color-mix(in srgb, currentColor 12%, transparent)",
                      fontWeight: 700,
                    }}
                  >
                    {pill.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function pillForStatus(status: string): { label: string; color: string } {
  switch (status) {
    case "new":
      return { label: "New", color: "var(--muted-foreground)" };
    case "contacted":
      return { label: "Contacted", color: "var(--card-foreground)" };
    case "quoted":
      return { label: "Quoted", color: "var(--card-foreground)" };
    case "paid":
      return { label: "Paid", color: "var(--primary)" };
    case "provisioned":
      return { label: "Live", color: "var(--primary)" };
    case "abandoned":
      return { label: "Lost", color: "var(--destructive)" };
    default:
      return { label: status, color: "var(--muted-foreground)" };
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  color,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  hint?: string;
  color?: string;
}) {
  return (
    <div className="admin-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon
          size={14}
          strokeWidth={1.6}
          style={{ color: color ?? "var(--muted-foreground)" }}
        />
        <p
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          {label}
        </p>
      </div>
      <p
        className="text-2xl mb-1"
        style={{
          color: color ?? "var(--card-foreground)",
          fontWeight: 700,
          letterSpacing: "0.005em",
        }}
      >
        {value}
      </p>
      {hint && (
        <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function LinkGenerator({
  rep,
  masterHost,
  initialLinks,
}: {
  rep: { id: string; slug: string };
  masterHost: string;
  initialLinks: LinkRow[];
}) {
  const [realtorName, setRealtorName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [priceDollars, setPriceDollars] = useState("600");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [links, setLinks] = useState<LinkRow[]>(initialLinks);
  const [lastCreated, setLastCreated] = useState<{
    token: string;
    url: string;
  } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  function generate() {
    setError(null);
    setLastCreated(null);

    const priceNum = parseFloat(priceDollars);
    if (!Number.isFinite(priceNum) || priceNum * 100 < SETUP_FEE_MIN_CENTS) {
      setError(
        `Price must be at least $${(SETUP_FEE_MIN_CENTS / 100).toFixed(0)}.`,
      );
      return;
    }
    if (!realtorName.trim()) {
      setError("Realtor name is required.");
      return;
    }

    startTransition(async () => {
      const res = await createMyClientLink({
        realtor_name: realtorName,
        client_email: clientEmail || undefined,
        agreed_setup_cents: Math.round(priceNum * 100),
        notes: notes || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLastCreated({ token: res.link_token, url: res.url });
      setLinks([
        {
          // Real row id from server so deactivate works (A4-002).
          id: res.link_id,
          link_token: res.link_token,
          client_label: realtorName.trim(),
          client_email: clientEmail.trim() || null,
          agreed_setup_cents: Math.round(priceNum * 100),
          created_at: new Date().toISOString(),
          clicked_at: null,
          submitted_at: null,
          is_active: true,
          prospect_id: null,
        },
        ...links,
      ]);
      setRealtorName("");
      setClientEmail("");
      setNotes("");
    });
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {}
  }

  function toggleActive(link: LinkRow) {
    if (
      link.is_active &&
      !confirm(
        `Deactivate the link for ${link.client_label}? The URL stops working immediately.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await setMyLinkActive(link.id, !link.is_active);
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
    <section className="admin-card p-6">
      <p
        className="text-[10px] uppercase tracking-[0.22em] mb-3"
        style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
      >
        Generate client onboarding link
      </p>
      <p
        className="text-sm mb-5"
        style={{ color: "var(--muted-foreground)" }}
      >
        One link per client. Pricing is sealed server-side — the customer
        can&apos;t lower it by editing the URL. Minimum $
        {(SETUP_FEE_MIN_CENTS / 100).toFixed(0)}.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="admin-label">
            Realtor name <span style={{ color: "var(--destructive)" }}>*</span>
          </label>
          <input
            type="text"
            className="admin-input"
            value={realtorName}
            onChange={(e) => setRealtorName(e.target.value)}
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className="admin-label">
            Agreed price · USD <span style={{ color: "var(--destructive)" }}>*</span>
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
            Minimum ${(SETUP_FEE_MIN_CENTS / 100).toFixed(0)}.
          </p>
        </div>
        <div className="md:col-span-2">
          <label className="admin-label">
            Realtor email (optional · pre-fills wizard)
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
          <label className="admin-label">Your notes (optional)</label>
          <input
            type="text"
            className="admin-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Met at Saturday open house · wants flyers add-on"
          />
        </div>
      </div>

      {error && (
        <p
          className="text-xs mb-3 flex items-center gap-1"
          style={{ color: "var(--destructive)" }}
        >
          <AlertCircle size={12} />
          {error}
        </p>
      )}

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
            Link ready
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

      {links.length > 0 && (
        <div className="mt-6">
          <p
            className="text-[10px] uppercase tracking-[0.22em] mb-3"
            style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
          >
            Your links · {links.length}
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
                        style={{
                          color: "var(--muted-foreground)",
                          fontWeight: 400,
                        }}
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
                      background:
                        "color-mix(in srgb, currentColor 12%, transparent)",
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
                    {copiedUrl === url ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(l)}
                    className="text-[11px]"
                    style={{
                      color: l.is_active
                        ? "var(--destructive)"
                        : "var(--primary)",
                    }}
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

