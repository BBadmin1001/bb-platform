import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import { getSection, resolveImageUrl } from "@/lib/contentLoader";

type ServicesCard = {
  title: string;
  body: string;
  cta: string;
  href: string;
  imageKey?: string;
  image?: { image_id?: string };
};
type ServicesContent = {
  eyebrow: string;
  heading: string;
  cards: ServicesCard[];
};

const imageMap: Record<string, string> = {
  buy: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1400&auto=format&fit=crop&q=85",
  sell: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1400&auto=format&fit=crop&q=85",
  path: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1400&auto=format&fit=crop&q=85",
};

export default async function PillarCards() {
  const c = await getSection<ServicesContent>("home", "services");

  const cardImages = await Promise.all(
    c.cards.map((p) =>
      resolveImageUrl(p.image, {
        fallback: imageMap[p.imageKey || "buy"] ?? imageMap.buy,
        crop: "portrait",
        width: 1400,
      }),
    ),
  );

  return (
    <section className="section-y gutter-x">
      <div className="max-w-[1500px] mx-auto">
        <div className="text-center mb-12 md:mb-24">
          <Reveal as="p" className="eyebrow mb-6 md:mb-8">{c.eyebrow}</Reveal>
          <Reveal
            as="h2"
            delay={80}
            className="heading-section text-ink"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            {c.heading}
          </Reveal>
          <Reveal as="div" delay={160} className="mx-auto mt-8 md:mt-10 w-12 h-px bg-navy/40" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 items-stretch">
          {c.cards.map((p, i) => (
            <Reveal
              key={p.title}
              asChild
              direction={i === 0 ? "left" : i === 2 ? "right" : "up"}
              delay={i * 120}
            >
              <Link
                href={p.href}
                className="group relative block aspect-[3/4.2] overflow-hidden bg-navy-dark"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.4s] ease-editorial group-hover:scale-[1.05]"
                  style={{ backgroundImage: `url('${cardImages[i]}')` }}
                />
                <div className="absolute inset-0 overlay-card" />

                <div className="absolute left-5 right-5 bottom-5 md:left-8 md:right-8 md:bottom-8 glass-dark p-6 md:p-9 text-white">
                  <h3
                    className="text-lg md:text-2xl uppercase mb-4 md:mb-5"
                    style={{ fontWeight: 400, letterSpacing: "0.08em" }}
                  >
                    {p.title}
                  </h3>
                  <p className="text-sm md:text-[0.95rem] font-light leading-[1.8] md:leading-[1.85] text-white/85 mb-5 md:mb-7">
                    {p.body}
                  </p>
                  <span className="inline-flex items-center gap-3 text-[0.62rem] md:text-[0.68rem] tracking-[0.30em] md:tracking-[0.32em] uppercase font-light text-white border-t border-white/25 pt-4 md:pt-5">
                    {p.cta}
                    <ArrowUpRight
                      size={15}
                      strokeWidth={1.5}
                      className="transition-transform duration-500 ease-editorial group-hover:translate-x-1.5 group-hover:-translate-y-1.5"
                    />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
