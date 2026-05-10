import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getCommunities } from "@/lib/communitiesLoader";
import { getSection } from "@/lib/contentLoader";
import Reveal from "@/components/Reveal";

type CommunitiesIntro = { eyebrow: string; heading: string; subtitle: string };

export default async function CommunitiesGrid({ limit }: { limit?: number }) {
  const all = await getCommunities();
  const items = limit ? all.slice(0, limit) : all;
  const c = await getSection<CommunitiesIntro>("home", "communities");
  return (
    <section className="section-y-lg gutter-x bg-cream-soft">
      <div className="max-w-[1500px] mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-28">
          <Reveal as="p" className="eyebrow mb-8">{c.eyebrow}</Reveal>
          <Reveal
            as="h2"
            delay={80}
            className="heading-section text-ink mb-10"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            {c.heading}
          </Reveal>
          <Reveal as="div" delay={160} className="mx-auto mb-10 w-12 h-px bg-navy/40" />
          <Reveal
            as="p"
            delay={240}
            blur
            className="text-base md:text-lg font-light leading-[1.9] text-ink/70 max-w-2xl mx-auto"
          >
            {c.subtitle}
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-stretch">
          {items.map((c, i) => (
            <Reveal
              key={c.slug}
              asChild
              direction={i % 2 === 0 ? "left" : "right"}
              delay={(i % 2) * 120}
            >
              <Link
                href={`/communities/${c.slug}`}
                className="group relative aspect-[4/3.2] block overflow-hidden bg-navy-dark"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.6s] ease-editorial group-hover:scale-[1.05]"
                  style={{ backgroundImage: `url('${c.image}')` }}
                />
                <div className="absolute inset-0 overlay-card" />

                {/* Glass strip at bottom containing all info */}
                <div className="absolute left-5 right-5 bottom-5 md:left-8 md:right-8 md:bottom-8 glass-dark p-5 md:p-9 text-white">
                  <div className="flex items-baseline justify-between mb-3 md:mb-4">
                    <p className="eyebrow-light text-[0.62rem] md:text-[0.72rem]">{c.state}</p>
                    <span className="inline-flex items-center gap-2 text-[0.55rem] md:text-[0.62rem] tracking-[0.30em] md:tracking-[0.32em] uppercase text-white/70 group-hover:text-white transition-colors">
                      Explore
                      <ArrowUpRight
                        size={13}
                        strokeWidth={1.5}
                        className="transition-transform duration-500 ease-editorial group-hover:translate-x-1 group-hover:-translate-y-1"
                      />
                    </span>
                  </div>

                  <h3
                    className="text-2xl md:text-4xl uppercase tracking-wide mb-4 md:mb-6"
                    style={{ fontWeight: 200, letterSpacing: "0.05em" }}
                  >
                    {c.name}
                  </h3>

                  <div className="grid grid-cols-3 gap-2 md:gap-4 pt-4 md:pt-5 border-t border-white/20">
                    <div>
                      <p className="text-[0.52rem] md:text-[0.6rem] tracking-[0.24em] md:tracking-[0.28em] uppercase text-white/55 mb-1 md:mb-1.5">
                        Median
                      </p>
                      <p className="text-sm md:text-base font-light text-white">{c.median}</p>
                    </div>
                    <div>
                      <p className="text-[0.52rem] md:text-[0.6rem] tracking-[0.24em] md:tracking-[0.28em] uppercase text-white/55 mb-1 md:mb-1.5">
                        YoY
                      </p>
                      <p
                        className={`text-sm md:text-base font-light ${
                          c.yoyDirection === "up"
                            ? "text-emerald-300"
                            : c.yoyDirection === "down"
                            ? "text-orange-300"
                            : "text-white/85"
                        }`}
                      >
                        {c.yoy}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.52rem] md:text-[0.6rem] tracking-[0.24em] md:tracking-[0.28em] uppercase text-white/55 mb-1 md:mb-1.5">
                        DOM
                      </p>
                      <p className="text-sm md:text-base font-light text-white">{c.dom}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
