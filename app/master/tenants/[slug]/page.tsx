import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ArrowUpRight } from "lucide-react";
import { requireSuperAdmin } from "@/lib/master";
import TenantForm from "@/components/master/TenantForm";
import DomainStatusPanel from "@/components/master/DomainStatusPanel";
import FeaturesPanel from "@/components/master/FeaturesPanel";
import LifecyclePanel from "@/components/master/LifecyclePanel";
import AIPolishPanel from "@/components/master/AIPolishPanel";
import CustomPagesPanel from "@/components/master/CustomPagesPanel";
import { getPlatformTarget } from "@/lib/dns";
import { getCanonicalMasterHost } from "@/lib/tenant/resolver";
import {
  FEATURE_NAMES,
  tenantFeaturesIncludes,
  type FeatureName,
} from "@/lib/features-meta";
import type { LifecycleStage } from "@/app/master/tenants/actions";

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
      "id, slug, custom_domain, realtor_name, brokerage, contact_email, contact_phone, state_abbr, status, created_at, provisioned_at, features, stripe_customer_id, domain_target, domain_check_state, domain_check_value, domain_checked_at, domain_verified_at, netlify_alias_added_at, netlify_alias_synced_for, netlify_alias_error, netlify_last_synced_at, lifecycle_stage, preview_token, intake_data, prospect_id",
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

  // Custom pages for this tenant (the master-managed Phase 15 ones).
  const { data: customPages } = await supabase
    .from("custom_pages")
    .select("id, slug, title, is_published, show_in_nav")
    .eq("tenant_id", tenant.id)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

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

      {/* Intake-missing banner — flagged prominently so a hand-created
          tenant doesn't slip through with no AI Polish source data.
          Hidden once intake_data is filled OR the tenant has a linked
          prospect with intake_data (wizard-created tenants don't need
          this prompt). */}
      {!tenant.intake_data && !tenant.prospect_id && (
        <div
          className="p-3 rounded-md mb-6 flex items-start gap-3 text-[12px]"
          style={{
            background:
              "color-mix(in srgb, var(--primary) 6%, var(--card))",
            border:
              "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
          }}
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md shrink-0"
            style={{
              background:
                "color-mix(in srgb, var(--primary) 14%, transparent)",
              color: "var(--primary)",
              fontWeight: 700,
            }}
          >
            !
          </span>
          <div style={{ flex: 1 }}>
            <p
              style={{
                color: "var(--card-foreground)",
                fontWeight: 600,
                marginBottom: 2,
              }}
            >
              Intake not filled — AI Polish has nothing to work with.
            </p>
            <p
              style={{
                color: "var(--muted-foreground)",
                lineHeight: 1.6,
              }}
            >
              This tenant was created by hand, so the realtor&apos;s
              bio, voice direction, and service areas are missing.
              Without them AI Polish writes generic copy. Fill the
              intake once and AI Polish becomes specific.
            </p>
          </div>
          <Link
            href={`/master/tenants/${slug}/intake`}
            className="admin-btn admin-btn-secondary text-xs"
            style={{ flexShrink: 0 }}
          >
            Fill intake
          </Link>
        </div>
      )}

      {/* Quick links.
          - When the tenant has a custom domain AND status is active,
            prefer that URL — auth cookies are domain-scoped, so the
            tenant owner needs to log in on their own domain.
          - Otherwise fall back to the platform URL with ?tenant= +
            preview_token, which works for any status (active OR
            pending, e.g. during polishing).
          We intentionally do NOT gate on `domain_check_state ===
          "verified"` because the platform's DNS verifier can only
          confirm CNAME chains — it can't follow ALIAS records (which
          flatten to A-record IPs), so ALIAS setups stay "pending"
          forever even when DNS actually resolves correctly. The
          custom-domain link will surface as a Netlify 404 if DNS isn't
          actually wired up, which is a clearer signal than a stale
          "domain not verified" gate. */}
      {(() => {
        const useCustomDomain =
          tenant.custom_domain && tenant.status === "active";
        // "Visit site" stays as a direct URL — the public site doesn't
        // need auth, so no magic-link round-trip is necessary.
        const siteHref = useCustomDomain
          ? `https://${tenant.custom_domain}/`
          : `/?tenant=${tenant.slug}&preview=${tenant.preview_token}`;
        // "Open admin" routes through the SSO endpoint, which generates
        // a single-use Supabase magic link as the super admin and 302s
        // through it. The user lands on /admin already signed in,
        // session correctly scoped to whichever host serves the tenant
        // (custom domain or platform fallback).
        const adminHref = `/master/tenants/${tenant.slug}/sso?dest=/admin`;
        return (
          <div className="flex flex-wrap gap-3 mb-10">
            <Link
              href={siteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn admin-btn-secondary"
            >
              <ExternalLink size={13} className="mr-2" />
              Visit site
              <ArrowUpRight size={11} className="ml-1.5" />
            </Link>
            <Link
              href={adminHref}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn admin-btn-secondary"
            >
              <ExternalLink size={13} className="mr-2" />
              Open admin
              <ArrowUpRight size={11} className="ml-1.5" />
            </Link>
          </div>
        );
      })()}

      {/* LIFECYCLE — workflow stage progress + preview link. Sits at
          the top of the page so master sees the operational state
          before they dig into anything else. */}
      <LifecyclePanel
        slug={tenant.slug}
        initialStage={(tenant.lifecycle_stage as LifecycleStage) ?? "intake"}
        initialPreviewToken={tenant.preview_token as string}
        masterHost={getCanonicalMasterHost()}
      />

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
        netlifyAliasAddedAt={tenant.netlify_alias_added_at}
        netlifyAliasSyncedFor={tenant.netlify_alias_synced_for}
        netlifyAliasError={tenant.netlify_alias_error}
        netlifyLastSyncedAt={tenant.netlify_last_synced_at}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
        <Stat label="Auth users" value={userCount ?? 0} />
        <Stat label="Content blocks" value={contentCount ?? 0} />
        <Stat label="Active subs" value={subs?.length ?? 0} />
      </div>

      {/* AI polish — Phase 13. Regenerates bespoke copy from the
          intake payload using house-style rules. Master reviews the
          result before publishing. */}
      <AIPolishPanel slug={tenant.slug} />

      {/* Custom pages — Phase 15. Master creates pages on a tenant's
          site; the realtor edits the body from /admin/pages. */}
      <CustomPagesPanel
        tenantSlug={tenant.slug}
        tenantHost={
          (tenant.custom_domain as string | null) ||
          `${getCanonicalMasterHost()}?tenant=${tenant.slug}&preview=${tenant.preview_token}`
        }
        initialPages={(customPages ?? []) as Array<{
          id: string;
          slug: string;
          title: string;
          is_published: boolean;
          show_in_nav: boolean;
        }>}
      />

      {/* Feature flags — read from the cached tenants.features jsonb,
          with a manual "Resync features" escape hatch for the rare case
          when the Stripe webhook didn't reconcile automatically. */}
      <FeaturesPanel
        slug={tenant.slug}
        features={FEATURE_NAMES.filter((f) =>
          tenantFeaturesIncludes(tenant.features, f),
        ) as FeatureName[]}
      />

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
              // Same Supabase one-to-many widening trick as elsewhere:
              // cast through unknown and normalise array → first row.
              const planRaw = s.plan as unknown as
                | { name: string; price_cents: number; interval: string }
                | { name: string; price_cents: number; interval: string }[]
                | null;
              const plan = Array.isArray(planRaw)
                ? planRaw[0] ?? null
                : planRaw;
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
