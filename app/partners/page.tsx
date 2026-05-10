import Link from "next/link";
import { Phone, Mail } from "lucide-react";
import ShimmerText from "@/components/ShimmerText";
import DarkBreak from "@/components/DarkBreak";
import { getPageContent, getSection, resolveImageUrl } from "@/lib/contentLoader";
import { getPartnerCategories } from "@/lib/partnersLoader";

export const metadata = {
  title: "Trusted Partners | Samina Bilal",
  description:
    "The lenders, inspectors, insurance agents, and trades Samina trusts with her own clients. Real names, real contact info, no kickbacks.",
};

export const dynamic = "force-dynamic";

type PartnersContent = {
  hero: {
    eyebrow: string;
    titleLines: string[];
    subtitle: string;
    backgroundImage?: { image_id?: string };
  };
  intro: { body: string };
  disclaimer: string;
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

export default async function PartnersPage() {
  const [c, categories, darkBreak] = await Promise.all([
    getPageContent<PartnersContent>("partners"),
    getPartnerCategories(),
    getSection<DarkBreakContent>("partners", "darkBreak"),
  ]);

  const ctaFallbackBg =
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&auto=format&fit=crop&q=85";
  const darkBreakFallbackBg =
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1920&auto=format&fit=crop&q=85";

  const [heroBg, ctaBg, darkBreakBg] = await Promise.all([
    resolveImageUrl(c.hero.backgroundImage, {
      fallback:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1920&auto=format&fit=crop&q=85",
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
    darkBreak?.eyebrow && darkBreak.eyebrow.trim() ? darkBreak.eyebrow : undefined;
  const darkBreakQuote =
    darkBreak?.quote && darkBreak.quote.trim() ? darkBreak.quote : undefined;
  const darkBreakAttribution =
    darkBreak?.attribution && darkBreak.attribution.trim()
      ? darkBreak.attribution
      : undefined;

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
          <p className="mt-12 max-w-2xl text-base md:text-lg font-light text-white/90 leading-[1.95] italic">
            {c.hero.subtitle}
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-base md:text-lg font-light leading-[1.95] text-ink/85">
            {c.intro.body}
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-cream-soft pb-32 md:pb-40">
        <div className="max-w-[1500px] mx-auto gutter-x">
          {categories.map((cat, i) => (
            <div
              key={cat.title}
              className={`grid md:grid-cols-12 gap-12 md:gap-20 ${
                i === 0 ? "pt-32 md:pt-40" : "pt-24 md:pt-32"
              }`}
            >
              {/* Heading column */}
              <div className="md:col-span-4">
                <p
                  className="text-5xl md:text-6xl text-navy/35 mb-6"
                  style={{ fontWeight: 200 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </p>
                <div className="mb-6 w-10 h-px bg-navy/40" />
                <h2
                  className="text-xl md:text-2xl uppercase mb-6 text-ink"
                  style={{ fontWeight: 400, letterSpacing: "0.10em" }}
                >
                  {cat.title}
                </h2>
                <p className="text-sm md:text-base font-light leading-[1.85] text-ink/75 max-w-md">
                  {cat.body}
                </p>
              </div>

              {/* Contacts column */}
              <div className="md:col-span-8 space-y-5">
                {cat.contacts.map((p) => (
                  <div
                    key={p.name + p.role}
                    className="glass-light glow-on-hover p-7 md:p-9 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-center"
                  >
                    {/* Headshot — circular avatar; gracefully shrinks the
                         column when no photo is set */}
                    <div
                      className={`${p.photo ? "md:col-span-2" : "hidden"} flex justify-center md:justify-start`}
                    >
                      {p.photo && (
                        <div className="relative w-20 h-20 md:w-[72px] md:h-[72px] rounded-full overflow-hidden ring-1 ring-navy/15 bg-cream-soft shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.photo}
                            alt={p.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Name + role */}
                    <div className={p.photo ? "md:col-span-3" : "md:col-span-5"}>
                      <p
                        className="text-base md:text-lg text-ink mb-1"
                        style={{ fontWeight: 400, letterSpacing: "0.02em" }}
                      >
                        {p.name}
                      </p>
                      <p className="text-[0.65rem] tracking-[0.28em] uppercase text-ink-muted">
                        {p.role}
                      </p>
                    </div>

                    {/* Company + logo */}
                    <div className="md:col-span-3">
                      <div className="flex items-center gap-2.5">
                        {p.logo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.logo}
                            alt={`${p.company} logo`}
                            className="h-7 md:h-8 w-auto max-w-[80px] object-contain shrink-0"
                          />
                        )}
                        <p className="text-sm font-light text-ink/75">
                          {p.company}
                        </p>
                      </div>
                    </div>

                    {/* Phone + email */}
                    <div className="md:col-span-4 flex flex-col md:items-end gap-2">
                      <a
                        href={`tel:${p.phone.replace(/[^0-9+]/g, "")}`}
                        className="inline-flex items-center gap-2 text-sm font-light text-ink hover:text-navy transition-colors"
                      >
                        <Phone size={14} strokeWidth={1.5} className="text-navy" />
                        {p.phone}
                      </a>
                      <a
                        href={`mailto:${p.email}`}
                        className="inline-flex items-center gap-2 text-sm font-light text-ink/80 hover:text-navy transition-colors"
                      >
                        <Mail size={14} strokeWidth={1.5} className="text-navy" />
                        {p.email}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dark break — separates the partner grid from the disclaimer */}
      <DarkBreak
        bgImage={darkBreakBg}
        eyebrow={darkBreakEyebrow}
        quote={darkBreakQuote}
        attribution={darkBreakAttribution}
        height="sm"
      />

      {/* Disclaimer */}
      <section className="section-y gutter-x">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-light italic leading-[1.85] text-ink-muted">
            {c.disclaimer}
          </p>
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
