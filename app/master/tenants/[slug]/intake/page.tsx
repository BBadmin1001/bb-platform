import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { requireSuperAdmin } from "@/lib/master";
import MasterIntakeForm from "@/components/master/MasterIntakeForm";
import type { IntakeData } from "@/lib/intakeSchema";

export const dynamic = "force-dynamic";

/**
 * Master-facing intake form for a tenant. Fills the same shape the
 * public onboarding wizard collects (IntakeData) so AI Polish has rich
 * source data for hand-created tenants too.
 *
 * Reaches this page from:
 *   • `/master/tenants/new` → `createTenant` redirects here once the
 *     tenant row exists (so we have a slug to scope the intake to).
 *   • A "Fill intake" CTA on `/master/tenants/<slug>` when intake_data
 *     is missing.
 *   • Direct edit later — the form is upsert-friendly.
 */
export default async function TenantIntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const { supabase } = await requireSuperAdmin();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug, realtor_name, brokerage, intake_data, prospect_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) notFound();

  // Use whatever intake we already have: tenant.intake_data > prospect's
  // intake_data > empty. Pre-fills the form so master can correct or
  // enrich instead of starting from scratch.
  let initial: IntakeData | null = (tenant.intake_data as IntakeData | null) ?? null;
  if (!initial && tenant.prospect_id) {
    const { data: prospect } = await supabase
      .from("prospects")
      .select("intake_data")
      .eq("id", tenant.prospect_id)
      .maybeSingle();
    initial = (prospect?.intake_data as IntakeData | null) ?? null;
  }

  // Seed the most basic identity fields from the tenant row when no
  // intake exists yet — so the realtor_name + brokerage fields aren't
  // blank when a master just clicked through from "New tenant".
  if (!initial) {
    initial = {
      contact_name: (tenant.realtor_name as string | null) ?? "",
      email: "",
      realtor_full_name: (tenant.realtor_name as string | null) ?? "",
      brokerage_name: (tenant.brokerage as string | null) ?? "",
      licensed_states: [],
    } as IntakeData;
  }

  const cameFromNew = sp.from === "new";

  return (
    <div className="max-w-3xl mx-auto py-8 px-5 md:px-8">
      <Link
        href={`/master/tenants/${slug}`}
        className="inline-flex items-center text-xs mb-4"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ArrowLeft size={11} className="mr-1" />
        Back to tenant
      </Link>
      <p
        className="text-[0.65rem] tracking-[0.32em] uppercase mb-2"
        style={{ color: "var(--muted-foreground)", fontWeight: 500 }}
      >
        Master · Tenant intake
      </p>
      <h1
        className="text-2xl md:text-3xl mb-2"
        style={{
          color: "var(--foreground)",
          fontWeight: 600,
          letterSpacing: "0.005em",
        }}
      >
        Intake for {tenant.realtor_name}
      </h1>
      <p
        className="text-sm mb-6"
        style={{ color: "var(--muted-foreground)", lineHeight: 1.6 }}
      >
        Fills the same questionnaire the public onboarding wizard
        collects. Anything you save here flows into AI Polish so the
        site copy becomes specific to this realtor instead of generic.
      </p>

      {cameFromNew && (
        <div
          className="p-3 rounded-md mb-6 flex items-start gap-2 text-[12px]"
          style={{
            background:
              "color-mix(in srgb, var(--primary) 6%, var(--card))",
            border:
              "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
          }}
        >
          <Info
            size={13}
            style={{ color: "var(--primary)", flexShrink: 0, marginTop: 1 }}
          />
          <span style={{ color: "var(--card-foreground)", lineHeight: 1.6 }}>
            Tenant created. Fill out this intake (especially the{" "}
            <strong>Bio</strong> and <strong>Voice direction</strong>{" "}
            fields), then click{" "}
            <strong>Save + run AI polish</strong> to generate the
            tenant&apos;s copy on every page in one pass.
          </span>
        </div>
      )}

      <MasterIntakeForm slug={slug} initial={initial} />
    </div>
  );
}
