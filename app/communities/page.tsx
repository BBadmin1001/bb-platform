import CommunitiesGrid from "@/components/CommunitiesGrid";
import DarkBreak from "@/components/DarkBreak";
import ShimmerText from "@/components/ShimmerText";
import { getCommunities } from "@/lib/communitiesLoader";
import { getPageContent, resolveImageUrl } from "@/lib/contentLoader";
import { getCurrentTenant } from "@/lib/tenant/context";

export async function generateMetadata() {
  const tenant = await getCurrentTenant();
  const name = tenant?.realtor_name?.trim();
  return {
    title: name ? `Communities | ${name}` : "Communities",
    description:
      "Neighborhoods we serve — with current market data and a local read on each.",
  };
}

export const dynamic = "force-dynamic";

type CommunitiesContent = {
  hero: { eyebrow: string; titleLines: string[]; subtitle: string; backgroundImage?: { image_id?: string } };
  tableIntro: { eyebrow: string; heading: string; subtitle: string; sourceNote: string };
  darkBreak: { backgroundImage?: { image_id?: string }; eyebrow?: string; quote?: string; attribution?: string };
};

export default async function CommunitiesPage() {
  const [communities, c] = await Promise.all([
    getCommunities(),
    getPageContent<CommunitiesContent>("communities"),
  ]);

  const [heroBg, darkBreakBg] = await Promise.all([
    resolveImageUrl(c.hero.backgroundImage, {
      fallback:
        "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=1920&auto=format&fit=crop&q=85",
      crop: "wide",
      width: 1920,
    }),
    resolveImageUrl(c.darkBreak.backgroundImage, {
      fallback:
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&auto=format&fit=crop&q=85",
      crop: "wide",
      width: 1920,
    }),
  ]);

  // Sort by YoY for the table — biggest gainers first
  const sorted = [...communities].sort((a, b) => {
    const av = parseFloat(a.yoy.replace(/[^0-9.\-]/g, "")) * (a.yoyDirection === "down" ? -1 : 1);
    const bv = parseFloat(b.yoy.replace(/[^0-9.\-]/g, "")) * (b.yoyDirection === "down" ? -1 : 1);
    return bv - av;
  });

  return (
    <>
      {/* HERO — full-bleed dark photo, matches inner-page pattern */}
      <section className="relative min-h-[75vh] w-full overflow-hidden bg-navy-dark">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${heroBg}')`,
          }}
        />
        <div className="absolute inset-0 overlay-hero" />

        <div className="relative z-10 min-h-[75vh] flex flex-col items-center justify-center text-center px-6 pt-28 md:pt-32 pb-14 md:pb-16">
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

      {/* 2026 comparison table */}
      <section className="section-y gutter-x bg-cream">
        <div className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
          <p className="eyebrow mb-8">{c.tableIntro.eyebrow}</p>
          <h2
            className="heading-section text-ink mb-10"
            style={{ fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)" }}
          >
            {c.tableIntro.heading}
          </h2>
          <div className="mx-auto mb-10 w-12 h-px bg-navy/40" />
          <p className="text-base font-light leading-[1.9] text-ink/70 max-w-xl mx-auto">
            {c.tableIntro.subtitle}
          </p>
        </div>

        <div className="max-w-5xl mx-auto glass-light p-2 md:p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm md:text-base font-light">
              <thead>
                <tr className="border-b border-ink/10 text-[0.62rem] tracking-[0.28em] uppercase text-ink-muted">
                  <th className="py-6 px-4 md:px-6">Neighborhood</th>
                  <th className="py-6 px-4 md:px-6">Median</th>
                  <th className="py-6 px-4 md:px-6">YoY</th>
                  <th className="py-6 px-4 md:px-6">DOM</th>
                  <th className="py-6 px-4 md:px-6">Market</th>
                </tr>
              </thead>
              <tbody className="text-ink/85">
                {sorted.map((c) => (
                  <tr
                    key={c.slug}
                    className="border-b border-ink/8 last:border-0 hover:bg-white/30 transition-colors"
                  >
                    <td className="py-6 px-4 md:px-6">
                      <a
                        href={`/communities/${c.slug}`}
                        className="uppercase tracking-[0.08em] text-ink hover:text-navy transition-colors"
                      >
                        {c.name}
                      </a>
                    </td>
                    <td className="py-6 px-4 md:px-6 tracking-wide">{c.median}</td>
                    <td
                      className={`py-6 px-4 md:px-6 tracking-wide ${
                        c.yoyDirection === "up"
                          ? "text-emerald-700"
                          : c.yoyDirection === "down"
                          ? "text-navy"
                          : "text-ink-muted"
                      }`}
                    >
                      {c.yoy}
                    </td>
                    <td className="py-6 px-4 md:px-6">{c.dom}</td>
                    <td className="py-6 px-4 md:px-6 text-[0.85rem]">
                      {c.marketType === "Balanced" ? "Balanced" : `${c.marketType}'s`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-8 text-xs text-ink-subtle italic text-center">
          {c.tableIntro.sourceNote}
        </p>
      </section>

      {/* Dark break — separates the comparison table from the photo grid */}
      <DarkBreak
        bgImage={darkBreakBg}
        eyebrow={c.darkBreak.eyebrow || "Six Neighborhoods, One Realtor"}
        quote={c.darkBreak.quote || "Local matters."}
        attribution={c.darkBreak.attribution}
        height="md"
      />

      <CommunitiesGrid />
    </>
  );
}
