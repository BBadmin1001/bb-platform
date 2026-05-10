"use client";

import { useState } from "react";
import Link from "next/link";
import type { Closing } from "@/lib/closings";
import Reveal from "@/components/Reveal";

const PAGE = 6;

type ClosingsTeaser = {
  eyebrow: string;
  heading: string;
  subtitle: string;
};

export default function ClosingsGalleryClient({
  items,
  content,
  preview = false,
}: {
  items: Closing[];
  content: ClosingsTeaser;
  preview?: boolean;
}) {
  const [shown, setShown] = useState(PAGE);
  const list = preview ? items.slice(0, PAGE) : items.slice(0, shown);
  const canLoadMore = !preview && shown < items.length;

  return (
    <section className="section-y-lg gutter-x bg-cream">
      <div className="max-w-[1500px] mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-28">
          <Reveal as="p" className="eyebrow mb-8">
            {content.eyebrow}
          </Reveal>
          <Reveal
            as="h2"
            delay={80}
            className="heading-section text-ink mb-10"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            {content.heading}
          </Reveal>
          <Reveal
            as="div"
            delay={160}
            className="mx-auto mb-10 w-12 h-px bg-navy/40"
          />
          <Reveal
            as="p"
            delay={240}
            blur
            className="text-base md:text-lg font-light leading-[1.9] text-ink/70 max-w-2xl mx-auto"
          >
            {preview
              ? content.subtitle
              : "Every home below is one I personally represented at the closing table."}
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 items-stretch">
          {list.map((c, i) => (
            <Reveal
              key={c.id}
              asChild
              direction={i % 3 === 0 ? "left" : i % 3 === 2 ? "right" : "up"}
              delay={(i % 3) * 80}
            >
              <div className="group relative aspect-[4/3] overflow-hidden bg-navy-dark">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.6s] ease-editorial group-hover:scale-[1.05]"
                  style={{ backgroundImage: `url('${c.image}')` }}
                />
                <div className="absolute inset-0 overlay-card" />

                <span className="absolute top-5 right-5 glass-pill px-4 py-1.5 text-white text-[0.6rem] tracking-[0.32em] uppercase">
                  Sold
                </span>

                <div className="absolute left-5 right-5 bottom-5 md:left-6 md:right-6 md:bottom-6 glass-dark px-6 py-5 text-white">
                  <p className="text-[0.6rem] tracking-[0.32em] uppercase opacity-70 mb-2">
                    {c.neighborhood}
                  </p>
                  <p className="text-base md:text-lg font-light tracking-wide">
                    {c.city}, {c.state}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 md:mt-24 flex justify-center">
          {preview ? (
            <Link href="/closings" className="btn-outline-dark">
              See All Closings
            </Link>
          ) : canLoadMore ? (
            <button
              onClick={() =>
                setShown((n) => Math.min(n + PAGE, items.length))
              }
              className="btn-outline-dark"
            >
              Load More
            </button>
          ) : (
            !preview && (
              <div className="text-center max-w-md">
                <p className="text-ink-muted font-light italic mb-8 text-lg">
                  You&rsquo;ve seen them all. Want to be next?
                </p>
                <Link href="/contact" className="btn-solid">
                  Schedule a Consult
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
