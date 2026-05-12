"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";

/**
 * Hero heading that ALWAYS renders on exactly 2 visual lines, shrinking
 * the font-size so the longest line fits the container width.
 *
 * Why this exists: AI Polish (and human edits) produce hero copy of
 * unpredictable length. With a raw clamp() font-size the long lines
 * wrap mid-phrase to 3+ lines on narrow viewports, breaking the
 * editorial 2-line composition the design relies on. This component
 * keeps each line on a single visual line (`white-space: nowrap`) and
 * auto-scales font-size to fit, with a min/max so it never gets
 * unreadable.
 *
 * Normalization rules so `lines` always becomes exactly 2 entries:
 *   - 0 lines → ["", ""]
 *   - 1 line  → split at the word boundary that yields the most-balanced
 *               two halves (by character count).
 *   - 2 lines → kept as-is.
 *   - 3+ lines → joined into one and re-split balanced.
 *
 * The shrink algorithm is one-shot (no iteration / oscillation):
 *   target = currentFontSize * (containerWidth / widestLineWidth) * 0.99
 *   clamp to [minRem, maxRem]
 *
 * ResizeObserver re-fits when the container changes width. document.fonts.ready
 * triggers a re-fit once webfonts swap in so the initial server-rendered
 * size lands on the right value.
 */

export interface AutoFitHeadingProps {
  /** Lines as authored. Normalized to exactly 2 internally. */
  lines: string[];
  /** Tailwind classes for the <h1>. */
  className?: string;
  /** Extra inline styles for the <h1> (merged after fontSize/lineHeight). */
  style?: React.CSSProperties;
  /** Upper bound in rem. Default 6.5 (matches the original clamp ceiling). */
  maxRem?: number;
  /** Lower bound in rem. Default 1.6. */
  minRem?: number;
  /** Line height. Default 1.04 (matches original hero). */
  lineHeight?: number;
  /**
   * Optional wrapper component that wraps the per-line spans (e.g.
   * `ShimmerText`). Receives `children` only — pass any extra props
   * via `wrapProps`.
   */
  Wrap?: ComponentType<{ children: React.ReactNode }>;
  /**
   * Props forwarded to `Wrap`. Typed loosely so consumers can pass
   * shimmer config etc.
   */
  wrapProps?: Record<string, unknown>;
}

export default function AutoFitHeading({
  lines: rawLines,
  className,
  style,
  maxRem = 6.5,
  minRem = 1.6,
  lineHeight = 1.04,
  Wrap,
  wrapProps,
}: AutoFitHeadingProps) {
  const lines = normalizeToTwoLines(rawLines);
  const containerRef = useRef<HTMLHeadingElement | null>(null);
  const lineRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [fontSizeRem, setFontSizeRem] = useState<number>(maxRem);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;

    function measure() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const c = containerRef.current;
        if (!c) return;
        const containerW = c.clientWidth;
        if (!containerW) return;
        const currentRem =
          parseFloat(getComputedStyle(c).fontSize) /
          parseFloat(getComputedStyle(document.documentElement).fontSize || "16");
        if (!Number.isFinite(currentRem) || currentRem <= 0) return;
        const widestW = lineRefs.current.reduce(
          (acc, span) => Math.max(acc, span?.scrollWidth ?? 0),
          0,
        );
        if (widestW === 0) return;
        const target = (currentRem * containerW) / widestW * 0.99;
        const next = Math.max(minRem, Math.min(maxRem, target));
        setFontSizeRem((prev) =>
          Math.abs(prev - next) > 0.05 ? next : prev,
        );
      });
    }

    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    // Webfonts often load after first paint and shift glyph widths.
    // Re-fit once they're ready.
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // Re-run when text content actually changes
  }, [lines.join("␟"), maxRem, minRem]);

  const lineSpans = (
    <>
      {lines.map((line, i) => (
        <span
          key={i}
          ref={(el) => {
            lineRefs.current[i] = el;
          }}
          style={{ display: "block", whiteSpace: "nowrap" }}
        >
          {line || " "}
        </span>
      ))}
    </>
  );

  return (
    <h1
      ref={containerRef}
      className={className}
      style={{
        fontSize: `${fontSizeRem}rem`,
        lineHeight,
        ...style,
      }}
    >
      {Wrap ? <Wrap {...(wrapProps ?? {})}>{lineSpans}</Wrap> : lineSpans}
    </h1>
  );
}

// ─────────────────────────── normalization ──────────────────────────

export function normalizeToTwoLines(raw: string[]): [string, string] {
  const cleaned = (raw ?? [])
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  if (cleaned.length === 0) return ["", ""];
  if (cleaned.length === 1) return splitBalanced(cleaned[0]);
  if (cleaned.length === 2) return [cleaned[0], cleaned[1]];
  // 3+ entries: collapse + re-split for balance
  return splitBalanced(cleaned.join(" "));
}

function splitBalanced(s: string): [string, string] {
  const trimmed = s.trim();
  if (!trimmed) return ["", ""];
  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    // Single long word — can't split. Put it on line 1, empty on line 2.
    return [trimmed, ""];
  }
  // Find split index that minimizes |len(left) - len(right)|
  let bestIdx = Math.floor(words.length / 2);
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(" ");
    const right = words.slice(i).join(" ");
    const diff = Math.abs(left.length - right.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return [words.slice(0, bestIdx).join(" "), words.slice(bestIdx).join(" ")];
}
