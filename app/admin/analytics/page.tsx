import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  Plug,
  TrendingUp,
  Eye,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import { getAnalyticsIntegration } from "@/lib/integrationStore";
import { tenantHasFeature } from "@/lib/features";
import { UpgradeBanner } from "@/components/admin/UpgradeBanner";
import BuiltinAnalytics from "@/components/admin/BuiltinAnalytics";

/**
 * Website Analytics dashboard.
 *
 * v1 — focuses on getting the GA tag installed easily and deep-linking to
 * the GA dashboard for actual data viewing. Embedded GA charts (using the
 * GA Data API + OAuth) are a v2 follow-up; the placeholder cards below
 * tell the admin exactly what's coming.
 */
export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Built-in pageview analytics are always available (Phase 24).
  // The GA4 integration + advanced Data API embeds stay feature-gated.
  const hasAnalytics = await tenantHasFeature("analytics");

  const integration = await getAnalyticsIntegration();
  const isConnected = Boolean(integration?.enabled && integration.config?.measurementId);
  const measurementId = integration?.config?.measurementId ?? null;

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-5xl mx-auto py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs mb-6"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ArrowLeft size={14} /> Back to Site Editor
        </Link>

        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
          style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
        >
          Site Editor · Analytics
        </p>
        <h1
          className="text-2xl md:text-3xl mb-2"
          style={{
            color: "var(--foreground)",
            fontWeight: 600,
            letterSpacing: "0.005em",
          }}
        >
          Website Analytics.
        </h1>
        <p
          className="text-sm max-w-2xl mb-10"
          style={{ color: "var(--muted-foreground)" }}
        >
          See how visitors find and use the site — page views, traffic
          sources, popular pages, conversions.
        </p>

        {/* Built-in pageview analytics (Phase 24) — free for every
            tenant. Privacy-respecting, no cookies, no IPs stored. */}
        <BuiltinAnalytics />

        {/* Google Analytics 4 — feature-gated upgrade for advanced
            reports (audience, conversion funnels, attribution). */}
        {!hasAnalytics ? (
          <>
            <h2
              className="text-base mt-4 mb-3"
              style={{
                color: "var(--card-foreground)",
                fontWeight: 600,
              }}
            >
              Want more — sessions, audiences, conversions?
            </h2>
            <UpgradeBanner feature="analytics" />
          </>
        ) : isConnected ? (
          <div
            className="admin-card p-5 mb-8 flex flex-wrap items-center justify-between gap-4"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 25%, var(--border))",
              background:
                "color-mix(in srgb, var(--primary) 5%, var(--card))",
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 18%, var(--card))",
                  color: "var(--primary)",
                }}
              >
                <Check size={18} strokeWidth={2} />
              </span>
              <div>
                <p
                  className="text-sm"
                  style={{
                    color: "var(--card-foreground)",
                    fontWeight: 600,
                  }}
                >
                  Tracking is live
                </p>
                <p
                  className="text-xs admin-mono"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {measurementId}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="https://analytics.google.com/analytics/web/"
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn"
              >
                <BarChart3 size={13} className="mr-2" />
                Open GA dashboard
                <ArrowUpRight size={12} className="ml-1.5" />
              </a>
              <Link
                href="/admin/integrations/analytics"
                className="admin-btn admin-btn-secondary"
              >
                Manage
              </Link>
            </div>
          </div>
        ) : (
          <div className="admin-card p-6 mb-8">
            <div className="flex items-start gap-4">
              <span
                className="shrink-0 flex h-12 w-12 items-center justify-center rounded-full"
                style={{
                  background:
                    "color-mix(in srgb, var(--destructive) 12%, transparent)",
                  color: "var(--destructive)",
                }}
              >
                <Plug size={20} strokeWidth={1.5} />
              </span>
              <div className="flex-1">
                <h3
                  className="text-base mb-1"
                  style={{
                    color: "var(--card-foreground)",
                    fontWeight: 600,
                  }}
                >
                  Analytics not connected yet
                </h3>
                <p
                  className="text-xs leading-relaxed mb-4"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Hook up Google Analytics 4 in under 2 minutes — paste your
                  Measurement ID and we&apos;ll inject the tracking tag on
                  every page automatically.
                </p>
                <Link
                  href="/admin/integrations/analytics"
                  className="admin-btn"
                >
                  Set up Google Analytics
                  <ArrowUpRight size={12} className="ml-1.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Placeholder metric cards for the future Data API integration */}
        <p
          className="text-[10px] uppercase tracking-[0.22em] mb-3"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Embedded reports · coming soon
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <SoonCard
            icon={Eye}
            title="Page views"
            hint="Total + per-page breakdown over the last 30 days."
          />
          <SoonCard
            icon={TrendingUp}
            title="Traffic sources"
            hint="Where visitors come from — Google, Instagram, direct, referrals."
          />
          <SoonCard
            icon={BarChart3}
            title="Top performing pages"
            hint="Which pages keep visitors on site longest."
          />
        </div>

        <div
          className="admin-card p-5 text-xs leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          <p>
            <strong style={{ color: "var(--card-foreground)" }}>
              About embedded reports.
            </strong>{" "}
            For now, charts live in the Google Analytics dashboard itself —
            click <em>Open GA dashboard</em> above. We&apos;ll embed those
            same numbers inside this page once you&apos;re ready: that
            requires a separate OAuth integration with Google&apos;s Data
            API. Tell me when you want it and we&apos;ll build it next.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}

function SoonCard({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof BarChart3;
  title: string;
  hint: string;
}) {
  return (
    <div
      className="admin-card p-5 relative overflow-hidden"
      style={{ opacity: 0.85 }}
    >
      <span
        className="absolute right-3 top-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
        style={{
          color: "var(--muted-foreground)",
          background: "color-mix(in srgb, var(--foreground) 6%, transparent)",
          fontWeight: 600,
        }}
      >
        <Lock size={9} /> Soon
      </span>
      <Icon
        size={20}
        strokeWidth={1.5}
        style={{ color: "var(--muted-foreground)" }}
      />
      <h4
        className="text-sm mt-3 mb-1"
        style={{ color: "var(--card-foreground)", fontWeight: 600 }}
      >
        {title}
      </h4>
      <p
        className="text-[11px] leading-relaxed"
        style={{ color: "var(--muted-foreground)" }}
      >
        {hint}
      </p>
    </div>
  );
}
