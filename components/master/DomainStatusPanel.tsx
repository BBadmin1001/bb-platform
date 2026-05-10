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
} from "lucide-react";
import {
  runDomainCheck,
  promoteToActive,
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
            value={props.domainCheckValue ?? "—"}
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

      <div className="flex flex-wrap items-center gap-3">
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
