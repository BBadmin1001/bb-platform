import ClosingsGallery from "@/components/ClosingsGallery";
import ShimmerText from "@/components/ShimmerText";
import { getPageContent, resolveImageUrl } from "@/lib/contentLoader";

export const metadata = {
  title: "Recent Closings | Samina Bilal",
  description:
    "Every home Samina personally represented at the closing table. Northern Virginia and Maryland.",
};

export const dynamic = "force-dynamic";

type ClosingsContent = {
  hero: { eyebrow: string; titleLines: string[]; subtitle: string; backgroundImage?: { image_id?: string } };
};

export default async function ClosingsPage() {
  const c = await getPageContent<ClosingsContent>("closings");
  const heroBg = await resolveImageUrl(c.hero.backgroundImage, {
    fallback:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&auto=format&fit=crop&q=85",
    crop: "wide",
    width: 1920,
  });

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
        </div>
      </section>

      <ClosingsGallery />
    </>
  );
}
