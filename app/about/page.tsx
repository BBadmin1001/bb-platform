import Link from "next/link";
import {
  getPageContent,
  getPortrait,
  getSection,
  resolveImageUrl,
} from "@/lib/contentLoader";
import ShimmerText from "@/components/ShimmerText";
import DarkBreak from "@/components/DarkBreak";
import { getCurrentTenant } from "@/lib/tenant/context";

export async function generateMetadata() {
  const tenant = await getCurrentTenant();
  const name = tenant?.realtor_name?.trim();
  const brokerage = tenant?.brokerage?.trim();
  return {
    title: name ? `About ${name}` : "About",
    description: name
      ? `${name}${brokerage ? ` is a Realtor with ${brokerage}` : " — Realtor"}.`
      : "About the realtor.",
  };
}

export const dynamic = "force-dynamic";

type AboutContent = {
  hero: { eyebrow: string; titleLines: string[]; subtitle: string };
  bio: { eyebrow: string; paragraphs: string[] };
  practiceAreas: {
    eyebrow: string;
    heading: string;
    cards: { h: string; p: string }[];
  };
  credentials: {
    eyebrow: string;
    heading: string;
    items: { label: string; value: string }[];
  };
  cta: {
    heading: string;
    body: string;
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
    backgroundImage?: { image_id?: string };
  };
};

type DarkBreakContent = {
  backgroundImage?: { image_id?: string };
  eyebrow?: string;
  quote?: string;
  attribution?: string;
};

export default async function AboutPage() {
  const [c, portrait, darkBreak] = await Promise.all([
    getPageContent<AboutContent>("about"),
    getPortrait(),
    getSection<DarkBreakContent>("about", "darkBreak"),
  ]);

  const ctaFallbackBg =
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&auto=format&fit=crop&q=85";
  const darkBreakFallbackBg =
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&auto=format&fit=crop&q=85";

  const [ctaBg, darkBreakBg] = await Promise.all([
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
  ]);

  const darkBreakEyebrow =
    (darkBreak?.eyebrow && darkBreak.eyebrow.trim()) || "What Stays With Clients";
  const darkBreakQuote =
    (darkBreak?.quote && darkBreak.quote.trim()) ||
    "Trust is built one home at a time.";
  const darkBreakAttribution =
    darkBreak?.attribution && darkBreak.attribution.trim()
      ? darkBreak.attribution
      : undefined;

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[90vh] w-full overflow-hidden bg-navy-dark">
        <div
          className="absolute inset-0 bg-cover bg-center grayscale"
          style={{ backgroundImage: `url('${portrait.full}')` }}
        />
        <div className="absolute inset-0 overlay-hero" />

        <div className="relative z-10 min-h-[90vh] flex flex-col items-center justify-center text-center px-6 pt-28 md:pt-32 pb-14 md:pb-16">
          <p className="eyebrow-light mb-10">{c.hero.eyebrow}</p>
          <h1
            className="heading-display text-white"
            style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)", lineHeight: 1.04 }}
          >
            <ShimmerText>
              {c.hero.titleLines.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < c.hero.titleLines.length - 1 && <br />}
                </span>
              ))}
            </ShimmerText>
          </h1>
          <div className="mt-12 w-16 h-px bg-white/40" />
          <p className="mt-12 max-w-xl text-base md:text-lg font-light text-white/90 leading-[1.95] italic">
            {c.hero.subtitle}
          </p>
        </div>
      </section>

      {/* Bio */}
      <section className="section-y-lg gutter-x">
        <div className="max-w-6xl mx-auto grid md:grid-cols-5 gap-16 md:gap-24 items-start">
          <div className="md:col-span-2">
            <div
              className="aspect-[3/4] bg-cover bg-center grayscale shadow-[0_30px_60px_-20px_rgba(20,40,64,0.18)]"
              style={{ backgroundImage: `url('${portrait.full}')` }}
            />
          </div>

          <div className="md:col-span-3 space-y-8 text-base md:text-lg font-light leading-[1.95] text-ink/85">
            <p className="eyebrow text-navy mb-2">{c.bio.eyebrow}</p>
            {c.bio.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Practice areas */}
      <section className="bg-cream-soft section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-24">
          <p className="eyebrow mb-8">{c.practiceAreas.eyebrow}</p>
          <h2
            className="heading-section text-ink"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            {c.practiceAreas.heading}
          </h2>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 md:gap-10">
          {c.practiceAreas.cards.map((b, i) => (
            <div key={b.h} className="glass-light glow-on-hover p-7 md:p-12 flex flex-col">
              <p
                className="text-3xl text-navy mb-2 tracking-wide"
                style={{ fontWeight: 200 }}
              >
                {String(i + 1).padStart(2, "0")}
              </p>
              <div className="my-6 w-10 h-px bg-navy/40" />
              <h3
                className="text-lg uppercase mb-5 text-ink"
                style={{ fontWeight: 400, letterSpacing: "0.08em" }}
              >
                {b.h}
              </h3>
              <p className="text-sm md:text-base font-light leading-[1.85] text-ink/75">
                {b.p}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Dark break — separates practice areas from credentials */}
      <DarkBreak
        bgImage={darkBreakBg}
        eyebrow={darkBreakEyebrow}
        quote={darkBreakQuote}
        attribution={darkBreakAttribution}
        height="sm"
      />

      {/* Credentials */}
      <section className="section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto text-center">
          <p className="eyebrow mb-8">{c.credentials.eyebrow}</p>
          <h2
            className="heading-section text-ink mb-12"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            {c.credentials.heading}
          </h2>
          <div className="mx-auto mb-14 w-12 h-px bg-navy/40" />

          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-8 max-w-xl mx-auto text-left">
            {c.credentials.items.map((item) => (
              <div key={item.label}>
                <p className="text-[0.65rem] tracking-[0.32em] uppercase text-ink-muted mb-2">
                  {item.label}
                </p>
                <p className="text-base font-light text-ink/85 leading-relaxed">
                  {item.value}
                </p>
              </div>
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
          <div className="flex flex-wrap justify-center gap-5">
            <Link href={c.cta.primary.href} className="btn-glass">
              {c.cta.primary.label}
            </Link>
            <Link href={c.cta.secondary.href} className="btn-outline-light">
              {c.cta.secondary.label}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
