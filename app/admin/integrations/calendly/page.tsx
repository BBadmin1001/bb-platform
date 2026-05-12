import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import CalendlyWizard from "@/components/admin/integrations/CalendlyWizard";
import { getCalendlyIntegration } from "@/lib/integrationStore";

export const dynamic = "force-dynamic";

export default async function CalendlyConfigPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const integration = await getCalendlyIntegration();

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-3xl mx-auto py-8">
        <Link
          href="/admin/integrations"
          className="inline-flex items-center gap-1.5 text-xs mb-6"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ArrowLeft size={14} /> Back to Integrations
        </Link>
        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
          style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
        >
          Integrations · Calendly
        </p>
        <div className="flex items-center gap-3 mb-2">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              background:
                "color-mix(in srgb, var(--primary) 16%, var(--card))",
              color: "var(--primary)",
            }}
          >
            <Calendar size={20} strokeWidth={1.6} />
          </span>
          <h1
            className="text-2xl md:text-3xl"
            style={{
              color: "var(--foreground)",
              fontWeight: 600,
              letterSpacing: "0.005em",
            }}
          >
            Calendly
          </h1>
        </div>
        <p
          className="text-sm mb-8 max-w-2xl"
          style={{ color: "var(--muted-foreground)" }}
        >
          Drop in your Calendly link and we&apos;ll embed the scheduling
          widget on your contact page. Visitors book directly into your
          calendar — no back-and-forth emails.
        </p>

        <CalendlyWizard
          initialUrl={integration?.config?.url ?? ""}
          isConnected={!!integration?.enabled}
        />
      </div>
    </AdminShell>
  );
}
