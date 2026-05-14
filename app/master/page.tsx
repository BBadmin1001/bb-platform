import Link from "next/link";
import { Users, ClipboardList, ShieldCheck, ArrowUpRight } from "lucide-react";
import { requireSuperAdmin } from "@/lib/master";

export const dynamic = "force-dynamic";

/**
 * Master dashboard — lead-CRM landing page.
 *
 * After the May-2026 pivot the platform is no longer a multi-tenant
 * site builder, so we strip everything except the three things the
 * super admin needs:
 *   1. Quick at-a-glance counts of reps + prospects.
 *   2. Jump-off cards to the three remaining surfaces (Reps,
 *      Prospects, Super Admins).
 */
export default async function MasterDashboard() {
  const { supabase, user } = await requireSuperAdmin();

  const [{ count: repCount }, { count: prospectCount }, { count: paidCount }] =
    await Promise.all([
      supabase.from("sales_reps").select("id", { count: "exact", head: true }),
      supabase.from("prospects").select("id", { count: "exact", head: true }),
      supabase
        .from("prospects")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid"),
    ]);

  const stats = [
    {
      label: "Sales reps",
      value: repCount ?? 0,
      sub: "across the platform",
      href: "/master/sales-reps",
    },
    {
      label: "Prospects",
      value: prospectCount ?? 0,
      sub: `${paidCount ?? 0} paid`,
      href: "/master/prospects",
    },
    {
      label: "Super admins",
      value: 1,
      sub: "platform owners",
      href: "/master/super-admins",
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
        Add sales reps, share their onboarding links with realtor leads,
        and review every completed intake in one place.
      </p>

      {/* Quick stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <JumpCard
          icon={Users}
          title="Sales reps"
          description="Add reps, set their commission %, and generate their per-rep onboarding link to share with realtor leads."
          href="/master/sales-reps"
        />
        <JumpCard
          icon={ClipboardList}
          title="Prospects"
          description="Every realtor who completed the onboarding intake — their bio, brokerage, photos, voice direction, and notes."
          href="/master/prospects"
        />
        <JumpCard
          icon={ShieldCheck}
          title="Super admins"
          description="Grant master access to teammates."
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
  icon: typeof Users;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="admin-card p-5 hover:shadow-md transition-shadow group"
      style={{ color: "var(--card-foreground)" }}
    >
      <div className="flex items-start gap-3 mb-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-md shrink-0"
          style={{
            background: "color-mix(in srgb, var(--primary) 14%, transparent)",
            color: "var(--primary)",
          }}
        >
          <Icon size={16} strokeWidth={1.6} />
        </span>
        <p
          className="text-base"
          style={{ fontWeight: 600, color: "var(--card-foreground)" }}
        >
          {title}
        </p>
        <ArrowUpRight
          size={14}
          className="ml-auto group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
          style={{ color: "var(--muted-foreground)" }}
        />
      </div>
      <p
        className="text-[12px] leading-relaxed"
        style={{ color: "var(--muted-foreground)" }}
      >
        {description}
      </p>
    </Link>
  );
}
