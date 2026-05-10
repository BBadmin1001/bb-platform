"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type ElementType,
  type ReactNode,
  type CSSProperties,
  type ReactElement,
} from "react";
import { useReveal } from "@/lib/useReveal";
import { cn } from "@/lib/cn";

type Direction = "up" | "left" | "right";

interface RevealProps {
  children?: ReactNode;
  /** Slide direction. */
  direction?: Direction;
  /** Add a blur-in effect alongside the fade. */
  blur?: boolean;
  /** Delay step in milliseconds (used for staggered siblings). */
  delay?: number;
  /** Render as a wrapper of this element type. Overridden by `asChild`. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** Threshold for IntersectionObserver. */
  threshold?: number;
  /**
   * If true, instead of wrapping `children`, merge the reveal classes/ref
   * directly onto the single child element. Use this when the child has
   * absolute-positioned descendants (e.g. a card with a glass overlay
   * pinned to the bottom) — wrapping such children in a div with a
   * transform would break their absolute positioning.
   */
  asChild?: boolean;
}

export function Reveal({
  children,
  direction = "up",
  blur = false,
  delay = 0,
  as,
  className,
  style,
  threshold,
  asChild = false,
}: RevealProps) {
  const { ref, revealed } = useReveal<HTMLElement>({ threshold });

  const dirClass =
    direction === "left"
      ? "reveal-left"
      : direction === "right"
      ? "reveal-right"
      : "reveal-up";

  const revealClass = cn(
    "reveal",
    dirClass,
    blur && "reveal-blur",
    revealed && "is-revealed",
  );

  const delayStyle: CSSProperties =
    delay > 0 ? { transitionDelay: `${delay}ms` } : {};

  // asChild — merge classes/ref/style onto the first element child instead
  // of wrapping. Required for cards that contain absolute-positioned glass
  // panels (a wrapper with a transform would break their positioning).
  // Uses toArray + filter rather than Children.only because Turbopack/React 19
  // can leave whitespace text nodes in the children array.
  if (asChild) {
    const elementChild = Children.toArray(children).find(isValidElement) as
      | ReactElement<{
          ref?: unknown;
          className?: string;
          style?: CSSProperties;
        }>
      | undefined;
    if (!elementChild) return <>{children}</>;
    return cloneElement(elementChild, {
      ref,
      className: cn(revealClass, elementChild.props.className, className),
      style: { ...delayStyle, ...elementChild.props.style, ...style },
    });
  }

  // Default — wrap children in our own element.
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      ref={ref}
      className={cn(revealClass, className)}
      style={{ ...delayStyle, ...style }}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
