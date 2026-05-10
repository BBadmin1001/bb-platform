import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ArrowUpRight } from "lucide-react";
import { requireSuperAdmin } from "@/lib/master";
import TenantForm from "@/components/master/TenantForm";
import DomainStatusPanel from "@/components/master/DomainStatusPanel";
import { getPlatformTarget } from "@/lib/dns";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase } = await requireSuperAdmin();

  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "id, slug, custom_domain, realtor_name, brokerage, contact_email, contact_phone, state_abbr, status, created_at, provisioned_at, features, stripe_customer_id, domain_target, domain_check_state, domain_check_value, domain_checked_at, domain_verified_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!tenant) notFound();

  // Active subs for this tenant.
  const { data: subs } = await supabase
    .from("tenant_subscriptions")
    .select(
      "id, status, current_period_end, plan:plan_id ( name, price_cents, interval )",
    )
    .eq("tenant_id", tenant.id);

  // Quick stats: how many tenant_users + content_blocks.
  const [{ count: userCount }, { count: contentCount }] = await Promise.all([
    supabase
      .from("tenant_users")
      .select("user_id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id),
    supabase
      .from("content_blocks")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id),
  ]);

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Link
        href="/master/tenants"
        className="inline-flex items-center gap-1.5 text-xs mb-6"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ArrowLeft size={14} /> All tenants
      </Link>

      <p
        className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
        style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
      >
        Master · Tenant
      </p>
      <h1
        className="text-2xl md:text-3xl mb-2"
        style={{
          color: "var(--foreground)",
          fontWeight: 600,
          letterSpacing: "0.005em",
        }}
      >
        {tenant.realtor_name}
      </h1>
      <p
        className="text-sm admin-mono mb-6"
        style={{ color: "var(--muted-foreground)" }}
      >
        /{tenant.slug}
        {tenant.custom_domain && ` · ${tenant.custom_domain}`}
      </p>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3 mb-10">
        <Link
          href={`/?tenant=${tenant.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn admin-btn-secondary"
        >
          <ExternalLink size={13} className="mr-2" />
          Visit site
          <ArrowUpRight size={11} className="ml-1.5" />
        </Link>
        <Link
          href={`/admin?tenant=${tenant.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn admin-btn-secondary"
        >
          <ExternalLink size={13} className="mr-2" />
          Open admin
          <ArrowUpRight size={11} className="ml-1.5" />
        </Link>
      </div>

      {/* DOMAIN STATUS — first-class part of delivery, sits above
          the rest of the form so master sees DNS state immediately. */}
      <DomainStatusPanel
        slug={tenant.slug}
        status={tenant.status}
        customDomain={tenant.custom_domain}
        domainTarget={tenant.domain_target}
        domainCheckState={tenant.domain_check_state}
        domainCheckValue={tenant.domain_check_value}
        domainCheckedAt={tenant.domain_checked_at}
        domainVerifiedAt={tenant.domain_verified_at}
        fallbackTarget={getPlatformTarget()}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
        <Stat label="Auth users" value={userCount ?? 0} />
        <Stat label="Content blocks" value={contentCount ?? 0} />
        <Stat label="Active subs" value={subs?.length ?? 0} />
      </div>

      {/* Subscriptions list */}
      {subs && subs.length > 0 && (
        <section className="admin-card p-6 mb-10">
          <p
            className="text-xs uppercase tracking-[0.18em] mb-4"
            style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
          >
            Subscriptions
          </p>
          <ul className="space-y-2">
            {subs.map((s) => {
              const plan = s.plan as
                | { name: string; price_cents: number; interval: string }
                | null;
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span style={{ fontWeight: 600 }}>
                    {plan?.name ?? "Unknown plan"}
                  </span>
                  <span style={{ color: "var(--muted-foreground)" }}>
                    {plan
                      ? `$${(plan.price_cents / 100).toFixed(2)}/${plan.interval}`
                      : "—"}{" "}
                    · <span className="admin-mono">{s.status}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <TenantForm
        editingId={tenant.id}
        initial={{
          slug: tenant.slug,
          realtor_name: tenant.realtor_name,
          brokerage: tenant.brokerage,
          contact_email: tenant.contact_email,
          contact_phone: tenant.contact_phone,
          state_abbr: tenant.state_abbr,
          custom_domain: tenant.custom_domain,
          status: tenant.status,
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-card p-4">
      <p
        className="text-[10px] uppercase tracking-[0.22em] mb-1.5"
        style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
      >
        {label}
      </p>
      <p
        className="text-2xl"
        style={{ fontWeight: 600, letterSpacing: "0.005em" }}
      >
        {value}
      </p>
    </div>
  );
}
