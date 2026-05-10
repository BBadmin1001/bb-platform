import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/master";
import TenantForm from "@/components/master/TenantForm";

export default async function NewTenantPage() {
  await requireSuperAdmin();

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
        Master · New tenant
      </p>
      <h1
        className="text-2xl md:text-3xl mb-2"
        style={{
          color: "var(--foreground)",
          fontWeight: 600,
          letterSpacing: "0.005em",
        }}
      >
        Provision a tenant.
      </h1>
      <p
        className="text-sm max-w-2xl mb-10"
        style={{ color: "var(--muted-foreground)" }}
      >
        Every realtor on the platform brings their own domain. Save the
        tenant first, then the next screen shows their DNS records and
        runs a live verifier — they go live only after DNS confirms.
      </p>

      <TenantForm />
    </div>
  );
}
