import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plug, BarChart3, Star, Calendar, Webhook } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import {
  getGoogleIntegration,
  getAnalyticsIntegration,
  getCalendlyIntegration,
  getLeadWebhook,
} from "@/lib/integrationStore";

export const dynamic = "force-dynamic";

/**
 * Integrations hub — every third-party service the tenant can hook
 * into. Each card links to its dedicated configuration page.
 */
export default async function IntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const [google, ga, calendly, webhook] = await Promise.all([
    getGoogleIntegration(),
    getAnalyticsIntegration(),
    getCalendlyIntegration(),
    getLeadWebhook(),
  ]);

  const cards = [
    {
      href: "/admin/integrations/google",
      icon: Star,
      title: "Google Reviews",
      blurb: "Pull your Google My Business reviews into the site.",
      connected: !!google?.enabled,
      gatedFeature: "google_reviews_widget" as const,
    },
    {
      href: "/admin/integrations/analytics",
      icon: BarChart3,
      title: "Google Analytics 4",
      blurb: "Drop a GA4 measurement ID and we'll inject the tag.",
      connected: !!ga?.enabled,
      gatedFeature: "analytics" as const,
    },
    {
      href: "/admin/integrations/calendly",
      icon: Calendar,
      title: "Calendly",
      blurb: "Embed your scheduling widget on the contact page.",
      connected: !!calendly?.enabled,
    },
    {
      href: "/admin/integrations/lead-webhook",
      icon: Webhook,
      title: "CRM lead webhook",
      blurb:
        "Send every form submission to Follow Up Boss, kvCORE, Zapier, or any URL.",
      connected: !!webhook?.enabled,
    },
  ];

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-5xl mx-auto py-8">
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
          Site Editor · Integrations
        </p>
        <h1
          className="text-2xl md:text-3xl mb-2"
          style={{
            color: "var(--foreground)",
            fontWeight: 600,
            letterSpacing: "0.005em",
          }}
        >
          Integrations.
        </h1>
        <p
          className="text-sm mb-10 max-w-2xl"
          style={{ color: "var(--muted-foreground)" }}
        >
          Hook the website up to the tools you already use — your CRM,
          your calendar, Google Analytics, Google My Business reviews.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="admin-card p-5 flex items-start gap-4 group hover:shadow-md transition-shadow"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 12%, var(--card))",
                  color: "var(--primary)",
                }}
              >
                <c.icon size={18} strokeWidth={1.6} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3
                    className="text-base"
                    style={{
                      color: "var(--card-foreground)",
                      fontWeight: 600,
                    }}
                  >
                    {c.title}
                  </h3>
                  {c.connected && (
                    <span
                      className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                      style={{
                        color: "var(--primary)",
                        background:
                          "color-mix(in srgb, var(--primary) 14%, transparent)",
                        fontWeight: 700,
                      }}
                    >
                      Connected
                    </span>
                  )}
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {c.blurb}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
