import ShimmerText from "@/components/ShimmerText";

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  image,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image?: string;
}) {
  return (
    <section className="relative pt-48 pb-32 md:pt-56 md:pb-40 gutter-x overflow-hidden bg-cream">
      {image && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url('${image}')` }}
          />
          <div className="absolute inset-0 bg-cream/55" />
        </>
      )}
      <div className="relative max-w-4xl mx-auto text-center">
        {eyebrow && <p className="eyebrow mb-10">{eyebrow}</p>}
        <h1
          className="heading-display text-ink"
          style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: 1.05 }}
        >
          <ShimmerText tone="light">{title}</ShimmerText>
        </h1>
        {subtitle && (
          <>
            <div className="mx-auto mt-12 mb-12 w-12 h-px bg-navy/40" />
            <p className="max-w-2xl mx-auto text-base md:text-lg font-light text-ink/80 leading-[1.95]">
              {subtitle}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
