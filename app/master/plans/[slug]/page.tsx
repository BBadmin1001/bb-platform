import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/master";
import PlanForm from "@/components/master/PlanForm";

export const dynamic = "force-dynamic";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase } = await requireSuperAdmin();

  const { data: plan } = await supabase
    .from("plans")
    .select(
      "id, slug, name, description, price_cents, interval, features, is_active, display_order",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!plan) notFound();

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Link
        href="/master/plans"
        className="inline-flex items-center gap-1.5 text-xs mb-6"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ArrowLeft size={14} /> All plans
      </Link>
      <p
        className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
        style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
      >
        Master · Plan
      </p>
      <h1
        className="text-2xl md:text-3xl mb-2"
        style={{ color: "var(--foreground)", fontWeight: 600 }}
      >
        {plan.name}
      </h1>
      <p
        className="text-sm admin-mono mb-10"
        style={{ color: "var(--muted-foreground)" }}
      >
        /{plan.slug}
      </p>

      <PlanForm
        editingId={plan.id}
        initial={{
          slug: plan.slug,
          name: plan.name,
          description: plan.description,
          price_cents: plan.price_cents,
          interval: plan.interval,
          features: (plan.features as string[]) ?? [],
          is_active: plan.is_active,
          display_order: plan.display_order,
        }}
      />
    </div>
  );
}
