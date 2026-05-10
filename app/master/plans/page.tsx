import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { requireSuperAdmin } from "@/lib/master";

export const dynamic = "force-dynamic";

function formatPrice(cents: number, interval: string) {
  return `$${(cents / 100).toFixed(2)}/${interval === "yearly" ? "yr" : "mo"}`;
}

export default async function PlansList() {
  const { supabase } = await requireSuperAdmin();
  const { data: plans } = await supabase
    .from("plans")
    .select(
      "id, slug, name, description, price_cents, interval, features, is_active, display_order",
    )
    .order("display_order", { ascending: true });

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
        <div>
          <p
            className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
            style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
          >
            Master · Plans
          </p>
          <h1
            className="text-2xl md:text-3xl mb-2"
            style={{
              color: "var(--foreground)",
              fontWeight: 600,
              letterSpacing: "0.005em",
            }}
          >
            Feature plans.
          </h1>
        </div>
        <Link href="/master/plans/new" className="admin-btn">
          <Plus size={14} className="mr-2" /> New plan
        </Link>
      </div>

      <p
        className="text-sm max-w-2xl mb-10"
        style={{ color: "var(--muted-foreground)" }}
      >
        Each plan bundles feature flags. When a tenant subscribes (Stripe),
        the listed flags get flipped on{" "}
        <code className="admin-mono">tenants.features</code> and the gated
        admin sections / public widgets switch on automatically.
      </p>

      {(plans?.length ?? 0) === 0 ? (
        <div
          className="admin-card p-12 text-center"
          style={{ borderStyle: "dashed" }}
        >
          <p style={{ color: "var(--muted-foreground)", fontWeight: 600 }}>
            No plans yet.
          </p>
          <Link href="/master/plans/new" className="admin-btn mt-6 inline-flex">
            <Plus size={14} className="mr-2" /> Create the first
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {(plans ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/master/plans/${p.slug}`}
              className="admin-card p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
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
                    {p.name}
                  </h3>
                  <span
                    className="text-[10px] uppercase tracking-[0.18em]"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    /{p.slug}
                  </span>
                  {!p.is_active && (
                    <span
                      className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(0,0,0,0.06)",
                        color: "var(--muted-foreground)",
                        fontWeight: 700,
                      }}
                    >
                      Inactive
                    </span>
                  )}
                </div>
                {p.description && (
                  <p
                    className="text-xs mb-2"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {p.description}
                  </p>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="text-sm admin-mono"
                    style={{ color: "var(--primary)", fontWeight: 600 }}
                  >
                    {formatPrice(p.price_cents, p.interval)}
                  </span>
                  {(p.features as string[]).map((f) => (
                    <span
                      key={f}
                      className="text-[10px] admin-mono px-2 py-0.5 rounded"
                      style={{
                        background:
                          "color-mix(in srgb, var(--primary) 12%, transparent)",
                        color: "var(--primary)",
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <ArrowUpRight
                size={15}
                className="shrink-0 opacity-60"
                style={{ color: "var(--primary)" }}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
