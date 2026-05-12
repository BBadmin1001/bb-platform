import Link from "next/link";
import {
  Search,
  HandCoins,
  ClipboardCheck,
  Home as HomeIcon,
  Key,
  FileSignature,
  ShieldCheck,
  Users,
  Compass,
} from "lucide-react";
import { getCommunities } from "@/lib/communitiesLoader";
import { getPageContent, getSection, resolveImageUrl } from "@/lib/contentLoader";
import ShimmerText from "@/components/ShimmerText";
import MortgageCalculator from "@/components/MortgageCalculator";
import DarkBreak from "@/components/DarkBreak";
import ProcessTimeline from "@/components/ProcessTimeline";
import { getCurrentTenant } from "@/lib/tenant/context";

export async function generateMetadata() {
  const tenant = await getCurrentTenant();
  const name = tenant?.realtor_name?.trim();
  return {
    title: name ? `Buying a Home | ${name}` : "Buying a Home",
    description:
      "First home or fifth — local market knowledge, sharp negotiation, end-to-end representation.",
  };
}

export const dynamic = "force-dynamic";

type BuyersContent = {
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
  financing: {
    eyebrow: string;
    heading: string;
    lead: string;
    cards: { h: string; p: string }[];
  };
  firstTimeCallout: {
    eyebrow: string;
    heading: string;
    body: string;
    cta: { label: string; href: string };
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

const whyMeIcons = [
  <Compass key="compass" size={28} strokeWidth={1.25} />,
  <ShieldCheck key="shield" size={28} strokeWidth={1.25} />,
  <Users key="users" size={28} strokeWidth={1.25} />,
];

const stepIcons = [
  <HandCoins key="handcoins" size={26} strokeWidth={1.25} />,
  <Search key="search" size={26} strokeWidth={1.25} />,
  <FileSignature key="filesignature" size={26} strokeWidth={1.25} />,
  <ClipboardCheck key="clipboardcheck" size={26} strokeWidth={1.25} />,
  <HomeIcon key="home" size={26} strokeWidth={1.25} />,
  <Key key="key" size={26} strokeWidth={1.25} />,
];

export default async function BuyersPage() {
  const [c, darkBreak, communities] = await Promise.all([
    getPageContent<BuyersContent>("buyers"),
    getSection<DarkBreakContent>("buyers", "darkBreak"),
    getCommunities(),
  ]);

  const ctaFallbackBg =
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1920&auto=format&fit=crop&q=85";
  const darkBreakFallbackBg =
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&auto=format&fit=crop&q=85";

  const [heroBg, ctaBg, darkBreakBg] = await Promise.all([
    resolveImageUrl(c.hero.backgroundImage, {
      fallback:
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&auto=format&fit=crop&q=85",
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
  ]);

  const darkBreakEyebrow =
    (darkBreak?.eyebrow && darkBreak.eyebrow.trim()) || "Between Steps";
  const darkBreakQuote =
    (darkBreak?.quote && darkBreak.quote.trim()) ||
    "A house isn't a home until it fits your life.";
  const darkBreakAttribution =
    darkBreak?.attribution && darkBreak.attribution.trim()
      ? darkBreak.attribution
      : undefined;

  const featuredCommunities = communities.slice(0, 3);

  const timelineSteps = c.process.steps.map((s, i) => ({
    icon: stepIcons[i],
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
            <Link href="/contact" className="btn-glass">
              Schedule a Consult
            </Link>
            <Link href="/communities" className="btn-outline-light">
              Explore Communities
            </Link>
          </div>
        </div>
      </section>

      {/* Why work with Samina */}
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
              <div className="text-navy mb-6">{whyMeIcons[i]}</div>
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

      {/* The 6-step buying process */}
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

      {/* Dark break — separates process from financing */}
      <DarkBreak
        bgImage={darkBreakBg}
        eyebrow={darkBreakEyebrow}
        quote={darkBreakQuote}
        attribution={darkBreakAttribution}
        height="sm"
      />

      {/* Financing */}
      <section className="section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-24">
          <p className="eyebrow mb-8">{c.financing.eyebrow}</p>
          <h2
            className="heading-section text-ink"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            {c.financing.heading}
          </h2>
          <div className="mx-auto mt-10 w-12 h-px bg-navy/40" />
          <p className="mt-12 text-base md:text-lg font-light leading-[1.9] text-ink/75 max-w-2xl mx-auto">
            {c.financing.lead}
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 md:gap-10">
          {c.financing.cards.map((f) => (
            <div key={f.h} className="glass-light p-7 md:p-12">
              <h3
                className="text-xl uppercase mb-6 text-navy"
                style={{ fontWeight: 300, letterSpacing: "0.1em" }}
              >
                {f.h}
              </h3>
              <div className="mb-6 w-10 h-px bg-navy/40" />
              <p className="text-sm md:text-base font-light leading-[1.9] text-ink/80">
                {f.p}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Mortgage calculator — Phase 20. Numbers are illustrative only;
          a disclaimer inside the component reminds visitors to get a
          real quote from a licensed loan officer. */}
      <section className="section-y gutter-x" style={{ background: "#FAFAFA" }}>
        <div className="max-w-5xl mx-auto">
          <MortgageCalculator />
        </div>
      </section>

      {/* First-time buyer spotlight — links to Path to Ownership */}
      <section className="relative bg-navy text-white section-y-lg gutter-x overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.18]"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1920&auto=format&fit=crop&q=85')",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="eyebrow-light mb-10">{c.firstTimeCallout.eyebrow}</p>
          <h2
            className="heading-section text-white mb-10"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            {c.firstTimeCallout.heading}
          </h2>
          <div className="mx-auto mb-12 w-12 h-px bg-white/40" />
          <p className="text-base md:text-lg font-light leading-[1.95] text-white/85 max-w-xl mx-auto mb-14">
            {c.firstTimeCallout.body}
          </p>
          <Link href={c.firstTimeCallout.cta.href} className="btn-glass">
            {c.firstTimeCallout.cta.label}
          </Link>
        </div>
      </section>

      {/* Featured communities preview */}
      <section className="section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-24">
          <p className="eyebrow mb-8">Where Samina Works</p>
          <h2
            className="heading-section text-ink"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            Featured Communities
          </h2>
        </div>

        <div className="max-w-[1500px] mx-auto grid md:grid-cols-3 gap-8 md:gap-10 mb-16">
          {featuredCommunities.map((community) => (
            <Link
              key={community.slug}
              href={`/communities/${community.slug}`}
              className="group relative aspect-[4/3] block overflow-hidden bg-navy-dark"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.4s] ease-editorial group-hover:scale-[1.05]"
                style={{ backgroundImage: `url('${community.image}')` }}
              />
              <div className="absolute inset-0 overlay-card" />
              <div className="absolute left-5 right-5 bottom-5 glass-dark px-6 py-5 text-white">
                <h3
                  className="text-xl uppercase tracking-wide"
                  style={{ fontWeight: 200, letterSpacing: "0.05em" }}
                >
                  {community.name}
                </h3>
                <p className="mt-2 text-xs font-light opacity-80 tracking-wider">
                  {community.median} · {community.yoy}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link href="/communities" className="btn-outline-dark">
            Browse All Six
          </Link>
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
