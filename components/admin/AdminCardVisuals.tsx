/**
 * AdminCardVisuals — per-section themed illustrations rendered inside an
 * `AdminCard`'s visual zone. Each one animates on hover via the parent's
 * `group/animated-card` class.
 *
 * Naming convention:
 *   variant="palette"  → 3 color swatches that fan/rotate (Brand Identity)
 *   variant="lines"    → text-line strokes that draw in (Content)
 *   variant="stack"    → photo-rectangle stack that fans out (Media Library)
 *   variant="houses"   → 3 house silhouettes that grow tall (Communities)
 *   variant="checks"   → SOLD-tag stack with checkmarks ticking (Closings)
 *   variant="stars"    → 5 stars fill in sequentially (Reviews)
 *   variant="nodes"    → connected dots, lines draw in (Partners)
 *   variant="team"     → avatar circles arrange into a row (Team)
 *   variant="plug"     → connector plugs into a socket with a spark (Integrations)
 *   variant="chart"    → bar chart grows from baseline (Analytics)
 *   variant="search"   → magnifying glass scans across content lines (SEO)
 *   variant="tower"    → multi-story office tower with sequential window light-up (Broker)
 *   variant="browser"  → browser-tab frame with a circular favicon icon (Favicon)
 *   variant="share"    → social-share preview card slides in (Featured Image)
 *   variant="grid"     → the original drifting grid pattern (fallback)
 *
 * All variants accept a single `accent` color (CSS color or var()) and
 * use it to drive every animated stroke / fill. Pure CSS animation, no
 * JS — works as a server component.
 */

import * as React from "react";

export type AdminCardVariant =
  | "palette"
  | "lines"
  | "stack"
  | "houses"
  | "checks"
  | "stars"
  | "nodes"
  | "team"
  | "plug"
  | "chart"
  | "search"
  | "tower"
  | "browser"
  | "share"
  | "grid";

interface VisualProps {
  /** CSS color or var() — drives every animated element. */
  accent: string;
}

/* shared timing — matches AdminCard sweep / grid layers */
const easing = "cubic-bezier(0.6,0.6,0,1)";

// ─────────────────────────── palette ───────────────────────────
function PaletteVisual({ accent }: VisualProps) {
  const swatch = (delay: number, hueShift: string, hover: string) => ({
    transitionDelay: `${delay}ms`,
    background: hueShift,
  });
  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2.5 z-[3]">
      <div
        className={`h-12 w-12 rounded-lg shadow-md transition-transform duration-500 ease-[${easing}] group-hover/animated-card:-rotate-[14deg] group-hover/animated-card:-translate-x-1 group-hover/animated-card:-translate-y-1`}
        style={swatch(0, accent, "")}
      />
      <div
        className={`h-12 w-12 rounded-lg shadow-md transition-transform duration-500 ease-[${easing}] group-hover/animated-card:scale-110`}
        style={{
          transitionDelay: "60ms",
          background: `color-mix(in srgb, ${accent} 55%, white)`,
        }}
      />
      <div
        className={`h-12 w-12 rounded-lg shadow-md transition-transform duration-500 ease-[${easing}] group-hover/animated-card:rotate-[14deg] group-hover/animated-card:translate-x-1 group-hover/animated-card:translate-y-1`}
        style={{
          transitionDelay: "120ms",
          background: `color-mix(in srgb, ${accent} 70%, black)`,
        }}
      />
    </div>
  );
}

// ─────────────────────────── lines (text) ───────────────────────
function LinesVisual({ accent }: VisualProps) {
  // Five horizontal lines of varying widths — extend on hover (typing effect)
  const lines = [
    { width: 70, hover: 92, top: 22 },
    { width: 50, hover: 78, top: 40 },
    { width: 85, hover: 60, top: 58 },
    { width: 35, hover: 88, top: 76 },
    { width: 65, hover: 50, top: 94 },
  ];
  return (
    <div className="absolute inset-y-0 right-6 left-24 flex flex-col justify-center gap-2 z-[3]">
      {lines.map((l, i) => (
        <div key={i} className="relative h-1.5">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-[${easing}]`}
            style={{
              width: `${l.width}%`,
              background: `color-mix(in srgb, ${accent} 60%, transparent)`,
              transitionDelay: `${i * 60}ms`,
            }}
          />
          <div
            className={`absolute left-0 top-0 h-full rounded-full opacity-0 group-hover/animated-card:opacity-100 transition-all duration-500 ease-[${easing}]`}
            style={{
              width: `${l.hover}%`,
              background: accent,
              transitionDelay: `${i * 60}ms`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────── stack (photos) ────────────────────
function StackVisual({ accent }: VisualProps) {
  return (
    <div className="absolute right-8 top-1/2 -translate-y-1/2 z-[3]">
      <div className="relative h-20 w-28">
        {/* Bottom card */}
        <div
          className={`absolute inset-0 rounded-md border shadow-sm transition-transform duration-500 ease-[${easing}] group-hover/animated-card:-translate-x-3 group-hover/animated-card:-rotate-[10deg]`}
          style={{
            background: `color-mix(in srgb, ${accent} 25%, var(--card))`,
            borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
          }}
        />
        {/* Middle card */}
        <div
          className={`absolute inset-0 rounded-md border shadow-md transition-transform duration-500 ease-[${easing}] group-hover/animated-card:translate-y-1`}
          style={{
            background: `color-mix(in srgb, ${accent} 45%, var(--card))`,
            borderColor: `color-mix(in srgb, ${accent} 50%, transparent)`,
            transitionDelay: "60ms",
          }}
        />
        {/* Top card with "image" line */}
        <div
          className={`absolute inset-0 rounded-md border shadow-lg flex items-end justify-start p-2 transition-transform duration-500 ease-[${easing}] group-hover/animated-card:translate-x-3 group-hover/animated-card:rotate-[10deg]`}
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 65%, white) 0%, ${accent} 100%)`,
            borderColor: accent,
            transitionDelay: "120ms",
          }}
        >
          <div className="flex gap-1">
            <div className="h-1 w-3 rounded-full bg-white/60" />
            <div className="h-1 w-5 rounded-full bg-white/40" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── houses ────────────────────────────
function HousesVisual({ accent }: VisualProps) {
  // 3 simple house silhouettes side-by-side — heights grow on hover
  const houses = [
    { x: 0, baseH: 36, hoverH: 52 },
    { x: 32, baseH: 48, hoverH: 60 },
    { x: 64, baseH: 30, hoverH: 46 },
  ];
  return (
    <div className="absolute right-8 bottom-2 z-[3] h-[80px] w-[110px]">
      <svg
        viewBox="0 0 110 80"
        className="h-full w-full overflow-visible"
        fill="none"
      >
        {houses.map((h, i) => (
          <g
            key={i}
            className={`transition-transform duration-500 ease-[${easing}] origin-bottom group-hover/animated-card:translate-y-[-2px]`}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            {/* Body */}
            <rect
              x={h.x}
              y={80 - h.baseH}
              width="26"
              height={h.baseH}
              rx="2"
              fill={`color-mix(in srgb, ${accent} ${50 + i * 10}%, white)`}
              className={`transition-all duration-500 ease-[${easing}] group-hover/animated-card:[height:${h.hoverH}px] group-hover/animated-card:[y:${80 - h.hoverH}px]`}
              style={{ transitionDelay: `${i * 80}ms` }}
            />
            {/* Roof */}
            <polygon
              points={`${h.x - 2},${80 - h.baseH} ${h.x + 13},${80 - h.baseH - 12} ${h.x + 28},${80 - h.baseH}`}
              fill={accent}
              className={`transition-transform duration-500 ease-[${easing}] origin-bottom group-hover/animated-card:translate-y-[-${h.hoverH - h.baseH}px]`}
              style={{ transitionDelay: `${i * 80}ms` }}
            />
            {/* Window dot */}
            <rect
              x={h.x + 10}
              y={80 - h.baseH + 8}
              width="6"
              height="6"
              fill="white"
              fillOpacity="0.7"
              rx="1"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─────────────────────────── checks (closings) ─────────────────
function ChecksVisual({ accent }: VisualProps) {
  const tags = [
    { width: 80, top: 12 },
    { width: 70, top: 36 },
    { width: 88, top: 60 },
  ];
  return (
    <div className="absolute right-6 top-4 bottom-4 left-24 z-[3]">
      {tags.map((t, i) => (
        <div
          key={i}
          className={`absolute inline-flex items-center gap-2 rounded-md border px-2 py-1 transition-transform duration-500 ease-[${easing}] group-hover/animated-card:translate-x-1`}
          style={{
            top: `${t.top}%`,
            width: `${t.width}%`,
            background: `color-mix(in srgb, ${accent} 8%, var(--card))`,
            borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
            transitionDelay: `${i * 80}ms`,
          }}
        >
          <span
            className="flex h-3 w-3 items-center justify-center rounded-full"
            style={{ background: accent }}
          >
            <svg
              width="7"
              height="7"
              viewBox="0 0 7 7"
              fill="none"
              className={`opacity-0 group-hover/animated-card:opacity-100 transition-opacity duration-500 ease-[${easing}]`}
              style={{ transitionDelay: `${200 + i * 100}ms` }}
            >
              <path
                d="M1 3.5 L3 5.5 L6 1.5"
                stroke="white"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div
            className="flex-1 h-1 rounded-full"
            style={{ background: `color-mix(in srgb, ${accent} 35%, transparent)` }}
          />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────── stars (reviews) ───────────────────
function StarsVisual({ accent }: VisualProps) {
  // 5 stars; default state = subdued outline; hover = filled in sequence
  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[3] flex items-center gap-1.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          className={`transition-transform duration-500 ease-[${easing}] group-hover/animated-card:scale-110`}
          style={{ transitionDelay: `${i * 80}ms` }}
        >
          <path
            d="M11 2 L13.5 8.2 L20.2 8.7 L15 13 L16.7 19.5 L11 16 L5.3 19.5 L7 13 L1.8 8.7 L8.5 8.2 Z"
            fill="none"
            stroke={accent}
            strokeOpacity="0.5"
            strokeWidth="1"
          />
          <path
            d="M11 2 L13.5 8.2 L20.2 8.7 L15 13 L16.7 19.5 L11 16 L5.3 19.5 L7 13 L1.8 8.7 L8.5 8.2 Z"
            fill={accent}
            className={`opacity-0 group-hover/animated-card:opacity-100 transition-opacity duration-500 ease-[${easing}]`}
            style={{ transitionDelay: `${i * 100}ms` }}
          />
        </svg>
      ))}
    </div>
  );
}

// ─────────────────────────── nodes (partners) ──────────────────
function NodesVisual({ accent }: VisualProps) {
  // 3 dots arranged in a triangle, lines drawing between on hover
  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[3] h-[88px] w-[110px]">
      <svg viewBox="0 0 110 88" className="h-full w-full">
        {/* Connecting lines — stroke-dasharray animates on hover */}
        <line
          x1="20"
          y1="14"
          x2="90"
          y2="14"
          stroke={accent}
          strokeWidth="1.5"
          strokeDasharray="80"
          strokeDashoffset="80"
          className={`transition-[stroke-dashoffset] duration-500 ease-[${easing}] group-hover/animated-card:[stroke-dashoffset:0]`}
          style={{ transitionDelay: "120ms" }}
        />
        <line
          x1="20"
          y1="14"
          x2="55"
          y2="74"
          stroke={accent}
          strokeWidth="1.5"
          strokeDasharray="80"
          strokeDashoffset="80"
          className={`transition-[stroke-dashoffset] duration-500 ease-[${easing}] group-hover/animated-card:[stroke-dashoffset:0]`}
          style={{ transitionDelay: "200ms" }}
        />
        <line
          x1="90"
          y1="14"
          x2="55"
          y2="74"
          stroke={accent}
          strokeWidth="1.5"
          strokeDasharray="80"
          strokeDashoffset="80"
          className={`transition-[stroke-dashoffset] duration-500 ease-[${easing}] group-hover/animated-card:[stroke-dashoffset:0]`}
          style={{ transitionDelay: "280ms" }}
        />
        {/* 3 nodes — pulse outward on hover */}
        {[
          { x: 20, y: 14, d: 0 },
          { x: 90, y: 14, d: 80 },
          { x: 55, y: 74, d: 160 },
        ].map((n, i) => (
          <g key={i}>
            <circle
              cx={n.x}
              cy={n.y}
              r="6"
              fill={`color-mix(in srgb, ${accent} 30%, var(--card))`}
              stroke={accent}
              strokeWidth="1.5"
              className={`transition-transform duration-500 ease-[${easing}] origin-center group-hover/animated-card:[r:8]`}
              style={{ transitionDelay: `${n.d}ms`, transformOrigin: `${n.x}px ${n.y}px` }}
            />
            <circle
              cx={n.x}
              cy={n.y}
              r="2.5"
              fill={accent}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─────────────────────────── team avatars ──────────────────────
function TeamVisual({ accent }: VisualProps) {
  // 4 stacked avatar circles that spread out horizontally on hover
  return (
    <div className="absolute right-8 top-1/2 -translate-y-1/2 z-[3] flex items-center">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`-ml-3 h-11 w-11 rounded-full border-2 shadow-md transition-all duration-500 ease-[${easing}] group-hover/animated-card:ml-1 first:ml-0`}
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${accent} ${30 + i * 15}%, white) 0%, ${accent} 100%)`,
            borderColor: "var(--card)",
            transitionDelay: `${i * 60}ms`,
            zIndex: 4 - i,
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────── plug (integrations) ──────────────
// Connector plug slides right into a wall socket on hover. A wire
// "spark" line draws across between them, then both endpoints pulse.
function PlugVisual({ accent }: VisualProps) {
  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[3] flex items-center w-[140px] h-[80px]">
      <svg
        viewBox="0 0 140 80"
        fill="none"
        className="w-full h-full overflow-visible"
      >
        {/* Wire / spark line — drawn in via stroke-dashoffset */}
        <path
          d="M52 40 Q 70 30 88 40"
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="60"
          strokeDashoffset="60"
          className={`transition-[stroke-dashoffset] duration-700 ease-[${easing}] group-hover/animated-card:[stroke-dashoffset:0]`}
          style={{ transitionDelay: "120ms" }}
        />
        {/* Plug — slides right on hover so it reaches the socket */}
        <g
          className={`transition-transform duration-500 ease-[${easing}] group-hover/animated-card:translate-x-2`}
        >
          {/* Plug body */}
          <rect
            x="14"
            y="26"
            width="34"
            height="28"
            rx="6"
            fill={accent}
          />
          {/* Plug prongs */}
          <rect x="44" y="32" width="6" height="4" rx="1" fill={accent} />
          <rect x="44" y="44" width="6" height="4" rx="1" fill={accent} />
          {/* Cable end */}
          <circle
            cx="8"
            cy="40"
            r="4"
            fill={`color-mix(in srgb, ${accent} 50%, black)`}
          />
        </g>
        {/* Socket — at right, floor-mounted look */}
        <g
          className={`transition-transform duration-500 ease-[${easing}] origin-center group-hover/animated-card:scale-105`}
          style={{ transformOrigin: "104px 40px" }}
        >
          <rect
            x="92"
            y="22"
            width="36"
            height="36"
            rx="6"
            fill={`color-mix(in srgb, ${accent} 18%, var(--card))`}
            stroke={accent}
            strokeWidth="1.5"
          />
          {/* Socket holes */}
          <rect
            x="100"
            y="32"
            width="3"
            height="6"
            rx="1"
            fill={accent}
            className={`transition-opacity duration-500 ease-[${easing}] group-hover/animated-card:opacity-70`}
          />
          <rect
            x="118"
            y="32"
            width="3"
            height="6"
            rx="1"
            fill={accent}
            className={`transition-opacity duration-500 ease-[${easing}] group-hover/animated-card:opacity-70`}
          />
          <circle
            cx="110"
            cy="46"
            r="2"
            fill={accent}
            className={`transition-opacity duration-500 ease-[${easing}] group-hover/animated-card:opacity-70`}
          />
        </g>
        {/* Spark glow at the connection point — pulses on hover */}
        <circle
          cx="92"
          cy="40"
          r="3"
          fill={accent}
          className={`opacity-0 transition-opacity duration-500 ease-[${easing}] group-hover/animated-card:opacity-100`}
          style={{
            transitionDelay: "560ms",
            filter: `drop-shadow(0 0 6px ${accent})`,
          }}
        />
      </svg>
    </div>
  );
}

// ─────────────────────────── chart (analytics) ────────────────
// Bar chart that grows from baseline on hover, with staggered delays per
// bar — gives the "data being plotted live" feel.
function ChartVisual({ accent }: VisualProps) {
  // Each bar: x position, base height, hovered height
  const bars = [
    { x: 0, h: 28, hover: 56 },
    { x: 18, h: 18, hover: 40 },
    { x: 36, h: 36, hover: 72 },
    { x: 54, h: 26, hover: 50 },
    { x: 72, h: 32, hover: 84 },
    { x: 90, h: 24, hover: 64 },
  ];
  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[3] w-[120px] h-[100px]">
      {/* Trend line — sloping upward, fades in on hover */}
      <svg
        viewBox="0 0 120 100"
        fill="none"
        className="absolute inset-0 w-full h-full"
      >
        <path
          d="M4 70 L 22 60 L 40 38 L 58 50 L 76 22 L 94 36"
          stroke={accent}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0"
          className={`transition-opacity duration-500 ease-[${easing}] group-hover/animated-card:[stroke-opacity:0.5]`}
          style={{ transitionDelay: "400ms" }}
        />
      </svg>
      {/* Bars — each scales-Y from 0.4 to 1 on hover, origin bottom */}
      <div className="absolute inset-x-0 bottom-0 h-full">
        {bars.map((b, i) => (
          <div
            key={i}
            className={`absolute bottom-0 w-3 rounded-t transition-all duration-500 ease-[${easing}]`}
            style={{
              left: `${b.x}px`,
              height: `var(--bar-h)`,
              ["--bar-h" as string]: `${b.h}px`,
              background: `color-mix(in srgb, ${accent} ${50 + i * 8}%, white)`,
              transitionDelay: `${i * 70}ms`,
              transformOrigin: "bottom",
            }}
          >
            {/* Hover state — overlay a taller version */}
            <span
              className={`absolute inset-x-0 bottom-0 rounded-t origin-bottom scale-y-0 transition-transform duration-500 ease-[${easing}] group-hover/animated-card:scale-y-100`}
              style={{
                height: `${b.hover}px`,
                background: accent,
                transitionDelay: `${i * 70}ms`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────── search (SEO) ─────────────────────
// Magnifying glass slides diagonally across "search results" lines.
// Lines change color where the glass passes over them.
function SearchVisual({ accent }: VisualProps) {
  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[3] w-[150px] h-[100px]">
      {/* Stack of "result" lines */}
      <div className="absolute inset-0 flex flex-col justify-center gap-2.5">
        {[
          { width: 90, hoverW: 70 },
          { width: 60, hoverW: 95 },
          { width: 75, hoverW: 60 },
          { width: 50, hoverW: 80 },
        ].map((l, i) => (
          <div key={i} className="relative h-1.5">
            {/* base line — neutral */}
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{
                width: `${l.width}%`,
                background: `color-mix(in srgb, ${accent} 30%, transparent)`,
              }}
            />
            {/* highlighted line — fades in as glass "scans" over it */}
            <div
              className={`absolute left-0 top-0 h-full rounded-full opacity-0 transition-opacity duration-500 ease-[${easing}] group-hover/animated-card:opacity-100`}
              style={{
                width: `${l.hoverW}%`,
                background: accent,
                transitionDelay: `${i * 100 + 200}ms`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Magnifying glass — sweeps diagonally on hover */}
      <svg
        viewBox="0 0 60 60"
        fill="none"
        className={`absolute top-1 left-1 w-12 h-12 transition-transform duration-700 ease-[${easing}] group-hover/animated-card:translate-x-[80px] group-hover/animated-card:translate-y-[36px]`}
      >
        <circle
          cx="22"
          cy="22"
          r="14"
          stroke={accent}
          strokeWidth="2.5"
          fill={`color-mix(in srgb, ${accent} 8%, var(--card))`}
        />
        <path
          d="M33 33 L 47 47"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Crosshair inside the glass */}
        <circle
          cx="22"
          cy="22"
          r="3"
          fill={accent}
          className={`opacity-60 transition-opacity duration-500 ease-[${easing}] group-hover/animated-card:opacity-100`}
        />
      </svg>
    </div>
  );
}

// ─────────────────────────── tower (broker logo / building) ───
// Multi-story tower silhouette. Floors / windows light up sequentially
// from bottom to top on hover — like a building turning on at dusk.
function TowerVisual({ accent }: VisualProps) {
  // 4 floors × 3 windows each = 12 windows
  const floors = [0, 1, 2, 3];
  const windowCols = [0, 1, 2];
  return (
    <div className="absolute right-10 bottom-2 z-[3] w-[80px] h-[110px]">
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-md overflow-hidden"
        style={{
          height: "100%",
          background: `linear-gradient(180deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, black) 100%)`,
        }}
      >
        {/* Antenna on top */}
        <div
          className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-0.5 h-3"
          style={{ background: accent }}
        />
        <div
          className={`absolute top-[-9px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full transition-opacity duration-500 ease-[${easing}] opacity-0 group-hover/animated-card:opacity-100`}
          style={{
            background: accent,
            filter: `drop-shadow(0 0 4px ${accent})`,
            transitionDelay: "1000ms",
          }}
        />
        {/* Floors of windows */}
        <div className="absolute inset-x-0 top-3 bottom-3 flex flex-col-reverse justify-around items-center gap-1.5 px-2">
          {floors.map((floor) => (
            <div key={floor} className="flex gap-1.5 w-full justify-center">
              {windowCols.map((col) => {
                const idx = floor * 3 + col;
                return (
                  <span
                    key={col}
                    className={`flex-1 h-3 rounded-sm transition-colors duration-300 ease-[${easing}]`}
                    style={{
                      background:
                        "color-mix(in srgb, white 6%, transparent)",
                      transitionDelay: `${idx * 60}ms`,
                    }}
                  >
                    <span
                      className={`block w-full h-full rounded-sm opacity-0 transition-opacity duration-300 ease-[${easing}] group-hover/animated-card:opacity-100`}
                      style={{
                        background: "rgb(255 240 180)",
                        boxShadow: "0 0 4px rgb(255 215 130 / 0.7)",
                        transitionDelay: `${idx * 60}ms`,
                      }}
                    />
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── browser (favicon) ────────────────
// Browser-window mock with a tab strip, address bar, and a circular
// favicon. On hover, the favicon scales + a subtle "loading" sweep
// progresses across the address bar.
function BrowserVisual({ accent }: VisualProps) {
  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[3] w-[140px] h-[100px]">
      <div
        className="absolute inset-0 rounded-md overflow-hidden border"
        style={{
          background: "var(--card)",
          borderColor: `color-mix(in srgb, ${accent} 28%, var(--border))`,
        }}
      >
        {/* Title bar */}
        <div
          className="absolute inset-x-0 top-0 h-5 flex items-center px-1.5 gap-1"
          style={{
            background: `color-mix(in srgb, ${accent} 12%, var(--card))`,
            borderBottom: `1px solid color-mix(in srgb, ${accent} 18%, transparent)`,
          }}
        >
          {/* Three dots */}
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: `color-mix(in srgb, ${accent} ${30 + i * 10}%, white)`,
              }}
            />
          ))}
          {/* Active tab with circular favicon */}
          <div
            className="ml-2 inline-flex items-center gap-1 rounded-t px-1.5 py-0.5"
            style={{ background: "var(--card)" }}
          >
            <span
              className={`block w-2 h-2 rounded-full transition-transform duration-500 ease-[${easing}] group-hover/animated-card:scale-125`}
              style={{
                background: accent,
                boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 30%, white)`,
              }}
            />
            <span
              className="block w-7 h-1 rounded-full"
              style={{
                background: `color-mix(in srgb, ${accent} 35%, transparent)`,
              }}
            />
          </div>
        </div>
        {/* Address bar */}
        <div className="absolute left-2 right-2 top-7 h-3 rounded">
          <div
            className="absolute inset-0 rounded"
            style={{
              background: `color-mix(in srgb, ${accent} 8%, var(--muted))`,
            }}
          />
          {/* Loading sweep on hover */}
          <div
            className={`absolute inset-y-0 left-0 rounded transition-[width] duration-700 ease-[${easing}] w-0 group-hover/animated-card:w-full`}
            style={{
              background: `color-mix(in srgb, ${accent} 28%, transparent)`,
              transitionDelay: "200ms",
            }}
          />
        </div>
        {/* Page content lines */}
        <div className="absolute inset-x-2 top-12 bottom-2 flex flex-col gap-1 justify-start pt-1">
          {[80, 60, 75, 55].map((w, i) => (
            <span
              key={i}
              className="h-1 rounded-full"
              style={{
                width: `${w}%`,
                background: `color-mix(in srgb, ${accent} 25%, transparent)`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── share (featured image) ───────────
// A stylized social-share preview card slides in from the right,
// representing the OpenGraph image embedded in iMessage / Facebook /
// Twitter cards. On hover, slides into final position with subtle bounce.
function ShareVisual({ accent }: VisualProps) {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[3] w-[150px] h-[110px]">
      {/* Background card — slightly behind, scales on hover */}
      <div
        className={`absolute inset-y-2 -right-2 left-3 rounded-lg transition-transform duration-500 ease-[${easing}] group-hover/animated-card:translate-x-1 group-hover/animated-card:rotate-[3deg]`}
        style={{
          background: `color-mix(in srgb, ${accent} 12%, var(--card))`,
          border: `1px solid color-mix(in srgb, ${accent} 20%, var(--border))`,
          transformOrigin: "left center",
        }}
      />
      {/* Foreground share card */}
      <div
        className={`absolute inset-0 rounded-lg overflow-hidden transition-transform duration-500 ease-[${easing}] group-hover/animated-card:-translate-x-1 group-hover/animated-card:-rotate-[2deg]`}
        style={{
          background: "var(--card)",
          border: `1px solid color-mix(in srgb, ${accent} 35%, var(--border))`,
          boxShadow: "0 6px 14px -4px rgba(0,0,0,0.18)",
        }}
      >
        {/* OG image area */}
        <div
          className="h-[55%] w-full relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 50%, white) 100%)`,
          }}
        >
          {/* Subtle pattern overlay that drifts */}
          <span
            className={`absolute inset-0 opacity-40 transition-transform duration-700 ease-[${easing}] group-hover/animated-card:scale-110`}
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)",
            }}
          />
          {/* Image-icon glyph */}
          <span
            className="absolute inset-0 flex items-center justify-center"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.6"
              stroke="currentColor"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.6" fill="currentColor" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </span>
        </div>
        {/* Title + URL */}
        <div className="px-2.5 py-1.5">
          <span
            className="block h-1.5 rounded-full mb-1"
            style={{
              width: "75%",
              background: `color-mix(in srgb, ${accent} 60%, transparent)`,
            }}
          />
          <span
            className="block h-1 rounded-full"
            style={{
              width: "55%",
              background: `color-mix(in srgb, ${accent} 30%, transparent)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── grid (fallback) ───────────────────
function GridVisual({ accent }: VisualProps) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 z-[3] opacity-60 transition-transform duration-700 ease-[${easing}] group-hover/animated-card:translate-x-2 group-hover/animated-card:translate-y-2 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_55%,transparent_100%)]`}
      style={{
        backgroundImage: `linear-gradient(to right, color-mix(in srgb, ${accent} 22%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, ${accent} 22%, transparent) 1px, transparent 1px)`,
        backgroundSize: "20px 20px",
      }}
    />
  );
}

// ─────────────────────────── dispatcher ────────────────────────

export function AdminCardVisual({
  variant,
  accent,
}: {
  variant: AdminCardVariant;
  accent: string;
}) {
  switch (variant) {
    case "palette":
      return <PaletteVisual accent={accent} />;
    case "lines":
      return <LinesVisual accent={accent} />;
    case "stack":
      return <StackVisual accent={accent} />;
    case "houses":
      return <HousesVisual accent={accent} />;
    case "checks":
      return <ChecksVisual accent={accent} />;
    case "stars":
      return <StarsVisual accent={accent} />;
    case "nodes":
      return <NodesVisual accent={accent} />;
    case "team":
      return <TeamVisual accent={accent} />;
    case "plug":
      return <PlugVisual accent={accent} />;
    case "chart":
      return <ChartVisual accent={accent} />;
    case "search":
      return <SearchVisual accent={accent} />;
    case "tower":
      return <TowerVisual accent={accent} />;
    case "browser":
      return <BrowserVisual accent={accent} />;
    case "share":
      return <ShareVisual accent={accent} />;
    case "grid":
    default:
      return <GridVisual accent={accent} />;
  }
}
