/**
 * Cloudinary plan tracker — reads pre-fetched usage stats and explains
 * them in plain English (no Cloudinary jargon).
 *
 * Cloudinary's Free plan is governed by a single unified metric called
 * "credits" (25 / month). Storage and bandwidth both draw from that pool.
 * The headline shows credits — that's the only number that actually
 * triggers an upload pause when it hits 100%. The two info rows below
 * show storage + bandwidth in human-readable units.
 */

import {
  HardDrive,
  Activity,
  Zap,
  AlertCircle,
  Info,
} from "lucide-react";
import { formatBytes, type UsageResult } from "@/lib/cloudinaryAdmin";

function tone(percent: number): {
  bar: string;
  pillBg: string;
  pillFg: string;
  label: string;
} {
  if (percent >= 90) {
    return {
      bar: "var(--destructive)",
      pillBg: "color-mix(in srgb, var(--destructive) 14%, transparent)",
      pillFg: "var(--destructive)",
      label: "Almost full",
    };
  }
  if (percent >= 70) {
    return {
      bar: "#f59e0b",
      pillBg: "rgba(245, 158, 11, 0.14)",
      pillFg: "#b45309",
      label: "Watch usage",
    };
  }
  return {
    bar: "var(--primary)",
    pillBg: "var(--accent)",
    pillFg: "var(--accent-foreground)",
    label: "Healthy",
  };
}

export default function MediaUsageBar({ usage }: { usage: UsageResult }) {
  if (!usage.configured) {
    return (
      <div
        className="admin-card p-5 mb-6 flex items-start gap-3"
        style={{
          borderColor: "color-mix(in srgb, var(--destructive) 30%, var(--border))",
          background: "color-mix(in srgb, var(--destructive) 6%, var(--card))",
        }}
      >
        <AlertCircle
          size={18}
          className="shrink-0 mt-0.5"
          style={{ color: "var(--destructive)" }}
        />
        <div className="text-xs leading-relaxed">
          <p
            className="mb-1"
            style={{ color: "var(--card-foreground)", fontWeight: 600 }}
          >
            Storage tracker isn&apos;t connected.
          </p>
          <p style={{ color: "var(--muted-foreground)" }}>{usage.reason}</p>
        </div>
      </div>
    );
  }

  const t = tone(usage.credits.percent);
  const pct = Math.round(usage.credits.percent);

  return (
    <div className="admin-card p-6 mb-6">
      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p
            className="text-[0.65rem] uppercase tracking-[0.22em] mb-1.5"
            style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
          >
            Cloudinary · {usage.plan} plan
          </p>
          <h2
            className="text-lg leading-tight"
            style={{ color: "var(--card-foreground)", fontWeight: 600 }}
          >
            {pct < 1
              ? `Less than 1% of your monthly plan used.`
              : `About ${pct}% of your monthly plan used.`}
          </h2>
          <p
            className="text-xs mt-1.5 max-w-2xl leading-relaxed"
            style={{ color: "var(--muted-foreground)" }}
          >
            Your Free plan includes <strong>25 credits per month</strong>. 1
            credit ≈ 1&nbsp;GB of photos stored, OR 1&nbsp;GB of bandwidth
            (visitor downloads), OR ~1,000 image edits — they all share the
            same pool.
          </p>
        </div>

        <span
          className="text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{
            background: t.pillBg,
            color: t.pillFg,
            fontWeight: 700,
          }}
        >
          {t.label}
        </span>
      </div>

      {/* ── HEADLINE BAR (credits) ─────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span
            className="inline-flex items-center gap-1.5 text-sm"
            style={{ color: "var(--card-foreground)", fontWeight: 600 }}
          >
            <Zap size={14} />
            Monthly plan usage
          </span>
          <span
            className="admin-mono text-sm"
            style={{ color: "var(--card-foreground)", fontWeight: 600 }}
          >
            {usage.credits.used.toFixed(2)}{" "}
            <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>
              / {usage.credits.limit} credits
            </span>
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: "var(--muted)" }}
        >
          <div
            className="h-full transition-[width] duration-700"
            style={{
              width: `${Math.max(2, Math.min(100, usage.credits.percent))}%`,
              background: t.bar,
            }}
          />
        </div>
        <p
          className="text-[11px] mt-2 inline-flex items-start gap-1.5"
          style={{ color: "var(--muted-foreground)" }}
        >
          <Info size={11} className="mt-[1px] shrink-0" />
          <span>
            When this hits 25, new uploads pause until next month — or until
            you upgrade.
          </span>
        </p>
      </div>

      {/* ── INFO ROWS (storage + bandwidth) ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoRow
          icon={HardDrive}
          title="Photos & videos stored"
          value={formatBytes(usage.storage.usedBytes)}
          hint="The total size of your library sitting on Cloudinary's servers right now."
        />
        <InfoRow
          icon={Activity}
          title="Sent to visitors this month"
          value={formatBytes(usage.bandwidth.usedBytes)}
          hint="How much data your visitors have downloaded so far this month — resets on the 1st."
        />
      </div>

      <p
        className="text-[10px] mt-5"
        style={{ color: "var(--muted-foreground)" }}
      >
        Updated {new Date(usage.asOf).toLocaleString()}
      </p>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  title,
  value,
  hint,
}: {
  icon: typeof HardDrive;
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div
      className="rounded-md p-4"
      style={{
        background: "var(--muted)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="inline-flex items-center gap-1.5 text-xs"
          style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
        >
          <Icon size={12} />
          {title}
        </span>
        <span
          className="admin-mono text-sm"
          style={{ color: "var(--card-foreground)", fontWeight: 600 }}
        >
          {value}
        </span>
      </div>
      <p
        className="text-[11px] leading-relaxed"
        style={{ color: "var(--muted-foreground)" }}
      >
        {hint}
      </p>
    </div>
  );
}
