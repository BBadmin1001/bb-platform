import Link from "next/link";
import { requireSuperAdmin } from "@/lib/master";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<string, { label: string; bg: string; fg: string }> = {
  new: { label: "New", bg: "rgba(94,53,177,0.14)", fg: "#5e35b1" },
  "in-progress": { label: "In progress", bg: "rgba(255,167,38,0.16)", fg: "#a65300" },
  closed: { label: "Closed", bg: "rgba(0,0,0,0.06)", fg: "#555" },
};

export default async function MasterLeads() {
  const { supabase } = await requireSuperAdmin();

  // 200 most-recent leads across every tenant.
  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id, source, name, email, phone, message, status, submitted_at, tenant:tenant_id ( slug, realtor_name )",
    )
    .order("submitted_at", { ascending: false })
    .limit(200);

  return (
    <div className="max-w-5xl mx-auto py-8">
      <p
        className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
        style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
      >
        Master · Leads
      </p>
      <h1
        className="text-2xl md:text-3xl mb-2"
        style={{ color: "var(--foreground)", fontWeight: 600 }}
      >
        All inbound leads.
      </h1>
      <p
        className="text-sm max-w-2xl mb-10"
        style={{ color: "var(--muted-foreground)" }}
      >
        Cross-tenant view. Useful for support — see what's coming in across
        every realtor's site. Most recent 200, newest first.
      </p>

      {(leads?.length ?? 0) === 0 ? (
        <div
          className="admin-card p-12 text-center"
          style={{ borderStyle: "dashed" }}
        >
          <p style={{ color: "var(--muted-foreground)", fontWeight: 600 }}>
            No leads yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(leads ?? []).map((lead) => {
            // Supabase widens nested selects to arrays even for
            // many-to-one relations. Normalise + cast through unknown
            // since the generated type doesn't match the runtime
            // shape of `tenant:tenant_id ( slug, realtor_name )`.
            const tRaw = lead.tenant as unknown as
              | { slug: string; realtor_name: string }
              | { slug: string; realtor_name: string }[]
              | null;
            const t = Array.isArray(tRaw) ? tRaw[0] ?? null : tRaw;
            const pill = STATUS_PILL[lead.status] ?? STATUS_PILL.closed;
            return (
              <div
                key={lead.id}
                className="admin-card p-4"
                style={{ color: "var(--card-foreground)" }}
              >
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className="text-sm"
                    style={{
                      color: "var(--card-foreground)",
                      fontWeight: 600,
                    }}
                  >
                    {lead.name || lead.email || "Anonymous"}
                  </span>
                  {t && (
                    <Link
                      href={`/master/tenants/${t.slug}`}
                      className="text-[10px] uppercase tracking-[0.18em] underline"
                      style={{ color: "var(--primary)" }}
                    >
                      {t.realtor_name}
                    </Link>
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
                    className="text-[10px] uppercase tracking-[0.18em]"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    via {lead.source}
                  </span>
                  <span
                    className="text-[10px] ml-auto admin-mono"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {new Date(lead.submitted_at).toLocaleString()}
                  </span>
                </div>
                <div
                  className="text-xs grid grid-cols-1 sm:grid-cols-3 gap-3"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {lead.email && <span>{lead.email}</span>}
                  {lead.phone && <span>{lead.phone}</span>}
                </div>
                {lead.message && (
                  <p
                    className="text-xs mt-2 leading-relaxed"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {lead.message.slice(0, 220)}
                    {lead.message.length > 220 ? "…" : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
