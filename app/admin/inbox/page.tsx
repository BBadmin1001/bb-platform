import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant/context";
import AdminShell from "@/components/admin/AdminShell";
import InboxList, {
  type LeadRow,
} from "@/components/admin/inbox/InboxList";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const sp = await searchParams;
  const filter =
    sp.status === "in-progress" || sp.status === "closed" || sp.status === "new"
      ? sp.status
      : undefined;

  // Explicit tenant scoping (A3-004): super-admins bypass RLS, so
  // without an explicit tenant_id filter the inbox would show leads
  // for every tenant.
  const tenantId = await getCurrentTenantId();

  let query = supabase
    .from("leads")
    .select(
      "id, source, name, email, phone, message, data, status, submitted_at",
    )
    .order("submitted_at", { ascending: false })
    .limit(200);

  if (tenantId) query = query.eq("tenant_id", tenantId);
  if (filter) {
    query = query.eq("status", filter);
  }

  const { data: leads } = await query;

  // Counts per status, for the filter pills
  let countsQ = supabase
    .from("leads")
    .select("status", { count: "exact" });
  if (tenantId) countsQ = countsQ.eq("tenant_id", tenantId);
  const { data: counts } = await countsQ;
  const tally: Record<string, number> = { new: 0, "in-progress": 0, closed: 0 };
  for (const r of (counts ?? []) as { status: string }[]) {
    tally[r.status] = (tally[r.status] ?? 0) + 1;
  }

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12">
        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3"
          style={{ fontWeight: 500 }}
        >
          Inbox
        </p>
        <h1
          className="text-2xl md:text-3xl text-ink mb-2"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          Leads.
        </h1>
        <p className="text-sm text-ink/65 max-w-2xl mb-8">
          Every form submission lands here — Contact, Sellers Valuation,
          Path consultation requests, and any custom forms you build.
        </p>

        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <FilterPill
            href="/admin/inbox"
            active={!filter}
            count={(tally.new ?? 0) + (tally["in-progress"] ?? 0) + (tally.closed ?? 0)}
            label="All"
          />
          <FilterPill
            href="/admin/inbox?status=new"
            active={filter === "new"}
            count={tally.new}
            label="New"
          />
          <FilterPill
            href="/admin/inbox?status=in-progress"
            active={filter === "in-progress"}
            count={tally["in-progress"]}
            label="In progress"
          />
          <FilterPill
            href="/admin/inbox?status=closed"
            active={filter === "closed"}
            count={tally.closed}
            label="Closed"
          />
        </div>

        <InboxList initial={(leads ?? []) as LeadRow[]} />
      </div>
    </AdminShell>
  );
}

function FilterPill({
  href,
  active,
  count,
  label,
}: {
  href: string;
  active: boolean;
  count: number;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-full border transition-colors ${
        active
          ? "bg-navy text-white border-navy"
          : "bg-white text-ink/65 border-black/10 hover:border-navy/40"
      }`}
    >
      {label}
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
          active ? "bg-white/20" : "bg-black/5"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}
