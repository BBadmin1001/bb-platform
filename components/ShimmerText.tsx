"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ShimmerTextProps {
  children: ReactNode;
  className?: string;
  /**
   * "dark" — for white text on dark backgrounds (default; used by most page heroes).
   * "light" — for dark text on cream backgrounds (PageHero/404).
   */
  tone?: "dark" | "light";
  /** Seconds the sweep takes to cross. */
  duration?: number;
  /** Seconds before the sweep begins after mount. */
  delay?: number;
  /** Override the sweep color directly (any CSS color). Falls back to tone-based default. */
  shimmerColor?: string;
}

/**
 * One-shot shimmer sweep across editorial headings.
 * Pure CSS animation — runs once, then settles in solid color.
 * Designed for use on hero H1 elements only.
 */
export function ShimmerText({
  children,
  className,
  tone = "dark",
  duration = 2.6,
  delay = 0.5,
  shimmerColor,
}: ShimmerTextProps) {
  const contrast =
    shimmerColor ?? (tone === "light" ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.85)");

  const style: CSSProperties = {
    WebkitTextFillColor: "transparent",
    backgroundColor: "currentColor",
    backgroundImage: `linear-gradient(to right, currentColor 0%, ${contrast} 45%, ${contrast} 55%, currentColor 100%)`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    backgroundRepeat: "no-repeat",
    backgroundSize: "60% 200%",
    backgroundPosition: "-110% center",
    animation: `shimmer-sweep ${duration + 4}s ease-in-out ${delay}s infinite`,
  };

  return (
    <span className={cn("inline-block align-baseline shimmer-text", className)} style={style}>
      {children}
    </span>
  );
}

export default ShimmerText;
