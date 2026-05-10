"use client";

import { Children, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StackedCardsProps {
  children: ReactNode;
  className?: string;
}

/**
 * Sticky-pin stacked cards. Each child becomes a full-viewport panel that
 * stays pinned while the next one scrolls in to cover it. The previous card
 * dims + scales down via the `.stacked-pushed` class, sold by perspective.
 *
 * Used for sequential "process" sections — Path-to-Ownership steps,
 * Buyers buying-process steps, etc.
 */
export function StackedCards({ children, className }: StackedCardsProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cards = Children.toArray(children);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const cardEls = Array.from(
      stage.querySelectorAll<HTMLDivElement>(".stacked-card"),
    );

    function update() {
      const viewportH = window.innerHeight;
      cardEls.forEach((card, i) => {
        const next = cardEls[i + 1];
        if (!next) {
          card.classList.remove("stacked-pushed");
          return;
        }
        const rect = next.getBoundingClientRect();
        // Once the next card has scrolled to within ~25% of the viewport top,
        // mark the current card as "pushed" so it dims/scales back.
        // Trigger earlier — when the NEXT card has scrolled to the upper
        // half of the viewport, the previous card fully fades out so the
        // two never share screen real estate in a muddy overlap.
        if (rect.top < viewportH * 0.55) {
          card.classList.add("stacked-pushed");
        } else {
          card.classList.remove("stacked-pushed");
        }
      });
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [cards.length]);

  return (
    <div
      ref={stageRef}
      className={cn("stacked-stage", className)}
      style={{ perspective: "1400px" }}
    >
      {cards.map((child, i) => (
        <div key={i} className="stacked-card" style={{ zIndex: i + 1 }}>
          {child}
        </div>
      ))}
    </div>
  );
}

export default StackedCards;
