/**
 * Built-in pageview analytics summary (Phase 24).
 *
 * Server component — pure SSR, no JS shipped. Reads the
 * tenant_pageviews table (RLS scopes by has_tenant_access) and
 * renders a small set of summary cards:
 *
 *   - Total pageviews (last 30 days)
 *   - Approximate unique visitors (distinct visitor_hash, last 30 days)
 *   - Top 5 pages
 *   - Top 5 referrers
 *   - 30-day daily trend strip
 */

import { Eye, Users, TrendingUp, ExternalLink } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant/context";

type Row = {
  path: string;
  referrer: string | null;
  visitor_hash: string | null;
  visited_at: string;
};

export default async function BuiltinAnalytics() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const svc = createServiceClient();
  // Pull last 30 days.
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rowsRaw } = await svc
    .from("tenant_pageviews")
    .select("path, referrer, visitor_hash, visited_at")
    .eq("tenant_id", tenantId)
    .gte("visited_at", cutoff)
    .order("visited_at", { ascending: false })
    .limit(10000); // sanity cap

  const rows = (rowsRaw ?? []) as Row[];

  // Aggregate.
  const totalViews = rows.length;
  const uniqueVisitors = new Set(
    rows.map((r) => r.visitor_hash ?? "").filter(Boolean),
  ).size;

  const pageCounts = new Map<string, number>();
  for (const r of rows) {
    pageCounts.set(r.path, (pageCounts.get(r.path) ?? 0) + 1);
  }
  const topPages = [...pageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const refCounts = new Map<string, number>();
  for (const r of rows) {
    let host = "(direct)";
    if (r.referrer) {
      try {
        host = new URL(r.referrer).host;
      } catch {
        host = r.referrer.slice(0, 64);
      }
    }
    refCounts.set(host, (refCounts.get(host) ?? 0) + 1);
  }
  const topReferrers = [...refCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 30-day daily trend.
  const days: { date: string; label: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      date: key,
      label: d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count: 0,
    });
  }
  for (const r of rows) {
    const key = r.visited_at.slice(0, 10);
    const day = days.find((d) => d.date === key);
    if (day) day.count += 1;
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  return (
    <section className="space-y-6 mb-10">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card icon={Eye} label="Pageviews · last 30d" value={totalViews} />
        <Card
          icon={Users}
          label="Unique visitors (approx)"
          value={uniqueVisitors}
        />
        <Card
          icon={TrendingUp}
          label="Avg per day"
          value={Math.round(totalViews / 30)}
        />
      </div>

      {/* 30-day strip */}
      <div className="admin-card p-5">
        <p
          className="text-[10px] uppercase tracking-[0.22em] mb-3"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Daily pageviews · last 30 days
        </p>
        <div className="flex items-end gap-1" style={{ height: 80 }}>
          {days.map((d) => (
            <div
              key={d.date}
              className="flex-1 rounded-sm relative group"
              style={{
                height: `${(d.count / maxDay) * 100}%`,
                minHeight: 2,
                background:
                  d.count > 0
                    ? "var(--primary)"
                    : "color-mix(in srgb, var(--foreground) 8%, transparent)",
              }}
              title={`${d.label} · ${d.count}`}
            />
          ))}
        </div>
        <div
          className="flex items-center justify-between mt-1 text-[10px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span>{days[0].label}</span>
          <span>{days[days.length - 1].label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="admin-card p-5">
          <p
            className="text-[10px] uppercase tracking-[0.22em] mb-3"
            style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
          >
            Top pages · last 30d
          </p>
          {topPages.length === 0 ? (
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              No data yet. Share your site to start collecting.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {topPages.map(([path, n]) => (
                <li
                  key={path}
                  className="flex items-center justify-between text-sm"
                >
                  <code
                    className="admin-mono truncate flex-1 mr-3"
                    style={{
                      color: "var(--card-foreground)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {path}
                  </code>
                  <span
                    style={{
                      color: "var(--primary)",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {n}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="admin-card p-5">
          <p
            className="text-[10px] uppercase tracking-[0.22em] mb-3"
            style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
          >
            Top referrers · last 30d
          </p>
          {topReferrers.length === 0 ? (
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              No data yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {topReferrers.map(([host, n]) => (
                <li
                  key={host}
                  className="flex items-center justify-between text-sm"
                >
                  <span
                    className="truncate flex-1 mr-3 inline-flex items-center gap-1.5"
                    style={{ color: "var(--card-foreground)" }}
                  >
                    {host !== "(direct)" && <ExternalLink size={11} />}
                    {host}
                  </span>
                  <span
                    style={{
                      color: "var(--primary)",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {n}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function Card({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
}) {
  return (
    <div className="admin-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon
          size={14}
          strokeWidth={1.6}
          style={{ color: "var(--muted-foreground)" }}
        />
        <p
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          {label}
        </p>
      </div>
      <p
        className="text-2xl"
        style={{
          color: "var(--card-foreground)",
          fontWeight: 700,
          letterSpacing: "0.005em",
        }}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
