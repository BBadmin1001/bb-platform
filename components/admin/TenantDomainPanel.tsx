"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCcw,
  Copy as CopyIcon,
} from "lucide-react";
import { recheckMyDomain } from "@/app/admin/domain/actions";

interface Props {
  customDomain: string | null;
  domainTarget: string;
  domainCheckState: "unset" | "pending" | "verified" | "mismatch";
  domainCheckValue: string | null;
  domainCheckedAt: string | null;
  domainVerifiedAt: string | null;
  tenantStatus: string;
}

const STATE_META: Record<
  Props["domainCheckState"],
  {
    label: string;
    color: string;
    bg: string;
    icon: typeof CheckCircle2;
    body: string;
  }
> = {
  unset: {
    label: "Not connected",
    color: "#666",
    bg: "rgba(0,0,0,0.06)",
    icon: Clock,
    body: "No domain has been assigned to your site yet. Reach out to your platform owner.",
  },
  pending: {
    label: "Awaiting DNS",
    color: "#a65300",
    bg: "rgba(255,167,38,0.16)",
    icon: Clock,
    body: "Your domain isn't pointing at us yet. Add the CNAME records below at your domain registrar — DNS usually propagates within an hour, sometimes up to 24h.",
  },
  verified: {
    label: "Connected",
    color: "#1b5e20",
    bg: "rgba(76,175,80,0.16)",
    icon: CheckCircle2,
    body: "Your DNS is correctly pointing at our hosting. SSL is automatic — your site is ready or already live.",
  },
  mismatch: {
    label: "DNS mismatch",
    color: "#a51a1a",
    bg: "rgba(229,57,53,0.14)",
    icon: AlertTriangle,
    body: "Your domain currently points somewhere else. Check the records below match exactly what's at your registrar.",
  },
};

export default function TenantDomainPanel(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const meta = STATE_META[props.domainCheckState];
  const Icon = meta.icon;

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
      const res = await recheckMyDomain();
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <>
      {/* Headline status */}
      <div
        className="admin-card p-6 mb-6 flex items-start gap-4"
        style={{
          borderColor:
            props.domainCheckState === "verified"
              ? "color-mix(in srgb, #1b5e20 35%, transparent)"
              : props.domainCheckState === "mismatch"
                ? "color-mix(in srgb, #a51a1a 35%, transparent)"
                : "var(--border)",
        }}
      >
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
          style={{ background: meta.bg, color: meta.color }}
        >
          <Icon size={20} />
        </span>
        <div className="flex-1">
          <p className="text-base mb-1" style={{ fontWeight: 600 }}>
            {props.customDomain || "Domain not set"}
          </p>
          <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: meta.color, fontWeight: 700 }}>
            {meta.label}
          </p>
          <p className="text-sm" style={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}>
            {meta.body}
          </p>
        </div>
      </div>

      {/* DNS records to copy */}
      {props.customDomain && (
        <section className="admin-card p-6 mb-6">
          <p
            className="text-xs uppercase tracking-[0.18em] mb-4"
            style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
          >
            DNS records · paste at your registrar
          </p>

          <div className="grid grid-cols-[max-content_1fr_max-content_max-content] gap-x-4 gap-y-2 admin-mono text-sm items-center">
            <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase" }}>Type</span>
            <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase" }}>Name</span>
            <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase" }}>Value</span>
            <span></span>

            <span>CNAME</span>
            <span>@</span>
            <span>{props.domainTarget}</span>
            <button
              type="button"
              onClick={() => copy(props.domainTarget)}
              className="opacity-60 hover:opacity-100"
              aria-label="Copy"
            >
              <CopyIcon size={13} />
            </button>

            <span>CNAME</span>
            <span>www</span>
            <span>{props.domainTarget}</span>
            <button
              type="button"
              onClick={() => copy(props.domainTarget)}
              className="opacity-60 hover:opacity-100"
              aria-label="Copy"
            >
              <CopyIcon size={13} />
            </button>
          </div>

          <p
            className="text-[11px] mt-4 leading-relaxed"
            style={{ color: "var(--muted-foreground)" }}
          >
            <strong>If your registrar doesn't allow CNAME at the apex (@):</strong>{" "}
            use ALIAS or ANAME instead with the same value. GoDaddy and
            Cloudflare support this. As a last resort, ask your platform
            owner for the A-record IPs.
          </p>
        </section>
      )}

      {/* Status detail + recheck */}
      {props.customDomain && (
        <section className="admin-card p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-5">
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
                label="First verified on"
                value={new Date(props.domainVerifiedAt).toLocaleString()}
              />
            )}
            <Field label="Site status" value={props.tenantStatus} mono />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRecheck}
              disabled={pending}
              className="admin-btn"
            >
              <RefreshCcw
                size={13}
                className={`mr-2 ${pending ? "animate-spin" : ""}`}
              />
              {pending ? "Checking…" : "Check now"}
            </button>

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
      )}
    </>
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
