import { requireSalesRep } from "@/lib/salesRepAuth";
import { createServiceClient } from "@/lib/supabase/server";
import { getCanonicalMasterHost } from "@/lib/tenant/resolver";
import RepDashboard from "@/components/sales/RepDashboard";
import RepHeader from "@/components/sales/RepHeader";

export const dynamic = "force-dynamic";

/**
 * Sales rep dashboard.
 *
 * The rep sees:
 *   - Pipeline summary: open prospects + their total agreed_setup_cents
 *   - Closed this month: paid/provisioned prospects this calendar month
 *     + revenue
 *   - Last 6 months overview (count + revenue per month)
 *   - "Generate client link" form (realtor name required, $600 minimum)
 *   - All their generated links with status pills + actions
 *   - All their prospects (linked from each link if there's one)
 *
 * Super admins viewing /sales see the same dashboard but for a chosen
 * rep (via ?rep=<slug>) — handy for support / training.
 */
export default async function SalesDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ rep?: string }>;
}) {
  const params = await searchParams;
  const auth = await requireSalesRep(params.rep ?? null);

  // Service-role for the dashboard reads — rep RLS lets them through
  // anyway, but going service-role keeps the queries fast and the
  // shape predictable when a super-admin is viewing-as.
  const svc = createServiceClient();

  const [{ data: links }, { data: prospects }, { data: allReps }] =
    await Promise.all([
      svc
        .from("sales_rep_links")
        .select(
          "id, link_token, client_label, client_email, agreed_setup_cents, created_at, clicked_at, submitted_at, is_active, prospect_id",
        )
        .eq("rep_id", auth.rep.id)
        .order("created_at", { ascending: false }),
      svc
        .from("prospects")
        .select(
          "id, contact_name, business_name, email, status, agreed_setup_cents, paid_at, created_at, intake_submitted_at",
        )
        .eq("sales_rep_ref", auth.rep.slug)
        .order("created_at", { ascending: false }),
      // For super-admin "view as" picker.
      auth.isSuperAdmin
        ? svc
            .from("sales_reps")
            .select("id, slug, full_name, is_active")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as { id: string; slug: string; full_name: string; is_active: boolean }[] }),
    ]);

  // Refetch the rep's commission_pct so the dashboard math is fresh
  // when master updates it from /master/sales-reps.
  const { data: repWithCommission } = await svc
    .from("sales_reps")
    .select("commission_pct")
    .eq("id", auth.rep.id)
    .maybeSingle();
  const commissionPct = Number(repWithCommission?.commission_pct ?? 0);

  const masterHost = getCanonicalMasterHost();

  return (
    <main className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <RepHeader
        rep={auth.rep}
        isSuperAdmin={auth.isSuperAdmin}
        allReps={(allReps ?? []) as Array<{
          id: string;
          slug: string;
          full_name: string;
          is_active: boolean;
        }>}
      />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <RepDashboard
          rep={auth.rep}
          commissionPct={commissionPct}
          links={(links ?? []) as Array<{
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
          }>}
          prospects={(prospects ?? []) as Array<{
            id: string;
            contact_name: string;
            business_name: string;
            email: string;
            status: string;
            agreed_setup_cents: number | null;
            paid_at: string | null;
            created_at: string;
            intake_submitted_at: string | null;
          }>}
          masterHost={masterHost}
        />
      </div>
    </main>
  );
}
