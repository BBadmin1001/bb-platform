import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant/context";
import { getPlatformTarget } from "@/lib/dns";
import AdminShell from "@/components/admin/AdminShell";
import TenantDomainPanel from "@/components/admin/TenantDomainPanel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your domain | Admin" };

/**
 * Tenant-side domain admin page. Shows the customer:
 *   • Their current domain (read-only — only platform owner can
 *     change which domain is theirs, to prevent hijack-by-typo).
 *   • The DNS records they need to add at their registrar.
 *   • Live verification status — and a "check now" button so they
 *     don't have to wait for us to refresh on their behalf.
 */
export default async function TenantDomainPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");

  const tenantId = await getCurrentTenantId();
  if (!tenantId) redirect("/admin");

  // Cookie-bound client — RLS already restricts this row to tenants
  // the user is a member of.
  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "id, slug, realtor_name, custom_domain, domain_target, domain_check_state, domain_check_value, domain_checked_at, domain_verified_at, status",
    )
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant) redirect("/admin");

  const target = tenant.domain_target ?? getPlatformTarget();

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-3xl mx-auto py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs mb-6"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ArrowLeft size={14} /> Back to Site Editor
        </Link>

        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
          style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
        >
          Site Editor · Your Domain
        </p>
        <h1
          className="text-2xl md:text-3xl mb-2"
          style={{
            color: "var(--foreground)",
            fontWeight: 600,
            letterSpacing: "0.005em",
          }}
        >
          Connect your domain.
        </h1>
        <p
          className="text-sm max-w-2xl mb-10"
          style={{ color: "var(--muted-foreground)" }}
        >
          Your site goes live the moment your domain points at us. Add the
          two CNAME records below at your domain registrar (GoDaddy,
          Namecheap, Google Domains, etc.), then click <strong>Check now</strong>{" "}
          and we'll verify it for you.
        </p>

        <TenantDomainPanel
          customDomain={tenant.custom_domain}
          domainTarget={target}
          domainCheckState={tenant.domain_check_state}
          domainCheckValue={tenant.domain_check_value}
          domainCheckedAt={tenant.domain_checked_at}
          domainVerifiedAt={tenant.domain_verified_at}
          tenantStatus={tenant.status}
        />
      </div>
    </AdminShell>
  );
}
