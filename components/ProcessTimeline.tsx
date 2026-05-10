"use client";

import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";

export interface TimelineStep {
  n: string;
  h: string;
  p: string;
  icon?: ReactNode;
}

interface ProcessTimelineProps {
  steps: TimelineStep[];
}

/**
 * Editorial vertical timeline for multi-step processes (Buyer + Seller).
 *
 * Desktop: A center spine connects every step. Each step's content card
 * sits alternately on the left or right of the spine, with a numbered
 * marker dot on the spine at each step's vertical midpoint. A hairline
 * arm reaches from the dot to the card's edge.
 *
 * Mobile: spine collapses to the left edge, all cards stack to the right
 * in a single column.
 */
export default function ProcessTimeline({ steps }: ProcessTimelineProps) {
  return (
    <div className="relative max-w-5xl mx-auto">
      {/* Center spine — navy hairline */}
      <div
        className="absolute top-0 bottom-0 w-px bg-navy/15 left-6 md:left-1/2 md:-translate-x-px"
        aria-hidden="true"
      />

      <div className="space-y-14 md:space-y-28">
        {steps.map((step, i) => {
          const isLeft = i % 2 === 0;
          return (
            <div
              key={step.n}
              className="relative grid md:grid-cols-2 md:gap-16 items-center"
            >
              {/* Numbered marker on spine */}
              <div
                className="absolute z-10 top-0 left-6 md:left-1/2 -translate-x-1/2 -translate-y-2"
                aria-hidden="true"
              >
                <div className="w-12 h-12 rounded-full bg-cream border border-navy/25 flex items-center justify-center shadow-[0_8px_24px_-8px_rgba(20,40,64,0.25)]">
                  <span
                    className="text-base text-navy"
                    style={{ fontWeight: 400, letterSpacing: "0.05em" }}
                  >
                    {step.n}
                  </span>
                </div>
              </div>

              {/* DESKTOP: alternating side */}
              {/* LEFT card layout */}
              {isLeft ? (
                <>
                  <Reveal direction="left" className="hidden md:block">
                    <TimelineCard step={step} align="left" />
                  </Reveal>
                  <div className="hidden md:block" />
                </>
              ) : (
                <>
                  <div className="hidden md:block" />
                  <Reveal direction="right" className="hidden md:block">
                    <TimelineCard step={step} align="right" />
                  </Reveal>
                </>
              )}

              {/* MOBILE: single column, all cards on right of spine */}
              <Reveal className="md:hidden col-span-2 pl-16">
                <TimelineCard step={step} align="right" />
              </Reveal>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineCard({
  step,
  align,
}: {
  step: TimelineStep;
  align: "left" | "right";
}) {
  return (
    <div
      className={`relative glass-light glow-on-hover p-6 md:p-10 ${
        align === "left" ? "md:mr-12" : "md:ml-12"
      }`}
    >
      {/* Hairline arm reaching from card edge toward spine */}
      <div
        aria-hidden="true"
        className={`hidden md:block absolute top-1/2 h-px w-12 bg-navy/25 ${
          align === "left" ? "right-[-3rem]" : "left-[-3rem]"
        }`}
      />

      {step.icon && <div className="text-navy mb-5">{step.icon}</div>}

      <h3
        className="text-lg md:text-xl uppercase mb-4 text-ink"
        style={{ fontWeight: 400, letterSpacing: "0.10em" }}
      >
        {step.h}
      </h3>

      <div className="mb-5 w-10 h-px bg-navy/40" />

      <p className="text-sm md:text-base font-light leading-[1.85] text-ink/75">
        {step.p}
      </p>
    </div>
  );
}
