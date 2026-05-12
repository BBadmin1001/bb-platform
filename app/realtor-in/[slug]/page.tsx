import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MapPin, Star, Phone, Mail } from "lucide-react";
import { getCountyLanding } from "@/lib/countyLandingLoader";
import { getBrand, getPortrait } from "@/lib/contentLoader";
import { getReviews } from "@/lib/reviewsLoader";
import { getTenantChrome } from "@/lib/tenant/chrome";
import { siteOrigin } from "@/lib/qrcode";
import { getCurrentTenant } from "@/lib/tenant/context";
// Reuse the homepage's "Three ways I help" cards (Buying / Selling /
// Path to Ownership). Editing them in admin → home.services flows here too.
import PillarCards from "@/components/PillarCards";

/**
 * Public county landing page. Server-rendered, edge-cached, SEO-tuned.
 *
 *   URL: /realtor-in/[slug]   e.g. /realtor-in/loudoun-virginia
 *
 * Targets searches like "realtor in Loudoun County Virginia" by giving
 * Google:
 *   • county-specific H1 + meta title that mirrors the search phrase
 *   • a unique meta description per page
 *   • a unique URL on its own
 *   • RealEstateAgent + LocalBusiness JSON-LD with the county in
 *     `areaServed` so Google ties the page to the geographic intent
 *   • internal links to /communities and /contact for PageRank flow
 *   • a clear conversion path (call / email / valuation form)
 *
 * Pre-rendered at build time for every published county slug, with 60s
 * revalidation so admin edits show up shortly after save.
 */

// Multi-tenant safety: this page renders TENANT-scoped data
// (`getCurrentTenant`, `getBrand`, `getReviews`, `getTenantChrome`),
// so it MUST NOT be statically cached. If we marked it `force-static`,
// whichever tenant's request fills the cache first would have its
// branding/reviews/portrait served to every other tenant for the next
// `revalidate` window — a P0 cross-tenant data leak.
//
// We still want SEO speed for county landing pages — that's handled at
// the edge (Netlify Durable Cache keys per Host header), not via the
// Next.js static cache. Each request resolves the tenant via cookies/
// headers (set by proxy.ts) and renders that tenant's data.
//
// `generateStaticParams` is also dropped on purpose. Pre-rendering at
// build time has no tenant context, so it would either error or bake
// in fallbacks for every slug — neither useful, both confusing.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCountyLanding(slug);
  if (!page) return { title: "Not found" };

  const tenant = await getCurrentTenant();
  const realtorName = tenant?.realtor_name?.trim() || "Your Realtor";
  const brokerage = tenant?.brokerage?.trim();
  const subline = brokerage ? `${realtorName} — ${brokerage}` : realtorName;
  const title = `Realtor in ${page.countyName} County, ${page.stateName} | ${realtorName}`;
  const description =
    page.customMetaDescription ||
    `Looking for a realtor in ${page.countyName} County, ${page.stateName}? ${subline} guides buyers and sellers across ${page.serviceAreas.slice(0, 3).join(", ") || page.countyName} with five-star service and deep local market knowledge.`;
  return {
    metadataBase: new URL(siteOrigin()),
    title,
    description,
    alternates: { canonical: `${siteOrigin()}/realtor-in/${slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${siteOrigin()}/realtor-in/${slug}`,
      ...(page.heroImageUrl && { images: [{ url: page.heroImageUrl }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(page.heroImageUrl && { images: [page.heroImageUrl] }),
    },
  };
}

export default async function CountyLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [page, brand, portrait, reviews, chrome] = await Promise.all([
    getCountyLanding(slug),
    getBrand(),
    getPortrait(),
    getReviews(),
    getTenantChrome(),
  ]);
  if (!page) notFound();

  // Service areas are 100% admin-entered. When empty the section just doesn't
  // render — no county-specific presets baked into the codebase since this
  // template ships for many agents in many states.
  const areas = page.serviceAreas;

  const heading =
    page.customHeading ||
    `Your ${page.countyName} County, ${page.stateName} Realtor.`;

  const intro =
    page.customIntro ||
    `Buying or selling in ${page.countyName} County deserves an agent who knows the streets, the schools, and the rhythms of every neighborhood — not just a name on a sign. ${brand.name} (${brand.brokerage}) has guided buyers and sellers across ${areas.slice(0, 3).join(", ") || page.countyName} for years, with five-star reviews and a quiet reputation for getting deals done thoughtfully.`;

  const schemaMarkup = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "RealEstateAgent",
        "@id": `${siteOrigin()}/realtor-in/${slug}#realtor`,
        name: brand.name,
        description: `Realtor serving ${page.countyName} County, ${page.stateName}.`,
        url: `${siteOrigin()}/realtor-in/${slug}`,
        image: portrait.full,
        // telephone / email omitted when blank rather than rendering a
        // hardcoded fallback — Google would penalise inaccurate
        // contact data more than missing fields.
        ...(chrome.phone ? { telephone: chrome.phone } : {}),
        ...(chrome.email ? { email: chrome.email } : {}),
        worksFor: { "@type": "RealEstateAgent", name: brand.brokerage },
        areaServed: {
          "@type": "AdministrativeArea",
          name: `${page.countyName} County, ${page.stateName}`,
        },
      },
    ],
  };

  const featuredReviews = reviews.slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
      />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6"
        style={
          page.heroImageUrl
            ? {
                backgroundImage: `linear-gradient(rgba(20,40,64,0.55), rgba(20,40,64,0.65)), url(${page.heroImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { background: "var(--color-cream, #F2EFEA)" }
        }
      >
        <div className="max-w-4xl mx-auto text-center">
          <p
            className={page.heroImageUrl ? "eyebrow-light" : "eyebrow"}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <MapPin size={11} />
            {page.countyName} County · {page.stateName}
          </p>
          <h1
            className={`text-4xl md:text-6xl mt-5 mb-6 ${page.heroImageUrl ? "text-white" : "text-ink"}`}
            style={{
              fontWeight: 600,
              letterSpacing: "0.005em",
              lineHeight: 1.1,
            }}
          >
            {heading}
          </h1>
          <p
            className={`text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-10 ${page.heroImageUrl ? "text-white/90" : "text-ink/75"}`}
          >
            {intro}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className={page.heroImageUrl ? "btn-glass" : "btn-solid"}
            >
              Schedule a Call
            </Link>
            <Link
              href="/sellers"
              className={
                page.heroImageUrl ? "btn-outline-light" : "btn-outline-dark"
              }
            >
              Get Home Valuation
            </Link>
          </div>
        </div>
      </section>

      {/* ── PILLAR CARDS (Buying / Selling / Path to Ownership) ─
           Same component the homepage uses, fed by `home.services`. Edits
           in /admin/content/home/services flow into this section too. */}
      <div className="bg-cream">
        <PillarCards />
      </div>

      {/* ── REVIEWS ──────────────────────────────────────────── */}
      {featuredReviews.length > 0 && (
        <section className="bg-cream-soft py-16 md:py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="eyebrow text-center mb-3">In their own words</p>
            <h2
              className="text-2xl md:text-3xl text-ink text-center mb-12"
              style={{ fontWeight: 600, letterSpacing: "0.005em" }}
            >
              What clients are saying
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredReviews.map((r, i) => (
                <div
                  key={i}
                  className="bg-white border border-black/8 rounded-lg p-6 shadow-sm"
                >
                  <div className="inline-flex gap-0.5 text-amber-500 mb-3">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        size={14}
                        fill="currentColor"
                        strokeWidth={1.5}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-ink/80 leading-relaxed italic mb-4 line-clamp-5">
                    &ldquo;{r.quote}&rdquo;
                  </p>
                  <p className="text-xs text-ink/55">
                    — {r.short || "Client"} · {r.source}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="bg-navy text-white py-16 md:py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="eyebrow-light mb-3">Ready to talk?</p>
          <h2
            className="text-3xl md:text-4xl mb-4"
            style={{
              fontWeight: 600,
              letterSpacing: "0.005em",
              lineHeight: 1.15,
            }}
          >
            Looking in {page.countyName} County?
          </h2>

          {/* Service areas + ZIP codes as glass-pill tags. Renders only
              when admin actually filled in service areas — empty state
              just shows the heading + body text below, no awkward gap. */}
          {(areas.length > 0 || page.zipCodes.length > 0) && (
            <div className="flex flex-wrap justify-center gap-2 mb-7 max-w-2xl mx-auto">
              {areas.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm rounded-full px-3 py-1.5 backdrop-blur-sm"
                  style={{
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    color: "rgba(255,255,255,0.92)",
                    fontWeight: 500,
                  }}
                >
                  <MapPin size={11} className="opacity-60" />
                  {a}
                </span>
              ))}
              {page.zipCodes.map((zip) => (
                <span
                  key={zip}
                  className="inline-flex items-center text-xs sm:text-sm admin-mono rounded-full px-3 py-1.5 backdrop-blur-sm"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "rgba(255,255,255,0.78)",
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                  }}
                >
                  {zip}
                </span>
              ))}
            </div>
          )}

          <p className="text-base md:text-lg text-white/80 leading-relaxed max-w-xl mx-auto mb-10">
            Let&apos;s talk about your timeline, your budget, and what
            you&apos;re looking for. Most consults take 15 minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {chrome.phone && (
              <a href={chrome.phoneHref || undefined} className="btn-glass">
                <Phone size={14} className="mr-2" />
                {chrome.phone}
              </a>
            )}
            {chrome.email && (
              <a
                href={chrome.emailHref || undefined}
                className="btn-outline-light"
              >
                <Mail size={14} className="mr-2" />
                Email {chrome.name.split(/\s+/)[0] || chrome.name}
              </a>
            )}
            {/* Always-available fallback CTA in case contact details
                haven't been set yet — links to the contact form. */}
            {!chrome.phone && !chrome.email && (
              <Link href="/contact" className="btn-glass">
                Get in Touch
              </Link>
            )}
          </div>
          <Link
            href="/communities"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.28em] text-white/70 hover:text-white"
          >
            Browse all communities
            <ArrowRight size={11} />
          </Link>
        </div>
      </section>
    </>
  );
}
