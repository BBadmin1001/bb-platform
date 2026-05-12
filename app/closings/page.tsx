import ClosingsGallery from "@/components/ClosingsGallery";
import ShimmerText from "@/components/ShimmerText";
import AutoFitHeading from "@/components/AutoFitHeading";
import { getPageContent, resolveImageUrl } from "@/lib/contentLoader";
import { getCurrentTenant } from "@/lib/tenant/context";

export async function generateMetadata() {
  const tenant = await getCurrentTenant();
  const name = tenant?.realtor_name?.trim();
  return {
    title: name ? `Recent Closings | ${name}` : "Recent Closings",
    description: name
      ? `Every home ${name} personally represented at the closing table.`
      : "Recent closings.",
  };
}

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
          <AutoFitHeading
            lines={c.hero.titleLines}
            className="heading-display text-white"
            maxRem={5.5}
            minRem={2.25}
            lineHeight={1.04}
            Wrap={ShimmerText}
          />
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
