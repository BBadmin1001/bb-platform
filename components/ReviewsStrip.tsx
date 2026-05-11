import { getReviews, ratingsLine } from "@/lib/reviewsLoader";
import { getSection, resolveImageUrl } from "@/lib/contentLoader";
import Reveal from "@/components/Reveal";
import Counter from "@/components/Counter";

type ReviewsIntro = {
  eyebrow: string;
  heading: string;
  backgroundImage?: { image_id?: string };
};

export default async function ReviewsStrip() {
  const [reviews, c] = await Promise.all([
    getReviews({ onlyHomepage: false }),
    getSection<ReviewsIntro>("home", "reviews"),
  ]);
  // No reviews for this tenant → render nothing instead of leaking
  // another tenant's testimonials (bug A1-002).
  if (reviews.length === 0) return null;
  const bgUrl = await resolveImageUrl(c.backgroundImage, {
    fallback:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1920&auto=format&fit=crop&q=85",
    crop: "wide",
    width: 1920,
  });
  return (
    <section className="relative section-y-lg gutter-x overflow-hidden bg-cream-soft">
      {/* Subtle background photo */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.08]"
        style={{
          backgroundImage: `url('${bgUrl}')`,
        }}
      />

      <div className="relative max-w-[1500px] mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-28">
          <Reveal as="p" className="eyebrow mb-8">{c.eyebrow}</Reveal>
          <Reveal
            as="h2"
            delay={80}
            className="heading-section text-ink"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            {c.heading}
          </Reveal>
          <Reveal as="div" delay={160} className="mx-auto mt-10 w-12 h-px bg-navy/40" />
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 md:gap-10">
          {reviews.slice(0, 3).map((r, i) => (
            <Reveal
              key={i}
              asChild
              direction={i === 0 ? "left" : i === 2 ? "right" : "up"}
              delay={i * 120}
            >
              <figure className="glass-light p-7 md:p-12 flex flex-col h-full">
                <div className="flex justify-center gap-1 text-navy mb-8 text-sm tracking-[0.4em]">
                  ★★★★★
                </div>
                <blockquote className="flex-1 text-base md:text-lg font-light leading-[1.95] text-ink/85 italic mb-10 text-center">
                  &ldquo;{r.quote}&rdquo;
                </blockquote>
                <div className="mx-auto w-10 h-px bg-navy/30 mb-6" />
                <figcaption className="text-[0.65rem] tracking-[0.32em] uppercase text-ink-muted text-center">
                  {r.short ? `${r.short} · ` : ""}
                  <span className="text-navy">{r.source}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        {/* Aggregate platform ratings — sourced from a static array
            that captures Samina's Zillow/Google/Realtor.com counts.
            For other tenants this section misleads, so we only show
            it when there are reviews AND the static block is non-
            empty. Per-tenant aggregate ratings come in a later phase
            (compute from reviews table or pull from Google Places /
            Zillow APIs). */}
        {ratingsLine.length > 0 && (
          <Reveal>
            <div className="mt-16 md:mt-28 max-w-3xl mx-auto flex flex-wrap items-end justify-center gap-x-10 sm:gap-x-16 gap-y-8 md:gap-y-10 text-center">
              {ratingsLine.map((r) => (
                <div key={r.source}>
                  <p
                    className="text-3xl text-navy mb-3"
                    style={{ fontWeight: 200 }}
                  >
                    <Counter to={r.value} decimals={1} />
                    <span className="ml-0.5 text-2xl">★</span>
                  </p>
                  <p className="text-[0.65rem] tracking-[0.32em] uppercase text-ink-muted mb-1.5">
                    {r.source}
                  </p>
                  <p className="text-xs font-light text-ink-subtle">{r.count}</p>
                </div>
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
