import Link from "next/link";
import Reveal from "@/components/Reveal";
import { getSection, resolveImageUrl } from "@/lib/contentLoader";

type PathTeaserContent = {
  eyebrow: string;
  heading: string;
  body: string;
  cta: { label: string; href: string };
  backgroundImage?: { image_id?: string };
};

export default async function PathTeaser() {
  const c = await getSection<PathTeaserContent>("home", "pathTeaser");
  const bgUrl = await resolveImageUrl(c.backgroundImage, {
    fallback:
      "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&auto=format&fit=crop&q=85",
    crop: "wide",
    width: 1920,
  });

  return (
    <section className="relative section-y-lg gutter-x overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('${bgUrl}')`,
        }}
      />
      <div className="absolute inset-0 overlay-left-fade" />

      <div className="relative max-w-[1500px] mx-auto">
        <Reveal direction="left" className="max-w-2xl">
          <div className="glass-dark p-7 md:p-14 lg:p-16">
            <p className="eyebrow-light mb-6 md:mb-8">{c.eyebrow}</p>
            <h2
              className="heading-section text-white mb-8 md:mb-10"
              style={{ fontSize: "clamp(1.4rem, 3vw, 2.25rem)" }}
            >
              {c.heading}
            </h2>

            <div className="mb-8 md:mb-10 w-12 h-px bg-white/40" />

            <p className="text-sm md:text-lg font-light leading-[1.85] md:leading-[1.95] text-white/85 mb-8 md:mb-12">
              {c.body}
            </p>
            <Link href={c.cta.href} className="btn-glass">
              {c.cta.label}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
