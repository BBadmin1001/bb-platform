import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import GoogleIntegrationWizard from "@/components/admin/integrations/GoogleIntegrationWizard";
import { getGoogleIntegration } from "@/lib/integrationStore";
import { tenantHasFeature } from "@/lib/features";
import { UpgradeBanner } from "@/components/admin/UpgradeBanner";

export default async function GoogleIntegrationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Google Reviews widget is gated behind the Marketing plan. Without
  // that feature unlocked there's no point showing the wizard — it
  // wouldn't actually render the widget on the public site.
  if (!(await tenantHasFeature("google_reviews_widget"))) {
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
          <UpgradeBanner feature="google_reviews_widget" />
        </div>
      </AdminShell>
    );
  }

  const integration = await getGoogleIntegration();
  const existing = integration
    ? {
        apiKey: integration.config?.apiKey ?? "",
        placeId: integration.config?.placeId ?? "",
        enabled: integration.enabled,
        lastSyncedAt: integration.lastSyncedAt,
        lastSyncStatus: integration.lastSyncStatus,
        lastSyncError: integration.lastSyncError,
      }
    : null;

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
          Integrations
        </p>
        <div className="flex items-center gap-3 mb-2">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in srgb, var(--primary) 16%, var(--card))",
              color: "var(--primary)",
              border: "1px solid color-mix(in srgb, var(--primary) 28%, transparent)",
            }}
          >
            <Star size={18} strokeWidth={1.6} />
          </span>
          <h1
            className="text-2xl md:text-3xl"
            style={{
              color: "var(--foreground)",
              fontWeight: 600,
              letterSpacing: "0.01em",
            }}
          >
            Google Reviews
          </h1>
        </div>
        <p
          className="text-sm max-w-2xl mb-10"
          style={{ color: "var(--muted-foreground)" }}
        >
          Pull the latest reviews from Google Business Profile into the admin
          queue, then approve which ones appear on the public website. New
          reviews are checked once a day; you can also sync on demand.
        </p>

        <GoogleIntegrationWizard existing={existing} />
      </div>
    </AdminShell>
  );
}
