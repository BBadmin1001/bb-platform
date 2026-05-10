import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/master";
import PlanForm from "@/components/master/PlanForm";

export default async function NewPlanPage() {
  await requireSuperAdmin();
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
        Master · New plan
      </p>
      <h1
        className="text-2xl md:text-3xl mb-2"
        style={{ color: "var(--foreground)", fontWeight: 600 }}
      >
        Create a plan.
      </h1>
      <p
        className="text-sm max-w-2xl mb-10"
        style={{ color: "var(--muted-foreground)" }}
      >
        Bundle feature flags into a price point. Stripe wiring (Phase 4)
        will create the matching Stripe Product/Price the first time a
        tenant subscribes.
      </p>
      <PlanForm />
    </div>
  );
}
