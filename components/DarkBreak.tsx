"use client";

import Reveal from "@/components/Reveal";

interface DarkBreakProps {
  /** Background photo URL */
  bgImage: string;
  /** Optional eyebrow above the quote */
  eyebrow?: string;
  /** Centered quote / single-sentence moment */
  quote?: string;
  /** Optional attribution under the quote */
  attribution?: string;
  /** Section height. */
  height?: "sm" | "md" | "lg";
}

const heightMap = {
  sm: "min-h-[35vh] md:min-h-[45vh] py-16 md:py-32",
  md: "min-h-[50vh] md:min-h-[60vh] py-20 md:py-40",
  lg: "min-h-[70vh] md:min-h-[85vh] py-28 md:py-56",
};

/**
 * A short, full-bleed dark photo section used to break up runs of light
 * cream sections and re-establish editorial rhythm. Optional centered quote.
 *
 * Layout flow: dark hero → light → DARK BREAK → light → ...
 */
export default function DarkBreak({
  bgImage,
  eyebrow,
  quote,
  attribution,
  height = "md",
}: DarkBreakProps) {
  return (
    <section
      className={`relative w-full overflow-hidden bg-navy-dark gutter-x flex items-center ${heightMap[height]}`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgImage}')` }}
      />
      <div className="absolute inset-0 overlay-hero" />

      {(eyebrow || quote || attribution) && (
        <div className="relative max-w-4xl mx-auto text-center text-white">
          {eyebrow && (
            <Reveal as="p" className="eyebrow-light mb-7 md:mb-10">
              {eyebrow}
            </Reveal>
          )}
          {quote && (
            <Reveal
              as="blockquote"
              delay={120}
              blur
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-[1.4] md:leading-[1.45] italic px-2"
              style={{ fontWeight: 200, letterSpacing: "0.005em" }}
            >
              &ldquo;{quote}&rdquo;
            </Reveal>
          )}
          {attribution && (
            <>
              <Reveal as="div" delay={200} className="mx-auto mt-8 md:mt-12 mb-6 md:mb-8 w-10 h-px bg-white/40" />
              <Reveal
                as="p"
                delay={280}
                className="text-[0.6rem] md:text-[0.65rem] tracking-[0.32em] uppercase text-white/70"
              >
                {attribution}
              </Reveal>
            </>
          )}
        </div>
      )}
    </section>
  );
}
