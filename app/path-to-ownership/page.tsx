import Link from "next/link";
import ShimmerText from "@/components/ShimmerText";
import AutoFitHeading from "@/components/AutoFitHeading";
import Counter from "@/components/Counter";
import StackedCards from "@/components/StackedCards";
import DarkBreak from "@/components/DarkBreak";
import { getPageContent, getSection, resolveImageUrl } from "@/lib/contentLoader";
import { getCurrentTenant } from "@/lib/tenant/context";

export async function generateMetadata() {
  const tenant = await getCurrentTenant();
  const name = tenant?.realtor_name?.trim();
  return {
    title: name
      ? `Path to Ownership | Renter to Homeowner — ${name}`
      : "Path to Ownership | Renter to Homeowner",
    description:
      "A guided 12-to-24 month plan to take you from renting to closing. Free consultation. No pressure.",
  };
}

export const dynamic = "force-dynamic";

// Step image fallbacks — if no admin-picked image exists, the live page
// renders these Unsplash URLs. The registry's `path.stepImages` section
// lets Samina swap each one independently.
const stepImageFallbacks = [
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1920&auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=1920&auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1920&auto=format&fit=crop&q=85",
];

type PathContent = {
  hero: {
    eyebrow: string;
    titleLines: string[];
    subtitle: string;
    backgroundImage?: { image_id?: string };
  };
  truth: { eyebrow: string; heading: string; body: string };
  steps: { n: string; title: string; body: string }[];
  stats: { to: string | number; prefix?: string; suffix?: string; label: string }[];
  forWho: { eyebrow: string; heading: string; lines: string[] };
  faqs: { q: string; a: string }[];
  cta: {
    heading: string;
    body: string;
    primary: { label: string; href: string };
    backgroundImage?: { image_id?: string };
  };
};

type DarkBreakContent = {
  backgroundImage?: { image_id?: string };
  eyebrow?: string;
  quote?: string;
  attribution?: string;
};

type StepImagesContent = {
  step1?: { image_id?: string };
  step2?: { image_id?: string };
  step3?: { image_id?: string };
  step4?: { image_id?: string };
};

export default async function PathPage() {
  const [c, darkBreak, stepImagesContent] = await Promise.all([
    getPageContent<PathContent>("path"),
    getSection<DarkBreakContent>("path", "darkBreak"),
    getSection<StepImagesContent>("path", "stepImages"),
  ]);

  const ctaFallbackBg =
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1920&auto=format&fit=crop&q=85";
  const darkBreakFallbackBg =
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&auto=format&fit=crop&q=85";

  const [heroBg, ctaBg, darkBreakBg, ...stepImages] = await Promise.all([
    resolveImageUrl(c.hero.backgroundImage, {
      fallback:
        "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&auto=format&fit=crop&q=85",
      crop: "wide",
      width: 1920,
    }),
    resolveImageUrl(c.cta?.backgroundImage, {
      fallback: ctaFallbackBg,
      crop: "wide",
      width: 1920,
    }),
    resolveImageUrl(darkBreak?.backgroundImage, {
      fallback: darkBreakFallbackBg,
      crop: "wide",
      width: 1920,
    }),
    resolveImageUrl(stepImagesContent?.step1, {
      fallback: stepImageFallbacks[0],
      crop: "wide",
      width: 1920,
    }),
    resolveImageUrl(stepImagesContent?.step2, {
      fallback: stepImageFallbacks[1],
      crop: "wide",
      width: 1920,
    }),
    resolveImageUrl(stepImagesContent?.step3, {
      fallback: stepImageFallbacks[2],
      crop: "wide",
      width: 1920,
    }),
    resolveImageUrl(stepImagesContent?.step4, {
      fallback: stepImageFallbacks[3],
      crop: "wide",
      width: 1920,
    }),
  ]);

  const darkBreakEyebrow =
    (darkBreak?.eyebrow && darkBreak.eyebrow.trim()) || "The Plan";
  const darkBreakQuote =
    (darkBreak?.quote && darkBreak.quote.trim()) ||
    "A real closing date, not a fantasy.";
  const darkBreakAttribution =
    darkBreak?.attribution && darkBreak.attribution.trim()
      ? darkBreak.attribution
      : undefined;

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[85vh] w-full overflow-hidden bg-navy-dark">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${heroBg}')`,
          }}
        />
        <div className="absolute inset-0 overlay-hero" />

        <div className="relative z-10 min-h-[85vh] flex flex-col items-center justify-center text-center px-6 pt-28 md:pt-32 pb-14 md:pb-16">
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
          <p className="mt-12 max-w-2xl text-base md:text-lg font-light text-white/90 leading-[1.95]">
            {c.hero.subtitle}
          </p>
        </div>
      </section>

      {/* The truth */}
      <section className="section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto text-center">
          <p className="eyebrow mb-10">{c.truth.eyebrow}</p>
          <h2
            className="heading-section text-ink mb-12"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            {c.truth.heading}
          </h2>
          <div className="mx-auto mb-14 w-12 h-px bg-navy/40" />
          <p className="text-lg md:text-xl font-light leading-[1.9] text-ink/85">
            {c.truth.body}
          </p>
        </div>
      </section>

      {/* Steps — sticky-pin stack with photo backgrounds */}
      <section className="bg-cream-soft pt-32 md:pt-40 pb-20 md:pb-28 gutter-x">
        <div className="max-w-3xl mx-auto text-center">
          <p className="eyebrow mb-8">The Process</p>
          <h2
            className="heading-section text-ink"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            Four Steps to the Front Door
          </h2>
        </div>
      </section>
      <StackedCards>
        {(c.steps ?? []).map((s, i) => (
          <div
            key={s.n || i}
            className="relative w-full h-full overflow-hidden bg-navy-dark"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('${stepImages[i % stepImages.length]}')`,
              }}
            />
            <div className="absolute inset-0 overlay-hero" />
            <div className="relative z-10 h-full flex items-center justify-center">
              <div className="glass-dark max-w-2xl w-full mx-auto p-10 md:p-14 text-center text-white">
                <p
                  className="text-5xl md:text-6xl text-white/40 mb-6"
                  style={{ fontWeight: 200 }}
                >
                  {s.n}
                </p>
                <div className="mx-auto mb-8 w-12 h-px bg-white/40" />
                <h3
                  className="text-xl md:text-2xl uppercase mb-8"
                  style={{ fontWeight: 300, letterSpacing: "0.1em" }}
                >
                  {s.title}
                </h3>
                <p className="text-base md:text-lg font-light leading-[1.95] text-white/85 max-w-lg mx-auto">
                  {s.body}
                </p>
              </div>
            </div>
          </div>
        ))}
      </StackedCards>

      {/* Stats */}
      <section className="section-y gutter-x">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 text-center">
          {(c.stats ?? []).map((s) => {
            const num =
              typeof s.to === "number" ? s.to : parseFloat(String(s.to)) || 0;
            return (
              <div key={s.label}>
                <p
                  className="text-5xl md:text-6xl text-navy mb-6"
                  style={{ fontWeight: 200 }}
                >
                  <Counter to={num} prefix={s.prefix} suffix={s.suffix} />
                </p>
                <div className="mx-auto mb-5 w-8 h-px bg-navy/40" />
                <p className="text-[0.7rem] tracking-[0.32em] uppercase text-ink-muted leading-[1.7]">
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-cream-soft section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-24">
          <p className="eyebrow mb-8">{c.forWho.eyebrow}</p>
          <h2
            className="heading-section text-ink"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            {c.forWho.heading}
          </h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-6 text-base md:text-lg font-light text-ink/85 leading-[1.9]">
          {c.forWho.lines.map((line) => (
            <div key={line} className="flex items-start gap-5">
              <span
                className="text-navy text-2xl leading-none mt-1.5"
                style={{ fontWeight: 200 }}
              >
                ·
              </span>
              <p>{line}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dark break — separates "who it's for" from FAQ */}
      <DarkBreak
        bgImage={darkBreakBg}
        eyebrow={darkBreakEyebrow}
        quote={darkBreakQuote}
        attribution={darkBreakAttribution}
        height="sm"
      />

      {/* FAQ */}
      <section className="section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 md:mb-24">
            <p className="eyebrow mb-8">Common Questions</p>
            <h2
              className="heading-section text-ink"
              style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
            >
              Answered
            </h2>
          </div>
          <div className="space-y-4">
            {(c.faqs ?? []).map((f) => (
              <details
                key={f.q}
                className="group glass-light px-8 md:px-10 py-7 transition-all"
              >
                <summary className="cursor-pointer flex items-center justify-between text-base md:text-lg font-light text-ink list-none">
                  <span>{f.q}</span>
                  <span className="text-navy text-2xl ml-6 group-open:rotate-45 transition-transform duration-400 ease-editorial flex-shrink-0">
                    +
                  </span>
                </summary>
                <p className="mt-6 text-base font-light text-ink/75 leading-[1.9]">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
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
