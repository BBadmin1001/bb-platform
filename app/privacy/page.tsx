import Link from "next/link";
import ShimmerText from "@/components/ShimmerText";
import { site } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy & Disclaimers | Samina Bilal",
  description:
    "Privacy policy, real estate disclaimers, and terms for saminarealtor.com.",
};

export default function PrivacyPage() {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* HERO — matches inner-page pattern */}
      <section className="relative min-h-[55vh] w-full overflow-hidden bg-navy-dark">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1920&auto=format&fit=crop&q=85')",
          }}
        />
        <div className="absolute inset-0 overlay-hero" />

        <div className="relative z-10 min-h-[55vh] flex flex-col items-center justify-center text-center px-6 pt-28 md:pt-32 pb-14 md:pb-16">
          <p className="eyebrow-light mb-10">Legal</p>
          <h1
            className="heading-display text-white"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: 1.04 }}
          >
            <ShimmerText>Privacy & Disclaimers</ShimmerText>
          </h1>
          <div className="mt-10 w-16 h-px bg-white/40" />
          <p className="mt-10 max-w-2xl text-base font-light text-white/85 italic">
            Last updated: {today}
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto space-y-14 text-base font-light leading-[1.95] text-ink/85">
          {/* Privacy section */}
          <div>
            <p className="eyebrow text-navy mb-4">Privacy Policy</p>
            <h2
              className="text-xl md:text-2xl uppercase mb-6 text-ink"
              style={{ fontWeight: 400, letterSpacing: "0.10em" }}
            >
              Your Information
            </h2>
            <div className="mb-8 w-12 h-px bg-navy/40" />

            <p className="mb-5">
              When you contact me through this website — whether through the
              contact form, the home valuation request, the newsletter signup,
              or by email or phone — you may share information like your name,
              email address, phone number, property address, and the reason
              you're reaching out.
            </p>
            <p className="mb-5">
              I use that information for one purpose: to help you with your real
              estate goals. That includes responding to your inquiry, sending
              market reports if you've subscribed, introducing you to vetted
              partners (lenders, inspectors, settlement attorneys, etc.) only
              when you've asked for an introduction, and keeping you informed
              throughout an active transaction.
            </p>
            <p className="mb-5">
              I will never sell your information. I will never share it with
              advertisers or third-party marketing services. The only people
              who see it are me, my immediate brokerage support staff at{" "}
              {site.brokerage}, and the partners you've explicitly asked to be
              introduced to.
            </p>
            <p>
              You can ask me to delete your information from my records at any
              time. Email{" "}
              <a
                href={site.emailHref}
                className="text-navy underline underline-offset-4 hover:no-underline"
              >
                {site.email}
              </a>{" "}
              and I'll confirm within 48 hours.
            </p>
          </div>

          {/* Newsletter / SMS consent */}
          <div>
            <p className="eyebrow text-navy mb-4">Communications</p>
            <h2
              className="text-xl md:text-2xl uppercase mb-6 text-ink"
              style={{ fontWeight: 400, letterSpacing: "0.10em" }}
            >
              Calls, Texts &amp; Email
            </h2>
            <div className="mb-8 w-12 h-px bg-navy/40" />

            <p className="mb-5">
              By submitting a contact form on this site, you agree to be
              contacted by Samina Bilal by call, email, and text for real estate
              services. To opt out at any time, reply{" "}
              <strong>STOP</strong> to any text or click "unsubscribe" at the
              bottom of any email.
            </p>
            <p>
              Message and data rates may apply. Message frequency varies by
              transaction stage — typically a few messages per week during
              active negotiations, less otherwise.
            </p>
          </div>

          {/* Cookies / analytics */}
          <div>
            <p className="eyebrow text-navy mb-4">Cookies &amp; Analytics</p>
            <h2
              className="text-xl md:text-2xl uppercase mb-6 text-ink"
              style={{ fontWeight: 400, letterSpacing: "0.10em" }}
            >
              How This Site Tracks You
            </h2>
            <div className="mb-8 w-12 h-px bg-navy/40" />

            <p>
              This site uses standard, privacy-respecting analytics to
              understand which pages are most useful and which aren't. No
              third-party advertising trackers, no pixel-based remarketing, no
              data sales to ad networks. If you'd prefer to disable analytics
              entirely, your browser's "Do Not Track" setting is honored.
            </p>
          </div>

          {/* Real estate disclaimers */}
          <div>
            <p className="eyebrow text-navy mb-4">Real Estate Disclaimers</p>
            <h2
              className="text-xl md:text-2xl uppercase mb-6 text-ink"
              style={{ fontWeight: 400, letterSpacing: "0.10em" }}
            >
              Standard Industry Notes
            </h2>
            <div className="mb-8 w-12 h-px bg-navy/40" />

            <ul className="space-y-5 list-none">
              <li>
                <strong className="text-ink">Equal Housing Opportunity.</strong>{" "}
                Samina Bilal and {site.brokerage} fully support the principles
                of the Fair Housing Act and the Equal Opportunity Act. We do
                not discriminate on the basis of race, color, religion, sex,
                handicap, familial status, or national origin.
              </li>
              <li>
                <strong className="text-ink">Independent ownership.</strong>{" "}
                Each {site.brokerage} office is independently owned and
                operated.
              </li>
              <li>
                <strong className="text-ink">Listing accuracy.</strong> All
                property information on this site is deemed reliable but not
                guaranteed. Square footage, lot size, room counts, and other
                details should be independently verified by a qualified
                inspector or surveyor before purchase.
              </li>
              <li>
                <strong className="text-ink">Market data.</strong> Market
                statistics shown on the Communities pages are sourced from
                Redfin and Bright MLS, updated monthly. They reflect aggregated
                public data and should not be the sole basis for any individual
                pricing decision.
              </li>
              <li>
                <strong className="text-ink">Past performance.</strong> Closings
                and reviews shown on this site reflect actual past
                transactions and are not a guarantee of future results.
              </li>
              <li>
                <strong className="text-ink">No legal or financial advice.</strong>{" "}
                Nothing on this site is legal, tax, or financial advice. Always
                consult a licensed professional in those fields before signing
                anything.
              </li>
              <li>
                <strong className="text-ink">Path to Ownership.</strong> The
                Path to Ownership program is a planning and educational
                process. It is not a "rent-to-own" lease, a credit-repair
                service, or a guarantee of mortgage approval. Mortgage approval
                is determined solely by the lender at the time of application.
              </li>
            </ul>
          </div>

          {/* Licensing */}
          <div>
            <p className="eyebrow text-navy mb-4">Licensing</p>
            <h2
              className="text-xl md:text-2xl uppercase mb-6 text-ink"
              style={{ fontWeight: 400, letterSpacing: "0.10em" }}
            >
              Where I'm Licensed
            </h2>
            <div className="mb-8 w-12 h-px bg-navy/40" />

            <p className="mb-5">
              Samina Bilal is a licensed real estate agent affiliated with{" "}
              {site.brokerage}.
            </p>
            <ul className="space-y-2 text-sm">
              <li>· Virginia License #{site.licenses.va}</li>
              <li>· Maryland License #{site.licenses.md}</li>
              <li>
                · Brokerage Office: {site.brokerageOffice.name},{" "}
                {site.brokerageOffice.street}, {site.brokerageOffice.cityStateZip}
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="eyebrow text-navy mb-4">Questions</p>
            <h2
              className="text-xl md:text-2xl uppercase mb-6 text-ink"
              style={{ fontWeight: 400, letterSpacing: "0.10em" }}
            >
              Get in Touch
            </h2>
            <div className="mb-8 w-12 h-px bg-navy/40" />

            <p className="mb-5">
              Questions about this policy, a request to delete your data, or
              anything else? Email{" "}
              <a
                href={site.emailHref}
                className="text-navy underline underline-offset-4 hover:no-underline"
              >
                {site.email}
              </a>{" "}
              or call{" "}
              <a
                href={site.phoneHref}
                className="text-navy underline underline-offset-4 hover:no-underline"
              >
                {site.phone}
              </a>
              .
            </p>
            <Link href="/contact" className="btn-outline-dark mt-4">
              Contact Samina
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
