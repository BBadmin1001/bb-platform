import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Webhook } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import LeadWebhookWizard from "@/components/admin/integrations/LeadWebhookWizard";
import { getLeadWebhook } from "@/lib/integrationStore";

export const dynamic = "force-dynamic";

export default async function LeadWebhookConfigPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const integration = await getLeadWebhook();

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
          Integrations · CRM webhook
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
            <Webhook size={20} strokeWidth={1.6} />
          </span>
          <h1
            className="text-2xl md:text-3xl"
            style={{
              color: "var(--foreground)",
              fontWeight: 600,
              letterSpacing: "0.005em",
            }}
          >
            CRM lead webhook
          </h1>
        </div>
        <p
          className="text-sm mb-8 max-w-2xl"
          style={{ color: "var(--muted-foreground)" }}
        >
          Send every form submission to your CRM the moment it lands.
          Works with <strong>Follow Up Boss</strong>, <strong>kvCORE</strong>,{" "}
          <strong>Zapier</strong>, <strong>n8n</strong>, <strong>Make</strong>,
          or any service that accepts an HTTPS webhook.
        </p>

        <LeadWebhookWizard
          initialUrl={integration?.config?.url ?? ""}
          initialApiKey={integration?.config?.apiKey ?? ""}
          initialLabel={integration?.config?.label ?? ""}
          isConnected={!!integration?.enabled}
        />
      </div>
    </AdminShell>
  );
}
