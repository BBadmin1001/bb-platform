import Link from "next/link";
import { Plus, Copy, Mail, ExternalLink } from "lucide-react";
import { requireSuperAdmin } from "@/lib/master";
import SalesRepManager from "@/components/master/SalesRepManager";

export const dynamic = "force-dynamic";

/**
 * Sales rep directory + per-rep conversion stats.
 *
 * For each rep we surface:
 *   prospects     — count of prospects with sales_rep_ref = slug
 *   paid          — count where status = 'paid' or 'provisioned'
 *   revenue       — sum of agreed_setup_cents for paid prospects
 *
 * The master operator can also create / edit / archive reps inline.
 */
export default async function SalesRepsPage() {
  const { supabase } = await requireSuperAdmin();

  const [{ data: reps }, { data: prospectStats }] = await Promise.all([
    supabase
      .from("sales_reps")
      .select("id, slug, full_name, email, is_active, notes, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("prospects")
      .select("sales_rep_ref, status, agreed_setup_cents")
      .not("sales_rep_ref", "is", null),
  ]);

  // Aggregate prospect counts + revenue per rep slug.
  type Stats = { total: number; paid: number; revenueCents: number };
  const statsBySlug = new Map<string, Stats>();
  for (const p of prospectStats ?? []) {
    const slug = p.sales_rep_ref as string;
    if (!slug) continue;
    const cur = statsBySlug.get(slug) ?? {
      total: 0,
      paid: 0,
      revenueCents: 0,
    };
    cur.total += 1;
    if (p.status === "paid" || p.status === "provisioned") {
      cur.paid += 1;
      cur.revenueCents += (p.agreed_setup_cents as number | null) ?? 0;
    }
    statsBySlug.set(slug, cur);
  }

  const masterHost =
    process.env.NEXT_PUBLIC_MASTER_HOSTNAME ||
    process.env.MASTER_HOSTNAME ||
    "bb-platform-387.netlify.app";

  return (
    <div className="max-w-5xl mx-auto py-8">
      <p
        className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
        style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
      >
        Master · Sales reps
      </p>
      <h1
        className="text-2xl md:text-3xl mb-2"
        style={{
          color: "var(--foreground)",
          fontWeight: 600,
          letterSpacing: "0.005em",
        }}
      >
        Sales reps.
      </h1>
      <p
        className="text-sm mb-10 max-w-2xl"
        style={{ color: "var(--muted-foreground)" }}
      >
        Each rep gets a tracked onboarding link. Conversion + revenue stats
        below update automatically as their prospects pay.
      </p>

      <SalesRepManager
        initialReps={(reps ?? []) as Array<{
          id: string;
          slug: string;
          full_name: string;
          email: string | null;
          is_active: boolean;
          notes: string | null;
        }>}
        statsBySlug={Object.fromEntries(statsBySlug)}
        masterHost={masterHost}
      />
    </div>
  );
}
