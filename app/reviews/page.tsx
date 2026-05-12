import { getReviews, ratingsLine } from "@/lib/reviewsLoader";
import Link from "next/link";
import ShimmerText from "@/components/ShimmerText";
import AutoFitHeading from "@/components/AutoFitHeading";
import { getPageContent, resolveImageUrl } from "@/lib/contentLoader";
import { getCurrentTenant } from "@/lib/tenant/context";

export async function generateMetadata() {
  const tenant = await getCurrentTenant();
  const name = tenant?.realtor_name?.trim();
  return {
    title: name ? `Reviews | ${name}` : "Reviews",
    description:
      "Client reviews across Zillow, Google, Realtor.com — in their own words.",
  };
}

export const dynamic = "force-dynamic";

type ReviewsPageContent = {
  hero: { eyebrow: string; titleLines: string[]; subtitle: string; backgroundImage?: { image_id?: string } };
  cta: { heading: string; body: string; primary: { label: string; href: string }; backgroundImage?: { image_id?: string } };
};

export default async function ReviewsPage() {
  const [reviews, c] = await Promise.all([
    getReviews(),
    getPageContent<ReviewsPageContent>("reviews"),
  ]);

  const [heroBg, ctaBg] = await Promise.all([
    resolveImageUrl(c.hero.backgroundImage, {
      fallback:
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1920&auto=format&fit=crop&q=85",
      crop: "wide",
      width: 1920,
    }),
    resolveImageUrl(c.cta.backgroundImage, {
      fallback:
        "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1920&auto=format&fit=crop&q=85",
      crop: "wide",
      width: 1920,
    }),
  ]);

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[70vh] w-full overflow-hidden bg-navy-dark">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${heroBg}')`,
          }}
        />
        <div className="absolute inset-0 overlay-hero" />

        <div className="relative z-10 min-h-[70vh] flex flex-col items-center justify-center text-center px-6 pt-28 md:pt-32 pb-14 md:pb-16">
          <p className="eyebrow-light mb-10">{c.hero.eyebrow}</p>
          <AutoFitHeading
            lines={c.hero.titleLines}
            className="heading-display text-white"
            maxRem={5.5}
            minRem={2.25}
            lineHeight={1.04}
            Wrap={ShimmerText}
          />
          <div className="mt-12 w-16 h-px bg-white/40" />

          {/* Aggregate ratings inside the hero */}
          <div className="mt-16 flex flex-wrap items-end justify-center gap-x-14 gap-y-10 text-center">
            {ratingsLine.map((r) => (
              <div key={r.source}>
                <p className="text-4xl text-white mb-2" style={{ fontWeight: 200 }}>
                  {r.value.toFixed(1)}
                  <span className="ml-1 text-3xl">★</span>
                </p>
                <div className="mx-auto my-3 w-7 h-px bg-white/40" />
                <p className="text-[0.65rem] tracking-[0.32em] uppercase text-white/75 mb-1">
                  {r.source}
                </p>
                <p className="text-xs font-light text-white/55">{r.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Big editorial quotes */}
      <section className="section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto space-y-24 md:space-y-28">
          {reviews.map((r, i) => (
            <figure key={i} className="text-center">
              <div className="text-navy mb-10 text-base tracking-[0.4em]">
                ★ ★ ★ ★ ★
              </div>
              <blockquote
                className="text-2xl md:text-3xl lg:text-4xl leading-[1.45] text-ink italic"
                style={{ fontWeight: 200, letterSpacing: "0.005em" }}
              >
                &ldquo;{r.quote}&rdquo;
              </blockquote>
              <div className="mx-auto my-10 w-10 h-px bg-navy/40" />
              <figcaption className="text-[0.65rem] tracking-[0.32em] uppercase text-ink-muted">
                {r.short ? `${r.short} · ` : ""}
                <span className="text-navy">{r.source}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-navy text-white section-y gutter-x overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.18]"
          style={{
            backgroundImage: `url('${ctaBg}')`,
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2
            className="heading-section mb-10"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            {c.cta.heading}
          </h2>
          <div className="mx-auto mb-10 w-12 h-px bg-white/40" />
          <p className="text-base md:text-lg font-light leading-[1.9] text-white/85 max-w-xl mx-auto mb-14">
            {c.cta.body}
          </p>
          <Link href={c.cta.primary.href} className="btn-glass">
            {c.cta.primary.label}
          </Link>
        </div>
      </section>
    </>
  );
}
