import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import AnalyticsWizard from "@/components/admin/integrations/AnalyticsWizard";
import { getAnalyticsIntegration } from "@/lib/integrationStore";

export default async function AnalyticsIntegrationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const integration = await getAnalyticsIntegration();
  const existing = integration
    ? {
        measurementId: integration.config?.measurementId ?? "",
        enabled: integration.enabled,
      }
    : null;

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-3xl mx-auto py-8">
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-1.5 text-xs mb-6"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ArrowLeft size={14} /> Back to Website Analytics
        </Link>

        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
          style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
        >
          Integrations
        </p>
        <div className="flex items-center gap-3 mb-2">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in srgb, var(--primary) 16%, var(--card))",
              color: "var(--primary)",
              border:
                "1px solid color-mix(in srgb, var(--primary) 28%, transparent)",
            }}
          >
            <BarChart3 size={18} strokeWidth={1.6} />
          </span>
          <h1
            className="text-2xl md:text-3xl"
            style={{
              color: "var(--foreground)",
              fontWeight: 600,
              letterSpacing: "0.01em",
            }}
          >
            Google Analytics
          </h1>
        </div>
        <p
          className="text-sm max-w-2xl mb-10"
          style={{ color: "var(--muted-foreground)" }}
        >
          Track how visitors find and use your site. Paste the Measurement ID
          from your Google Analytics property and we&apos;ll inject the
          tracking tag on every page automatically.
        </p>

        <AnalyticsWizard existing={existing} />
      </div>
    </AdminShell>
  );
}
