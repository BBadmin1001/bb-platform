"use client";

import { useEffect, useRef, useState } from "react";

interface CounterProps {
  /** Target number (the digits to animate to). */
  to: number;
  /** Decimal places to show. Defaults to inferred from `to`. */
  decimals?: number;
  /** Optional prefix before the number (e.g. "$"). */
  prefix?: string;
  /** Optional suffix after the number (e.g. "B", "+", "★"). */
  suffix?: string;
  /** Animation duration in seconds. */
  duration?: number;
  /** Custom className for the wrapping span. */
  className?: string;
}

/**
 * Counts from 0 (or just under target) up to `to` when scrolled into view.
 * Triggers once per page load. Suffix and prefix stay visible the whole time.
 * Uses ease-out so the number settles into place rather than ticking linearly.
 */
export function Counter({
  to,
  decimals,
  prefix = "",
  suffix = "",
  duration = 2.2,
  className,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  // Auto-detect decimal precision from the target if not provided.
  const inferredDecimals =
    decimals ?? (Number.isInteger(to) ? 0 : (to.toString().split(".")[1]?.length ?? 1));

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          observer.disconnect();
          startCount();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => observer.disconnect();

    function startCount() {
      const start = performance.now();
      const ms = duration * 1000;

      function easeOut(t: number) {
        return 1 - Math.pow(1 - t, 3);
      }

      function tick(now: number) {
        const elapsed = now - start;
        const t = Math.min(elapsed / ms, 1);
        const eased = easeOut(t);
        setValue(to * eased);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          setValue(to);
        }
      }

      requestAnimationFrame(tick);
    }
  }, [to, duration]);

  const formatted = value.toFixed(inferredDecimals);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default Counter;
