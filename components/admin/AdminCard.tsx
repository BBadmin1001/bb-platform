/**
 * AdminCard — animated nav card for admin grid surfaces.
 *
 * Server component on purpose: all animations are CSS-driven via
 * `group/animated-card` + `group-hover/animated-card:*` utilities, so
 * no `useState`/`useEffect`/event handlers are needed. Keeping it as
 * a server component lets parent server pages pass a Lucide icon
 * component directly through the `icon` prop.
 *
 * Per-card themed animation:
 *
 *   The visual zone renders a `<AdminCardVisual variant={...} />`
 *   chosen by the parent — palette swatches for Brand Identity,
 *   stacked photos for Media Library, growing houses for Communities,
 *   ticking checkmarks for Closings, swinging door for Open Houses,
 *   filling stars for Reviews, network nodes for Partners, fanning
 *   avatars for Team, drawing lines for Content. Each visual is its
 *   own component in `AdminCardVisuals.tsx`.
 *
 * Ambient layers retained on every card:
 *   • Radial accent spotlight that intensifies on hover
 *   • Sweep wipe that slides left → right on hover
 *   • Top reveal chip that drops down from above
 *   • Icon scale + lift + soft shadow on hover
 *   • Body underline accent that grows to full width on hover
 *   • "Tap to open" → "Open →" affordance swap
 */

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Lock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { AdminCardVisual, type AdminCardVariant } from "./AdminCardVisuals";

interface AdminCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /**
   * Themed illustration shown in the visual zone — picks an animation
   * that matches the card's domain (palette / stack / houses / etc).
   * Defaults to the generic drift-grid if not specified.
   */
  variant?: AdminCardVariant;
  /** Optional small badge shown in the visual zone — fades out on hover. */
  badge?: string;
  /** Optional accent color hex. Defaults to the theme's --primary. */
  accent?: string;
  className?: string;
  /**
   * If true, the card renders with a "Locked" overlay chip + slight
   * dim. The link still works — clicking it routes to the gated page,
   * which in turn shows the upgrade banner. We intentionally don't
   * disable the click so customers can click through and read the
   * unlock pitch.
   */
  locked?: boolean;
}

export default function AdminCard({
  href,
  icon: Icon,
  title,
  description,
  variant = "grid",
  badge,
  accent,
  className,
  locked = false,
}: AdminCardProps) {
  const accentVar = accent ?? "var(--primary)";

  return (
    <Link
      href={href}
      className={cn(
        "group/animated-card admin-card-elevated relative overflow-hidden rounded-xl flex flex-col transition-shadow duration-500",
        // bg + border come from .admin-card-elevated, so they pick up the
        // dark-mode green-gradient + green-tinted border + hover glow
        // automatically (see admin.css).
        "hover:shadow-lg",
        className,
      )}
      style={{
        color: "var(--card-foreground)",
        ...(locked ? { opacity: 0.78 } : {}),
      }}
      title={
        locked
          ? `${title} — locked. Open to see how to unlock.`
          : undefined
      }
    >
      {locked && (
        <span
          className="absolute right-3 top-3 z-[7] inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] backdrop-blur-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--foreground) 18%, transparent)",
            background: "color-mix(in srgb, var(--card) 70%, transparent)",
            color: "var(--muted-foreground)",
            fontWeight: 600,
          }}
        >
          <Lock size={9} strokeWidth={2} />
          Locked
        </span>
      )}
      {/* ── Visual zone ────────────────────────────────────────── */}
      <div
        className="relative h-[140px] overflow-hidden"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${accentVar} 12%, var(--card)) 0%, var(--card) 100%)`,
        }}
      >
        {/* Ambient layer 1: radial spotlight (intensifies on hover) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] opacity-50 transition-opacity duration-700 ease-[cubic-bezier(0.6,0.6,0,1)] group-hover/animated-card:opacity-100"
          style={{
            background: `radial-gradient(ellipse 60% 70% at 30% 50%, color-mix(in srgb, ${accentVar} 28%, transparent) 0%, color-mix(in srgb, ${accentVar} 12%, transparent) 40%, transparent 70%)`,
          }}
        />

        {/* Ambient layer 2: dot grid — drifts diagonally on hover, fades at
            the edges via a soft radial mask so it never collides hard with
            the themed visual on top. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2] opacity-60 transition-transform duration-700 ease-[cubic-bezier(0.6,0.6,0,1)] group-hover/animated-card:translate-x-1.5 group-hover/animated-card:translate-y-1.5"
          style={{
            backgroundImage: `radial-gradient(color-mix(in srgb, ${accentVar} 32%, transparent) 1px, transparent 1.5px)`,
            backgroundSize: "14px 14px",
            backgroundPosition: "0 0",
            maskImage:
              "radial-gradient(ellipse 75% 75% at 50% 50%, #000 35%, transparent 95%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 75% at 50% 50%, #000 35%, transparent 95%)",
          }}
        />

        {/* Themed visual — palette / lines / stack / houses / etc */}
        <AdminCardVisual variant={variant} accent={accentVar} />

        {/* Ambient: sweep wipe (slides right on hover) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[4] -translate-x-full transition-transform duration-700 ease-[cubic-bezier(0.6,0.6,0,1)] group-hover/animated-card:translate-x-0"
          style={{
            background: `linear-gradient(120deg, transparent 0%, color-mix(in srgb, ${accentVar} 14%, transparent) 50%, transparent 100%)`,
          }}
        />

        {/* Top reveal chip — drops down on hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-[6] flex justify-center pt-3 -translate-y-full opacity-0 transition-all duration-500 ease-[cubic-bezier(0.6,0.6,0,1)] group-hover/animated-card:translate-y-0 group-hover/animated-card:opacity-100"
        >
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] backdrop-blur-sm"
            style={{
              borderColor: `color-mix(in srgb, ${accentVar} 35%, transparent)`,
              background: `color-mix(in srgb, var(--card) 70%, transparent)`,
              color: accentVar,
              fontWeight: 600,
            }}
          >
            <span
              className="h-1 w-1 rounded-full animate-pulse"
              style={{ background: accentVar }}
            />
            Tap to manage
          </span>
        </div>

        {/* Icon — scales + lifts on hover */}
        <div
          aria-hidden
          className="absolute left-5 top-5 z-[5] flex h-12 w-12 items-center justify-center rounded-lg transition-all duration-500 ease-[cubic-bezier(0.6,0.6,0,1)] group-hover/animated-card:scale-110 group-hover/animated-card:-translate-y-0.5 group-hover/animated-card:shadow-md"
          style={{
            background: `color-mix(in srgb, ${accentVar} 16%, var(--card))`,
            color: accentVar,
            border: `1px solid color-mix(in srgb, ${accentVar} 28%, transparent)`,
          }}
        >
          <Icon size={22} strokeWidth={1.6} />
        </div>

        {/* Corner badge — fades out on hover. Suppressed when the card
            is locked so the "Locked" chip can sit in this slot alone. */}
        {badge && !locked && (
          <span
            className="absolute right-3 top-3 z-[5] inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] backdrop-blur-sm transition-opacity duration-300 group-hover/animated-card:opacity-0"
            style={{
              borderColor: "color-mix(in srgb, var(--foreground) 15%, transparent)",
              background: "color-mix(in srgb, var(--card) 60%, transparent)",
              color: "var(--muted-foreground)",
              fontWeight: 600,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: accentVar }}
            />
            {badge}
          </span>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div
        className="relative flex flex-1 flex-col gap-1.5 border-t p-5"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Body underline accent — grows to full width on hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-5 top-0 h-px w-12 -translate-y-px transition-all duration-500 ease-[cubic-bezier(0.6,0.6,0,1)] group-hover/animated-card:w-full group-hover/animated-card:left-0"
          style={{ background: accentVar }}
        />

        <h3
          className="text-base leading-snug transition-colors duration-300"
          style={{ color: "var(--card-foreground)", fontWeight: 600 }}
        >
          {title}
        </h3>
        <p
          className="text-xs leading-relaxed flex-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          {description}
        </p>

        {/* Open affordance: slides on hover */}
        <div className="relative mt-3 h-5 overflow-hidden">
          <span
            className="absolute inset-y-0 left-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.28em] opacity-100 transition-all duration-500 ease-[cubic-bezier(0.6,0.6,0,1)] group-hover/animated-card:-translate-x-3 group-hover/animated-card:opacity-0"
            style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
          >
            Tap to open
          </span>
          <span
            className="absolute inset-y-0 right-0 inline-flex translate-x-3 items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] opacity-0 transition-all duration-500 ease-[cubic-bezier(0.6,0.6,0,1)] group-hover/animated-card:translate-x-0 group-hover/animated-card:opacity-100"
            style={{ color: accentVar, fontWeight: 600 }}
          >
            Open
            <ArrowRight
              size={12}
              className="transition-transform duration-500 group-hover/animated-card:translate-x-0.5"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
