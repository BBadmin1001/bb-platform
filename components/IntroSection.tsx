import Link from "next/link";
import Reveal from "@/components/Reveal";
import { getSection, getPortrait } from "@/lib/contentLoader";

type MeetContent = {
  eyebrow: string;
  heading: string;
  body: string[];
  quote: string;
  cta: { label: string; href: string };
};

export default async function IntroSection() {
  const [c, portrait] = await Promise.all([
    getSection<MeetContent>("home", "meet"),
    getPortrait(),
  ]);

  return (
    <section
      id="intro"
      className="relative section-y-lg gutter-x overflow-hidden"
    >
      <div className="relative max-w-[1500px] mx-auto grid md:grid-cols-12 gap-10 md:gap-20 lg:gap-28 items-center">
        {/* Portrait */}
        <Reveal direction="left" className="md:col-span-5">
          <div className="relative aspect-[3/4] overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center grayscale"
              style={{ backgroundImage: `url('${portrait.full}')` }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,0.25) 100%)",
              }}
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-ink/10" />
          </div>
        </Reveal>

        {/* Text */}
        <div className="md:col-span-7">
          <Reveal as="p" className="eyebrow mb-8">{c.eyebrow}</Reveal>
          <Reveal
            as="h2"
            delay={80}
            className="heading-section text-ink mb-10"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.5rem)" }}
          >
            {c.heading}
          </Reveal>
          <Reveal as="div" delay={160} className="mb-10 w-12 h-px bg-navy/40" />

          {c.body.map((para, i) => (
            <Reveal
              key={i}
              as="p"
              delay={240 + i * 80}
              blur
              className="text-base md:text-lg font-light leading-[1.95] text-ink/80 mb-8"
            >
              {para}
            </Reveal>
          ))}

          <Reveal
            as="p"
            delay={400}
            blur
            className="text-base md:text-lg font-light leading-[1.95] text-ink/75 italic mb-12"
          >
            "{c.quote}"
          </Reveal>

          <Reveal delay={480}>
            <Link href={c.cta.href} className="btn-outline-dark">
              {c.cta.label}
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
