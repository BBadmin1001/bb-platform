import Link from "next/link";
import {
  Building2,
  CreditCard,
  Inbox as InboxIcon,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { requireSuperAdmin } from "@/lib/master";

export const dynamic = "force-dynamic";

/**
 * Master dashboard — quick stats at the top, jump-off cards below.
 * Numbers are live-fetched on every render (force-dynamic) since
 * tenant counts move in seconds during onboarding pushes.
 */
export default async function MasterDashboard() {
  const { supabase, user } = await requireSuperAdmin();

  // Pull counts in parallel.
  const [
    { count: tenantCount },
    { count: activeTenantCount },
    { count: planCount },
    { count: leadCount },
    { count: subCount },
  ] = await Promise.all([
    supabase.from("tenants").select("id", { count: "exact", head: true }),
    supabase
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("plans").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase
      .from("tenant_subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "trialing"]),
  ]);

  const stats = [
    {
      label: "Active tenants",
      value: activeTenantCount ?? 0,
      sub: `${tenantCount ?? 0} total`,
      href: "/master/tenants",
    },
    {
      label: "Plans available",
      value: planCount ?? 0,
      sub: "editable",
      href: "/master/plans",
    },
    {
      label: "Active subs",
      value: subCount ?? 0,
      sub: "across all tenants",
      href: "/master/tenants",
    },
    {
      label: "Total leads",
      value: leadCount ?? 0,
      sub: "platform-wide",
      href: "/master/leads",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8">
      <p
        className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
        style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
      >
        Welcome back, {user.email}
      </p>
      <h1
        className="text-2xl md:text-3xl mb-2"
        style={{
          color: "var(--foreground)",
          fontWeight: 600,
          letterSpacing: "0.005em",
        }}
      >
        Master dashboard.
      </h1>
      <p
        className="text-sm max-w-2xl mb-10"
        style={{ color: "var(--muted-foreground)" }}
      >
        Provision and manage every tenant on the platform. Edit plans and
        prices. See platform-wide leads. The controls here apply across
        every realtor's site.
      </p>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="admin-card p-5 hover:shadow-md transition-shadow"
            style={{ color: "var(--card-foreground)" }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.22em] mb-2"
              style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
            >
              {s.label}
            </p>
            <p
              className="text-3xl mb-1"
              style={{ fontWeight: 600, letterSpacing: "0.005em" }}
            >
              {s.value}
            </p>
            <p
              className="text-[11px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              {s.sub}
            </p>
          </Link>
        ))}
      </div>

      {/* Jump-off cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <JumpCard
          icon={Building2}
          title="Tenants"
          description="Provision a new realtor's site. Edit existing tenant brands, status, plans, and impersonate to debug."
          href="/master/tenants"
        />
        <JumpCard
          icon={CreditCard}
          title="Plans & Pricing"
          description="Edit feature bundle prices and which feature flags they unlock when a customer subscribes."
          href="/master/plans"
        />
        <JumpCard
          icon={InboxIcon}
          title="All Leads"
          description="Cross-tenant lead inbox. Helpful for support — see what's coming in across every site."
          href="/master/leads"
        />
        <JumpCard
          icon={Users}
          title="Super Admins"
          description="Who else has master-dashboard access. Add or remove platform-level operators."
          href="/master/super-admins"
        />
      </div>
    </div>
  );
}

function JumpCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="admin-card p-6 hover:shadow-md transition-shadow flex flex-col"
      style={{ color: "var(--card-foreground)" }}
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{
            background: "color-mix(in srgb, var(--primary) 14%, var(--card))",
            color: "var(--primary)",
            border:
              "1px solid color-mix(in srgb, var(--primary) 25%, transparent)",
          }}
        >
          <Icon size={18} strokeWidth={1.6} />
        </span>
        <ArrowUpRight
          size={14}
          style={{ color: "var(--muted-foreground)" }}
        />
      </div>
      <h3 className="text-base mb-1" style={{ fontWeight: 600 }}>
        {title}
      </h3>
      <p
        className="text-xs leading-relaxed flex-1"
        style={{ color: "var(--muted-foreground)" }}
      >
        {description}
      </p>
    </Link>
  );
}
