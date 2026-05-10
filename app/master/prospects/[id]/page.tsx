import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/master";
import ProspectWorkspace from "@/components/master/ProspectWorkspace";

export const dynamic = "force-dynamic";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireSuperAdmin();

  const [{ data: prospect }, { data: plans }] = await Promise.all([
    supabase
      .from("prospects")
      .select(
        "id, business_name, contact_name, email, phone, desired_domain, state_abbr, notes, source, quoted_setup_fee_cents, quoted_plans, quote_notes, stripe_payment_link_url, paid_at, status, tenant_id, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("plans")
      .select("id, slug, name, price_cents, interval, features, is_active")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
  ]);
  if (!prospect) notFound();

  // If they've been provisioned, also fetch the tenant slug so we
  // can link straight to /master/tenants/<slug>.
  let tenantSlug: string | null = null;
  if (prospect.tenant_id) {
    const { data: t } = await supabase
      .from("tenants")
      .select("slug")
      .eq("id", prospect.tenant_id)
      .maybeSingle();
    tenantSlug = t?.slug ?? null;
  }

  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Link
        href="/master/prospects"
        className="inline-flex items-center gap-1.5 text-xs mb-6"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ArrowLeft size={14} /> All prospects
      </Link>

      <p
        className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
        style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
      >
        Master · Prospect
      </p>
      <h1
        className="text-2xl md:text-3xl mb-2"
        style={{ color: "var(--foreground)", fontWeight: 600 }}
      >
        {prospect.contact_name}
      </h1>
      <p
        className="text-sm mb-1"
        style={{ color: "var(--muted-foreground)" }}
      >
        {prospect.business_name}
      </p>
      <p
        className="text-xs admin-mono mb-10"
        style={{ color: "var(--muted-foreground)" }}
      >
        {prospect.email}
        {prospect.phone && <span> · {prospect.phone}</span>}
        {prospect.source && <span> · {prospect.source}</span>}
      </p>

      <ProspectWorkspace
        prospect={{
          id: prospect.id,
          status: prospect.status,
          desiredDomain: prospect.desired_domain,
          notes: prospect.notes,
          quotedSetupFeeCents: prospect.quoted_setup_fee_cents,
          quotedPlans: (prospect.quoted_plans as string[]) ?? [],
          quoteNotes: prospect.quote_notes,
          stripePaymentLinkUrl: prospect.stripe_payment_link_url,
          paidAt: prospect.paid_at,
          tenantSlug,
        }}
        plans={(plans ?? []).map((p) => ({
          slug: p.slug,
          name: p.name,
          price_cents: p.price_cents,
          interval: p.interval,
          features: (p.features as string[]) ?? [],
        }))}
        stripeConfigured={stripeConfigured}
      />
    </div>
  );
}
