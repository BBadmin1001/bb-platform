import Link from "next/link";
import ShimmerText from "@/components/ShimmerText";
import DarkBreak from "@/components/DarkBreak";
import ProcessTimeline from "@/components/ProcessTimeline";
import ValuationForm from "@/components/ValuationForm";
import { getPageContent, getSection, resolveImageUrl } from "@/lib/contentLoader";
import {
  TrendingUp,
  Eye,
  Handshake,
  Calculator,
  Camera,
  Megaphone,
  Tag,
  ClipboardCheck,
  Key,
} from "lucide-react";

export const metadata = {
  title: "Selling a Home | Samina Bilal — VA & MD Listing Agent",
  description:
    "List with confidence. Local pricing intelligence, professional marketing, and negotiation that protects your bottom line — across Northern Virginia and Maryland.",
};

export const dynamic = "force-dynamic";

type SellersContent = {
  hero: {
    eyebrow: string;
    titleLines: string[];
    subtitle: string;
    backgroundImage?: { image_id?: string };
  };
  why: {
    eyebrow: string;
    heading: string;
    cards: { h: string; p: string }[];
  };
  process: {
    eyebrow: string;
    heading: string;
    steps: { n: string; h: string; p: string }[];
  };
  pricing: {
    eyebrow: string;
    heading: string;
    paragraphs: string[];
  };
  valuation: {
    eyebrow: string;
    heading: string;
    placeholders: { address: string; notes: string };
    submit: string;
    response: string;
  };
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

const reasonIcons = [
  <TrendingUp key="trending" size={28} strokeWidth={1.25} />,
  <Eye key="eye" size={28} strokeWidth={1.25} />,
  <Handshake key="handshake" size={28} strokeWidth={1.25} />,
];

const processIcons = [
  <Calculator key="calc" size={26} strokeWidth={1.25} />,
  <Tag key="tag" size={26} strokeWidth={1.25} />,
  <Camera key="camera" size={26} strokeWidth={1.25} />,
  <Megaphone key="mega" size={26} strokeWidth={1.25} />,
  <ClipboardCheck key="clipboard" size={26} strokeWidth={1.25} />,
  <Key key="key" size={26} strokeWidth={1.25} />,
];

export default async function SellersPage() {
  const [c, darkBreak, darkBreak2] = await Promise.all([
    getPageContent<SellersContent>("sellers"),
    getSection<DarkBreakContent>("sellers", "darkBreak"),
    getSection<DarkBreakContent>("sellers", "darkBreak2"),
  ]);

  const ctaFallbackBg =
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1920&auto=format&fit=crop&q=85";
  const darkBreakFallbackBg =
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1920&auto=format&fit=crop&q=85";
  const darkBreak2FallbackBg =
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&auto=format&fit=crop&q=85";

  const [heroBg, ctaBg, darkBreakBg, darkBreak2Bg] = await Promise.all([
    resolveImageUrl(c.hero.backgroundImage, {
      fallback:
        "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1920&auto=format&fit=crop&q=85",
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
    resolveImageUrl(darkBreak2?.backgroundImage, {
      fallback: darkBreak2FallbackBg,
      crop: "wide",
      width: 1920,
    }),
  ]);

  const darkBreakEyebrow =
    (darkBreak?.eyebrow && darkBreak.eyebrow.trim()) || "Pricing & Marketing";
  const darkBreakQuote =
    (darkBreak?.quote && darkBreak.quote.trim()) ||
    "The first fourteen days are everything.";
  const darkBreakAttribution =
    darkBreak?.attribution && darkBreak.attribution.trim()
      ? darkBreak.attribution
      : undefined;

  const timelineSteps = c.process.steps.map((s, i) => ({
    icon: processIcons[i],
    n: s.n,
    h: s.h,
    p: s.p,
  }));

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
          <h1
            className="heading-display text-white"
            style={{
              fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
              lineHeight: 1.04,
            }}
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

          <div className="mt-14 flex flex-wrap justify-center gap-5">
            <Link href="#valuation" className="btn-glass">
              Request a Valuation
            </Link>
            <Link href="/contact" className="btn-outline-light">
              Schedule a Consult
            </Link>
          </div>
        </div>
      </section>

      {/* Why list with Samina */}
      <section className="section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-24">
          <p className="eyebrow mb-8">{c.why.eyebrow}</p>
          <h2
            className="heading-section text-ink"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            {c.why.heading}
          </h2>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 md:gap-10">
          {c.why.cards.map((r, i) => (
            <div key={r.h} className="glass-light glow-on-hover p-7 md:p-12 flex flex-col">
              <div className="text-navy mb-6">{reasonIcons[i]}</div>
              <p
                className="text-3xl text-navy/40 mb-2 tracking-wide"
                style={{ fontWeight: 200 }}
              >
                {String(i + 1).padStart(2, "0")}
              </p>
              <div className="my-6 w-10 h-px bg-navy/40" />
              <h3
                className="text-lg uppercase mb-5 text-ink"
                style={{ fontWeight: 300, letterSpacing: "0.08em" }}
              >
                {r.h}
              </h3>
              <p className="text-sm font-light leading-[1.85] text-ink/75">
                {r.p}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* The selling process */}
      <section className="bg-cream-soft section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-24">
          <p className="eyebrow mb-8">{c.process.eyebrow}</p>
          <h2
            className="heading-section text-ink"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            {c.process.heading}
          </h2>
          <div className="mx-auto mt-10 w-12 h-px bg-navy/40" />
        </div>

        <ProcessTimeline steps={timelineSteps} />
      </section>

      {/* Dark break — separates process from pricing strategy */}
      <DarkBreak
        bgImage={darkBreakBg}
        eyebrow={darkBreakEyebrow}
        quote={darkBreakQuote}
        attribution={darkBreakAttribution}
        height="sm"
      />

      {/* Pricing strategy editorial block */}
      <section className="section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto text-center">
          <p className="eyebrow mb-10">{c.pricing.eyebrow}</p>
          <h2
            className="heading-section text-ink mb-12"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            {c.pricing.heading}
          </h2>
          <div className="mx-auto mb-14 w-12 h-px bg-navy/40" />
          <div className="space-y-6 text-base md:text-lg font-light leading-[1.95] text-ink/85 text-left md:text-center">
            {c.pricing.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Dark break — leads into the valuation form */}
      <DarkBreak
        bgImage={darkBreak2Bg}
        eyebrow={
          (darkBreak2?.eyebrow && darkBreak2.eyebrow.trim()) || undefined
        }
        quote={(darkBreak2?.quote && darkBreak2.quote.trim()) || undefined}
        attribution={
          (darkBreak2?.attribution && darkBreak2.attribution.trim()) ||
          undefined
        }
        height="sm"
      />

      {/* Valuation form */}
      <section id="valuation" className="bg-cream-soft section-y-lg gutter-x">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <p className="eyebrow mb-8">{c.valuation.eyebrow}</p>
            <h2
              className="heading-section text-ink"
              style={{ fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)" }}
            >
              {c.valuation.heading}
            </h2>
            <div className="mx-auto mt-10 w-12 h-px bg-navy/40" />
          </div>

          <ValuationForm />
        </div>
      </section>

      {/* Final CTA */}
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
