import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Thank you · BB Website Project",
};

/**
 * Post-checkout thank-you. The Payment Link redirects here with
 * ?prospect=<uuid>. We just confirm the payment landed and outline
 * what's coming next — actual provisioning happens server-side via
 * the webhook (faster + more reliable than relying on this redirect).
 */
export default async function OnboardingDonePage({
  searchParams,
}: {
  searchParams: Promise<{ prospect?: string }>;
}) {
  const params = await searchParams;
  const prospectId = params.prospect;

  let businessName: string | null = null;
  let email: string | null = null;
  if (prospectId) {
    const supabase = await createClient();
    // Anon read is blocked by RLS — but we tell the customer their
    // own info from the URL/state so we don't need to surface it
    // via DB at all. Leaving this in case we later want a
    // "post-checkout summary" via signed link.
    const { data } = await supabase
      .from("prospects")
      .select("business_name, email")
      .eq("id", prospectId)
      .maybeSingle();
    if (data) {
      businessName = data.business_name;
      email = data.email;
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center">
        <CheckCircle2
          size={56}
          strokeWidth={1.4}
          style={{
            color: "rgb(var(--brand-primary-rgb, 20 40 64))",
            margin: "0 auto 1.75rem",
          }}
        />
        <h1
          className="text-3xl md:text-4xl mb-4"
          style={{
            fontWeight: 600,
            letterSpacing: "0.005em",
            color: "rgb(var(--brand-primary-rgb, 20 40 64))",
          }}
        >
          Payment received.
        </h1>
        <p
          className="text-base md:text-lg leading-relaxed mb-10"
          style={{ color: "rgba(0,0,0,0.7)" }}
        >
          {businessName ? (
            <>
              Welcome aboard, <strong>{businessName}</strong>. We're
              standing up your site now.
            </>
          ) : (
            <>Thanks — you're locked in.</>
          )}
        </p>

        <div
          className="rounded-md p-6 mb-8 text-left"
          style={{
            background: "#F2EFEA",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <p
            className="text-[11px] uppercase tracking-[0.22em] mb-3"
            style={{ color: "rgba(0,0,0,0.5)", fontWeight: 600 }}
          >
            What's next
          </p>
          <ol
            className="text-sm space-y-3 leading-relaxed"
            style={{ color: "rgba(0,0,0,0.78)", paddingLeft: "1.2rem" }}
          >
            <li>
              We're provisioning your site right now. You'll get an email
              {email ? (
                <>
                  {" "}at <strong>{email}</strong>
                </>
              ) : null}{" "}
              with admin access within a few minutes.
            </li>
            <li>
              We'll connect your custom domain and verify DNS.
              We'll guide you through any registrar steps in the email.
            </li>
            <li>
              Within 7 days you'll have a fully-built site ready to share
              with clients.
            </li>
          </ol>
        </div>

        <p
          className="text-xs"
          style={{ color: "rgba(0,0,0,0.5)" }}
        >
          Questions? Just reply to the welcome email.
        </p>
      </div>
    </main>
  );
}
