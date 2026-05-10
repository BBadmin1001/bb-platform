import Link from "next/link";
import { Plus, ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { requireSuperAdmin } from "@/lib/master";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<string, { label: string; bg: string; fg: string }> = {
  active: { label: "Active", bg: "rgba(76,175,80,0.14)", fg: "#1b5e20" },
  pending: { label: "Pending", bg: "rgba(255,167,38,0.16)", fg: "#a65300" },
  suspended: { label: "Suspended", bg: "rgba(229,57,53,0.14)", fg: "#a51a1a" },
  archived: { label: "Archived", bg: "rgba(0,0,0,0.06)", fg: "#555" },
};

const DOMAIN_PILL: Record<string, { label: string; bg: string; fg: string }> = {
  unset: { label: "No domain", bg: "rgba(0,0,0,0.06)", fg: "#555" },
  pending: { label: "DNS pending", bg: "rgba(255,167,38,0.16)", fg: "#a65300" },
  verified: { label: "DNS ✓", bg: "rgba(76,175,80,0.14)", fg: "#1b5e20" },
  mismatch: { label: "DNS mismatch", bg: "rgba(229,57,53,0.14)", fg: "#a51a1a" },
};

export default async function TenantsList() {
  const { supabase } = await requireSuperAdmin();

  const { data: tenants } = await supabase
    .from("tenants")
    .select(
      "id, slug, custom_domain, realtor_name, brokerage, state_abbr, status, created_at, provisioned_at, domain_check_state, domain_verified_at",
    )
    .order("created_at", { ascending: false });

  // Active subscription counts per tenant.
  const tenantIds = (tenants ?? []).map((t) => t.id);
  let subsByTenant = new Map<string, number>();
  if (tenantIds.length > 0) {
    const { data: subs } = await supabase
      .from("tenant_subscriptions")
      .select("tenant_id, status")
      .in("tenant_id", tenantIds)
      .in("status", ["active", "trialing"]);
    subs?.forEach((s) => {
      subsByTenant.set(s.tenant_id, (subsByTenant.get(s.tenant_id) ?? 0) + 1);
    });
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
        <div>
          <p
            className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
            style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
          >
            Master · Tenants
          </p>
          <h1
            className="text-2xl md:text-3xl mb-2"
            style={{
              color: "var(--foreground)",
              fontWeight: 600,
              letterSpacing: "0.005em",
            }}
          >
            Every realtor on the platform.
          </h1>
        </div>
        <Link href="/master/tenants/new" className="admin-btn">
          <Plus size={14} className="mr-2" /> New tenant
        </Link>
      </div>

      <p
        className="text-sm max-w-2xl mb-10"
        style={{ color: "var(--muted-foreground)" }}
      >
        Each row is one realtor's site — its slug, brand identity, status,
        and active plan subscriptions. Click into one to edit details or
        impersonate.
      </p>

      {(tenants?.length ?? 0) === 0 ? (
        <div
          className="admin-card p-12 text-center"
          style={{ borderStyle: "dashed" }}
        >
          <p style={{ color: "var(--muted-foreground)", fontWeight: 600 }}>
            No tenants yet.
          </p>
          <p
            className="text-sm mt-2"
            style={{ color: "var(--muted-foreground)" }}
          >
            Provision your first one — a real customer or a test site.
          </p>
          <Link
            href="/master/tenants/new"
            className="admin-btn mt-6 inline-flex"
          >
            <Plus size={14} className="mr-2" /> Provision a tenant
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {(tenants ?? []).map((t) => {
            const pill = STATUS_PILL[t.status] ?? STATUS_PILL.archived;
            const domainPill =
              DOMAIN_PILL[t.domain_check_state] ?? DOMAIN_PILL.unset;
            const activeSubs = subsByTenant.get(t.id) ?? 0;
            return (
              <Link
                key={t.id}
                href={`/master/tenants/${t.slug}`}
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
                      {t.realtor_name}
                    </h3>
                    {t.brokerage && (
                      <span
                        className="text-[10px] uppercase tracking-[0.18em]"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        · {t.brokerage}
                      </span>
                    )}
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
                    <span
                      className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                      style={{
                        background: domainPill.bg,
                        color: domainPill.fg,
                        fontWeight: 700,
                      }}
                    >
                      {domainPill.label}
                    </span>
                    {activeSubs > 0 && (
                      <span className="master-pill">
                        {activeSubs} sub{activeSubs === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[11px] truncate admin-mono"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {t.custom_domain ?? <span style={{ fontStyle: "italic" }}>no domain yet</span>}
                    <span> · /{t.slug}</span>
                    {t.state_abbr && <span> · {t.state_abbr}</span>}
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
