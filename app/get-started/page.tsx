import { Suspense } from "react";
import IntakeWizard from "@/components/IntakeWizard";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Get a Realtor Website · BB Website Project",
  description:
    "A boutique-quality real estate website, custom-domained, in 7 days. White-glove setup, monthly add-ons that actually move business.",
};

export const dynamic = "force-dynamic";

/**
 * Resolve a `?link=<token>` query into the sealed price + rep slug +
 * optional email pre-fill. Server-side so the customer can't edit
 * the URL to lower the price. The link row also tracks a
 * `clicked_at` timestamp for per-link conversion analytics.
 */
async function resolveLinkToken(token: string | null): Promise<{
  linkId: string;
  linkToken: string;
  agreedSetupCents: number;
  salesRepRef: string | null;
  prefillEmail: string | null;
  inactive?: boolean;
} | null> {
  if (!token || !/^[a-z0-9]{8,40}$/i.test(token)) return null;
  const supabase = createServiceClient();
  const { data: link } = await supabase
    .from("sales_rep_links")
    .select(
      "id, link_token, agreed_setup_cents, client_email, is_active, rep_id, clicked_at, sales_reps!inner(slug)",
    )
    .eq("link_token", token)
    .maybeSingle();
  if (!link) return null;

  // Stamp the first click for conversion analytics. Fire-and-forget.
  if (!link.clicked_at) {
    void supabase
      .from("sales_rep_links")
      .update({ clicked_at: new Date().toISOString() })
      .eq("id", link.id);
  }

  const repSlug =
    (link.sales_reps as unknown as { slug: string } | { slug: string }[])
      ? Array.isArray(link.sales_reps)
        ? (link.sales_reps[0]?.slug ?? null)
        : (link.sales_reps as { slug: string }).slug
      : null;

  return {
    linkId: link.id as string,
    linkToken: link.link_token as string,
    agreedSetupCents: link.agreed_setup_cents as number,
    salesRepRef: repSlug,
    prefillEmail: (link.client_email as string | null) ?? null,
    inactive: !link.is_active,
  };
}

/**
 * Public intake page. Reachable from any host (including a tenant's
 * site footer "Powered by …" link, the master root, or the platform's
 * own marketing landing). Tenant context is preserved when set so we
 * can attribute the referral.
 */
export default async function GetStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string; ref?: string; price?: string }>;
}) {
  const params = await searchParams;
  const linkInfo = await resolveLinkToken(params.link ?? null);

  // If the link is deactivated (master killed it), show a friendly
  // "this link has been disabled" message instead of letting the
  // customer fill out the wizard pointlessly.
  if (linkInfo?.inactive) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: "#F2EFEA", color: "#142840" }}
      >
        <div className="max-w-md text-center">
          <h1
            className="text-3xl mb-4"
            style={{ fontWeight: 200, letterSpacing: "0.005em" }}
          >
            This onboarding link has been deactivated.
          </h1>
          <p className="text-sm" style={{ color: "rgba(0,0,0,0.7)" }}>
            Reach out to your sales rep for a fresh link. If you came here
            by mistake, head to{" "}
            <a
              href="/"
              style={{ color: "#142840", textDecoration: "underline" }}
            >
              the main site
            </a>
            .
          </p>
        </div>
      </main>
    );
  }
  return GetStartedPageInner(linkInfo);
}

function GetStartedPageInner(
  linkInfo: Awaited<ReturnType<typeof resolveLinkToken>>,
) {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Inline styles so this page works regardless of which layout
          owns it. Avoids dependency on a specific tenant's brand. */}
      <style>{`
        .intake-input {
          width: 100%;
          padding: 0.85rem 1rem;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.14);
          border-radius: 6px;
          font: inherit;
          font-size: 0.95rem;
          color: #142840;
          transition: border-color 200ms ease;
        }
        .intake-input:focus {
          outline: none;
          border-color: rgba(20, 40, 64, 0.45);
          box-shadow: 0 0 0 3px rgba(20, 40, 64, 0.08);
        }
        textarea.intake-input { resize: vertical; min-height: 5rem; }
      `}</style>

      <section
        className="section-y gutter-x"
        style={{ background: "#F2EFEA" }}
      >
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="eyebrow mb-6">For Realtors</p>
          <h1
            className="heading-display text-4xl md:text-5xl mb-6"
            style={{
              color: "#142840",
              fontWeight: 200,
              lineHeight: 1.1,
            }}
          >
            Your boutique website.
            <br />
            Live in 7 days.
          </h1>
          <p
            className="text-base md:text-lg leading-relaxed max-w-xl mx-auto"
            style={{ color: "rgba(0,0,0,0.72)" }}
          >
            Hand-built, custom-domained, and yours to edit. We do the heavy
            lifting; you focus on clients.
          </p>
        </div>

        {/* Suspense boundary because IntakeWizard reads searchParams via
            next/navigation — Next 16 requires it to be inside a
            Suspense for static-routing safety. */}
        <Suspense fallback={null}>
          <IntakeWizard
            linkToken={linkInfo?.linkToken ?? null}
            sealedAgreedSetupCents={linkInfo?.agreedSetupCents ?? null}
            sealedSalesRepRef={linkInfo?.salesRepRef ?? null}
            prefillEmail={linkInfo?.prefillEmail ?? null}
          />
        </Suspense>
      </section>

      <section
        className="section-y gutter-x"
        style={{ background: "#142840", color: "white" }}
      >
        <div className="max-w-4xl mx-auto">
          <p
            className="text-center mb-12"
            style={{
              fontSize: "0.72rem",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.65)",
              fontWeight: 400,
            }}
          >
            How it works
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <Step n="01" title="You tell us about your business">
              5-minute intake form. We follow up within one business day with
              a quote — flat setup fee plus optional monthly add-ons.
            </Step>
            <Step n="02" title="We build, you review">
              Within 7 days you have a live site on your domain. Branded,
              fast, and visible to Google.
            </Step>
            <Step n="03" title="You edit it, forever">
              An admin panel — calls, copy, photos, listings, reviews, all
              editable by you, all yours.
            </Step>
          </div>
        </div>
      </section>
    </main>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="admin-mono mb-4"
        style={{
          color: "rgba(255,255,255,0.5)",
          fontSize: "0.85rem",
          letterSpacing: "0.18em",
        }}
      >
        {n}
      </p>
      <h3
        className="text-xl mb-3"
        style={{ fontWeight: 500, letterSpacing: "0.005em" }}
      >
        {title}
      </h3>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "rgba(255,255,255,0.78)" }}
      >
        {children}
      </p>
    </div>
  );
}
