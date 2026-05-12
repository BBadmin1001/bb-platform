import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireSuperAdmin } from "@/lib/master";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<string, { label: string; bg: string; fg: string }> = {
  new: { label: "New", bg: "rgba(94,53,177,0.14)", fg: "#5e35b1" },
  contacted: { label: "Contacted", bg: "rgba(255,167,38,0.16)", fg: "#a65300" },
  quoted: { label: "Quoted", bg: "rgba(33,150,243,0.14)", fg: "#0d47a1" },
  paid: { label: "Paid", bg: "rgba(76,175,80,0.16)", fg: "#1b5e20" },
  provisioned: { label: "Provisioned", bg: "rgba(76,175,80,0.20)", fg: "#0a4a0c" },
  abandoned: { label: "Abandoned", bg: "rgba(0,0,0,0.06)", fg: "#555" },
};

export default async function ProspectsList() {
  const { supabase } = await requireSuperAdmin();
  const [{ data: prospects }, { data: reps }] = await Promise.all([
    supabase
      .from("prospects")
      .select(
        "id, business_name, contact_name, email, desired_domain, status, source, created_at, quoted_setup_fee_cents, sales_rep_ref",
      )
      .order("created_at", { ascending: false }),
    supabase.from("sales_reps").select("slug, full_name"),
  ]);
  const repNameBySlug = new Map(
    (reps ?? []).map((r) => [
      (r.slug as string).toLowerCase(),
      r.full_name as string,
    ]),
  );

  return (
    <div className="max-w-5xl mx-auto py-8">
      <p
        className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
        style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
      >
        Master · Prospects
      </p>
      <h1
        className="text-2xl md:text-3xl mb-2"
        style={{ color: "var(--foreground)", fontWeight: 600 }}
      >
        Sales pipeline.
      </h1>
      <p
        className="text-sm max-w-2xl mb-10"
        style={{ color: "var(--muted-foreground)" }}
      >
        Realtors who've raised their hand for a website. Click into one to
        review their intake, generate a Stripe Payment Link, and once
        they pay we'll auto-provision their tenant.
      </p>

      {(prospects?.length ?? 0) === 0 ? (
        <div
          className="admin-card p-12 text-center"
          style={{ borderStyle: "dashed" }}
        >
          <p style={{ color: "var(--muted-foreground)", fontWeight: 600 }}>
            No prospects yet.
          </p>
          <p
            className="text-sm mt-2"
            style={{ color: "var(--muted-foreground)" }}
          >
            Send realtors to{" "}
            <code className="admin-mono">/get-started</code> — submissions
            land here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(prospects ?? []).map((p) => {
            const pill = STATUS_PILL[p.status] ?? STATUS_PILL.new;
            const repSlug = (p.sales_rep_ref as string | null)?.toLowerCase();
            const repName = repSlug
              ? repNameBySlug.get(repSlug) ?? repSlug
              : null;
            return (
              <Link
                key={p.id}
                href={`/master/prospects/${p.id}`}
                className="admin-card p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3
                      className="text-sm"
                      style={{
                        color: "var(--card-foreground)",
                        fontWeight: 600,
                      }}
                    >
                      {p.contact_name}
                    </h3>
                    <span
                      className="text-[10px] uppercase tracking-[0.18em]"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      · {p.business_name}
                    </span>
                    <span
                      className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                      style={{
                        background: pill.bg,
                        color: pill.fg,
                        fontWeight: 700,
                      }}
                    >
                      {pill.label}
                    </span>
                    {p.quoted_setup_fee_cents != null && (
                      <span
                        className="text-[10px] uppercase tracking-[0.18em]"
                        style={{
                          color: "var(--primary)",
                          fontWeight: 600,
                        }}
                      >
                        ${(p.quoted_setup_fee_cents / 100).toFixed(0)} setup
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[11px] truncate"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {p.email}
                    {p.desired_domain && (
                      <span> · {p.desired_domain}</span>
                    )}
                    {repName && (
                      <span>
                        {" "}
                        · rep:{" "}
                        <span style={{ color: "var(--primary)", fontWeight: 600 }}>
                          {repName}
                        </span>
                      </span>
                    )}
                    {p.source && (
                      <span className="admin-mono"> · {p.source}</span>
                    )}
                  </p>
                </div>
                <ArrowUpRight
                  size={15}
                  className="shrink-0 opacity-60"
                  style={{ color: "var(--primary)" }}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
