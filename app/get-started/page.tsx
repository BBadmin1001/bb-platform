import { Suspense } from "react";
import IntakeWizard from "@/components/IntakeWizard";

export const metadata = {
  title: "Get a Realtor Website · BB Website Project",
  description:
    "A boutique-quality real estate website, custom-domained, in 7 days. White-glove setup, monthly add-ons that actually move business.",
};

export const dynamic = "force-dynamic";

/**
 * Public intake page. Reachable from any host (including a tenant's
 * site footer "Powered by …" link, the master root, or the platform's
 * own marketing landing). Tenant context is preserved when set so we
 * can attribute the referral.
 */
export default function GetStartedPage() {
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
          <IntakeWizard />
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
