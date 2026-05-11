import Link from "next/link";
import { Plus, Copy, Mail, ExternalLink } from "lucide-react";
import { requireSuperAdmin } from "@/lib/master";
import SalesRepManager from "@/components/master/SalesRepManager";
import ClientLinkGenerator from "@/components/master/ClientLinkGenerator";

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

  const [{ data: reps }, { data: prospectStats }, { data: links }] =
    await Promise.all([
      supabase
        .from("sales_reps")
        .select("id, slug, full_name, email, is_active, notes, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("prospects")
        .select("sales_rep_ref, status, agreed_setup_cents")
        .not("sales_rep_ref", "is", null),
      supabase
        .from("sales_rep_links")
        .select(
          "id, rep_id, link_token, client_label, client_email, agreed_setup_cents, created_at, clicked_at, submitted_at, is_active",
        )
        .order("created_at", { ascending: false }),
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

      <ClientLinkGenerator
        reps={(reps ?? []).map((r) => ({
          id: r.id as string,
          slug: r.slug as string,
          full_name: r.full_name as string,
          is_active: r.is_active as boolean,
        }))}
        initialLinks={(links ?? []) as Array<{
          id: string;
          rep_id: string;
          link_token: string;
          client_label: string;
          client_email: string | null;
          agreed_setup_cents: number;
          created_at: string;
          clicked_at: string | null;
          submitted_at: string | null;
          is_active: boolean;
        }>}
        masterHost={masterHost}
      />

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
