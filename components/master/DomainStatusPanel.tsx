"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCcw,
  Rocket,
  Copy as CopyIcon,
  Link2,
  Plug,
} from "lucide-react";
import {
  runDomainCheck,
  promoteToActive,
  syncNetlifyAlias,
} from "@/app/master/tenants/actions";

interface Props {
  slug: string;
  status: string;
  customDomain: string | null;
  domainTarget: string | null;
  domainCheckState: "unset" | "pending" | "verified" | "mismatch";
  domainCheckValue: string | null;
  domainCheckedAt: string | null;
  domainVerifiedAt: string | null;
  /** Default DNS target from env, used when row hasn't recorded one yet. */
  fallbackTarget: string;

  /** Netlify alias sync state — surfaced beneath the DNS panel. */
  netlifyAliasAddedAt: string | null;
  netlifyAliasSyncedFor: string | null;
  netlifyAliasError: string | null;
  netlifyLastSyncedAt: string | null;
}

const STATE_META: Record<
  Props["domainCheckState"],
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  unset: {
    label: "No domain set",
    color: "#666",
    bg: "rgba(0,0,0,0.06)",
    icon: Clock,
  },
  pending: {
    label: "Awaiting DNS",
    color: "#a65300",
    bg: "rgba(255,167,38,0.16)",
    icon: Clock,
  },
  verified: {
    label: "Verified",
    color: "#1b5e20",
    bg: "rgba(76,175,80,0.16)",
    icon: CheckCircle2,
  },
  mismatch: {
    label: "DNS mismatch",
    color: "#a51a1a",
    bg: "rgba(229,57,53,0.14)",
    icon: AlertTriangle,
  },
};

export default function DomainStatusPanel(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const meta = STATE_META[props.domainCheckState];
  const Icon = meta.icon;
  const target = props.domainTarget || props.fallbackTarget;

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setInfo("Copied.");
      setTimeout(() => setInfo(null), 1500);
    });
  }

  function handleRecheck() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await runDomainCheck(props.slug);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  function handlePromote() {
    setError(null);
    if (!confirm(`Promote ${props.slug} to active? Their site goes live on ${props.customDomain}.`)) {
      return;
    }
    startTransition(async () => {
      const res = await promoteToActive(props.slug);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  function handleSyncNetlify() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await syncNetlifyAlias(props.slug);
      if (!res.ok) return setError(res.error);
      setInfo("Netlify alias synced.");
      router.refresh();
    });
  }

  // Netlify status derives from the four columns. Categories:
  //   - synced       : alias added, current domain matches what was synced
  //   - drifted      : alias was synced but to a different domain (rare —
  //                    happens when admin edits the row directly in DB)
  //   - error        : last attempt produced an error message
  //   - unconfigured : env not set (the canonical "skipped" message)
  //   - unknown      : never tried yet
  type NetlifyState = "synced" | "drifted" | "error" | "unconfigured" | "unknown";
  const netlifyState: NetlifyState = (() => {
    if (
      props.netlifyAliasError?.toLowerCase().includes("not configured")
    ) {
      return "unconfigured";
    }
    if (props.netlifyAliasError) return "error";
    if (
      props.netlifyAliasAddedAt &&
      props.netlifyAliasSyncedFor === props.customDomain
    ) {
      return "synced";
    }
    if (props.netlifyAliasAddedAt) return "drifted";
    return "unknown";
  })();
  const NETLIFY_PILL: Record<NetlifyState, { label: string; bg: string; fg: string }> = {
    synced: { label: "Synced", bg: "rgba(76,175,80,0.16)", fg: "#1b5e20" },
    drifted: { label: "Out of sync", bg: "rgba(255,167,38,0.16)", fg: "#a65300" },
    error: { label: "Error", bg: "rgba(229,57,53,0.14)", fg: "#a51a1a" },
    unconfigured: { label: "Not configured", bg: "rgba(0,0,0,0.06)", fg: "#555" },
    unknown: { label: "Not yet synced", bg: "rgba(0,0,0,0.06)", fg: "#555" },
  };
  const netlifyPill = NETLIFY_PILL[netlifyState];

  return (
    <section className="admin-card p-6 mb-10">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <p
            className="text-xs uppercase tracking-[0.18em] mb-1"
            style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
          >
            Domain status
          </p>
          <p
            className="text-sm admin-mono"
            style={{ color: "var(--card-foreground)", fontWeight: 600 }}
          >
            {props.customDomain || "Not set yet"}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px]"
          style={{
            background: meta.bg,
            color: meta.color,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <Icon size={12} />
          {meta.label}
        </span>
      </div>

      {/* DNS instructions — shown once a domain is set */}
      {props.customDomain && (
        <div
          className="rounded-md mb-5 p-4 text-xs"
          style={{
            background: "color-mix(in srgb, var(--primary) 4%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 16%, transparent)",
            color: "var(--card-foreground)",
          }}
        >
          <p className="mb-2" style={{ fontWeight: 600 }}>
            Customer's DNS records (paste at their registrar):
          </p>
          <div className="grid grid-cols-[max-content_1fr_max-content] gap-x-4 gap-y-1.5 admin-mono items-center">
            <span style={{ color: "var(--muted-foreground)" }}>Type</span>
            <span style={{ color: "var(--muted-foreground)" }}>Name</span>
            <span style={{ color: "var(--muted-foreground)" }}>Value</span>

            <span>CNAME</span>
            <span>@ (or apex)</span>
            <span className="flex items-center gap-2">
              {target}
              <button
                type="button"
                onClick={() => copy(target)}
                className="opacity-60 hover:opacity-100"
                aria-label="Copy"
              >
                <CopyIcon size={12} />
              </button>
            </span>

            <span>CNAME</span>
            <span>www</span>
            <span className="flex items-center gap-2">
              {target}
              <button
                type="button"
                onClick={() => copy(target)}
                className="opacity-60 hover:opacity-100"
                aria-label="Copy"
              >
                <CopyIcon size={12} />
              </button>
            </span>
          </div>
          <p
            className="mt-3"
            style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}
          >
            Some registrars (GoDaddy, Namecheap) don't allow CNAME at the apex.
            On those, use ALIAS / ANAME with the same value, or fall back to
            Netlify's A records.
          </p>
        </div>
      )}

      {/* Live state — what we last observed */}
      {props.customDomain && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-5">
          <Field
            label="Last checked"
            value={
              props.domainCheckedAt
                ? new Date(props.domainCheckedAt).toLocaleString()
                : "Never"
            }
          />
          <Field
            label="Currently resolves to"
            value={
              props.domainCheckValue && props.domainCheckValue.trim()
                ? props.domainCheckValue
                : "— not resolving"
            }
            mono
          />
          {props.domainVerifiedAt && (
            <Field
              label="First verified"
              value={new Date(props.domainVerifiedAt).toLocaleString()}
            />
          )}
        </div>
      )}

      {/* Netlify alias section — surfaces whether the platform-side
          domain alias is in place and gives master a one-click resync. */}
      {props.customDomain && (
        <div
          className="rounded-md mt-5 p-4 border flex items-start gap-3"
          style={{
            background: "color-mix(in srgb, var(--card) 96%, transparent)",
            borderColor: "var(--border)",
          }}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-md shrink-0 mt-0.5"
            style={{
              background: "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "var(--primary)",
            }}
          >
            <Plug size={14} strokeWidth={1.6} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p
                className="text-xs uppercase tracking-[0.18em]"
                style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
              >
                Netlify alias
              </p>
              <span
                className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                style={{
                  background: netlifyPill.bg,
                  color: netlifyPill.fg,
                  fontWeight: 700,
                }}
              >
                {netlifyPill.label}
              </span>
              {props.netlifyLastSyncedAt && (
                <span
                  className="text-[10px] admin-mono"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  · last try {new Date(props.netlifyLastSyncedAt).toLocaleString()}
                </span>
              )}
            </div>
            {netlifyState === "synced" && (
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                <code className="admin-mono">{props.netlifyAliasSyncedFor}</code>{" "}
                is registered as a domain alias on the Netlify site. SSL is
                provisioning automatically.
              </p>
            )}
            {netlifyState === "drifted" && (
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Alias is registered as{" "}
                <code className="admin-mono">{props.netlifyAliasSyncedFor}</code>{" "}
                but the row's current domain is{" "}
                <code className="admin-mono">{props.customDomain}</code>. Sync
                to reconcile.
              </p>
            )}
            {netlifyState === "error" && (
              <p
                className="text-xs"
                style={{ color: "var(--destructive)", fontWeight: 500 }}
              >
                {props.netlifyAliasError}
              </p>
            )}
            {netlifyState === "unconfigured" && (
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Set <code className="admin-mono">NETLIFY_API_TOKEN</code> +{" "}
                <code className="admin-mono">NETLIFY_SITE_ID</code> in env to
                auto-add aliases on save. Right now you'll need to add this
                domain manually in the Netlify dashboard.
              </p>
            )}
            {netlifyState === "unknown" && (
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Not synced yet. Click below to add this domain as an alias on
                the platform's Netlify site.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <button
          type="button"
          onClick={handleRecheck}
          disabled={pending || !props.customDomain}
          className="admin-btn admin-btn-secondary"
        >
          <RefreshCcw
            size={13}
            className={`mr-2 ${pending ? "animate-spin" : ""}`}
          />
          {pending ? "Checking…" : "Recheck DNS"}
        </button>

        {props.customDomain && (
          <button
            type="button"
            onClick={handleSyncNetlify}
            disabled={pending}
            className="admin-btn admin-btn-secondary"
            title="Re-add this domain as a Netlify alias"
          >
            <Link2 size={13} className="mr-2" />
            Sync to Netlify
          </button>
        )}

        {props.customDomain &&
          props.domainCheckState === "verified" &&
          props.status !== "active" && (
            <button
              type="button"
              onClick={handlePromote}
              disabled={pending}
              className="admin-btn"
            >
              <Rocket size={13} className="mr-2" />
              Go live
            </button>
          )}

        {error && (
          <span
            className="text-xs"
            style={{ color: "var(--destructive)", fontWeight: 600 }}
          >
            {error}
          </span>
        )}
        {info && (
          <span
            className="text-xs"
            style={{ color: "var(--primary)", fontWeight: 600 }}
          >
            {info}
          </span>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-[0.22em] mb-1"
        style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
      >
        {label}
      </p>
      <p
        className={mono ? "admin-mono" : ""}
        style={{ color: "var(--card-foreground)" }}
      >
        {value}
      </p>
    </div>
  );
}
