"use client";

/**
 * Theme editor — the screen where the admin re-skins the whole site.
 *
 * Two color tokens (primary = navy, surface = cream), each with:
 *   • HTML5 color picker + hex text input
 *   • Optional gradient: pick from curated presets or paste raw CSS
 *   • Live preview pane showing a mini header/footer/button mock so the
 *     admin sees exactly what they're committing to before saving
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Save, RotateCcw, Palette, Wand2 } from "lucide-react";
import {
  type BrandTheme,
  DEFAULT_BRAND_THEME,
  GRADIENT_PRESETS,
} from "@/lib/brandTheme";
import { saveBrandTheme } from "@/app/admin/brand/theme/actions";
import { cn } from "@/lib/cn";

export default function ThemeEditor({ initial }: { initial: BrandTheme }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [theme, setTheme] = useState<BrandTheme>(initial);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function patch<K extends keyof BrandTheme>(key: K, value: BrandTheme[K]) {
    setTheme((t) => ({ ...t, [key]: value }));
    setSavedAt(null);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await saveBrandTheme(theme);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  function handleReset() {
    if (!confirm("Reset all theme values back to the original navy + cream defaults?")) return;
    setTheme(DEFAULT_BRAND_THEME);
    setSavedAt(null);
  }

  return (
    <div className="space-y-8">
      {/* Live preview — sticks at the top so changes are visible while scrolling */}
      <ThemePreview theme={theme} />

      {/* Primary color */}
      <ColorSection
        title="Primary Color"
        eyebrow="Navy replacement"
        helper="Used for the header (when scrolled), menu, footer, primary buttons, links, and any place currently rendered in navy."
        color={theme.primary}
        onColorChange={(v) => patch("primary", v)}
        gradient={theme.primaryGradient}
        onGradientChange={(v) => patch("primaryGradient", v)}
      />

      {/* Surface color */}
      <ColorSection
        title="Surface Color"
        eyebrow="Cream replacement"
        helper="Used for the page background and soft cards. Most sites stay with a flat color here — gradients can feel busy as a full-page background."
        color={theme.surface}
        onColorChange={(v) => patch("surface", v)}
        gradient={theme.surfaceGradient}
        onGradientChange={(v) => patch("surfaceGradient", v)}
      />

      {/* Action bar */}
      <div className="sticky bottom-0 -mx-5 md:-mx-8 px-5 md:px-8 py-4 bg-cream/95 backdrop-blur border-t border-black/8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-ink/65 hover:text-red-600 inline-flex items-center gap-1.5"
        >
          <RotateCcw size={13} /> Reset to defaults
        </button>
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="text-[11px] text-emerald-700 inline-flex items-center gap-1">
              <Check size={12} /> Saved
            </span>
          )}
          {error && <span className="text-[11px] text-red-700">{error}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="admin-btn"
          >
            <Save size={13} className="mr-2" />
            {pending ? "Saving…" : "Save theme"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorSection({
  title,
  eyebrow,
  helper,
  color,
  onColorChange,
  gradient,
  onGradientChange,
}: {
  title: string;
  eyebrow: string;
  helper: string;
  color: string;
  onColorChange: (v: string) => void;
  gradient: string;
  onGradientChange: (v: string) => void;
}) {
  const [showGradient, setShowGradient] = useState(Boolean(gradient));

  function toggleGradient() {
    if (showGradient) {
      onGradientChange("");
      setShowGradient(false);
    } else {
      setShowGradient(true);
    }
  }

  return (
    <section className="admin-card p-6">
      <p
        className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-2"
        style={{ fontWeight: 500 }}
      >
        {eyebrow}
      </p>
      <h2
        className="text-lg text-ink mb-1"
        style={{ fontWeight: 500, letterSpacing: "0.02em" }}
      >
        {title}
      </h2>
      <p className="text-xs text-ink/65 mb-5 leading-relaxed">{helper}</p>

      {/* Solid color picker */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-md border border-black/15 shadow-inner shrink-0"
            style={{ background: color }}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-12 h-12 rounded cursor-pointer border border-black/10"
            aria-label="Color picker"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            placeholder="#142840"
            className="admin-input w-32 font-mono uppercase"
            style={{ fontFamily: "ui-monospace, monospace" }}
          />
        </div>
      </div>

      {/* Quick-pick swatches */}
      <div className="mb-5">
        <p className="text-[10px] tracking-[0.2em] uppercase text-ink/55 mb-2" style={{ fontWeight: 500 }}>
          Quick picks
        </p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              className={cn(
                "w-7 h-7 rounded-full border transition",
                color.toLowerCase() === c.toLowerCase()
                  ? "border-ink ring-2 ring-ink/20"
                  : "border-black/15 hover:border-black/40",
              )}
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Gradient toggle */}
      <button
        type="button"
        onClick={toggleGradient}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition",
          showGradient
            ? "bg-ink/5 border-ink/15 text-ink"
            : "border-dashed border-ink/20 text-ink/65 hover:text-ink hover:border-ink/35",
        )}
      >
        <Wand2 size={12} />
        {showGradient ? "Using a gradient — click to disable" : "Use a gradient instead"}
      </button>

      {showGradient && (
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-ink/55 mb-2" style={{ fontWeight: 500 }}>
              Presets
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GRADIENT_PRESETS.map((g) => (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => onGradientChange(g.value)}
                  className={cn(
                    "h-12 rounded-md border text-[10px] uppercase tracking-[0.18em] text-white relative overflow-hidden transition",
                    gradient === g.value
                      ? "ring-2 ring-ink/30 border-ink"
                      : "border-black/15 hover:ring-2 hover:ring-ink/20",
                  )}
                  style={{ background: g.value, fontWeight: 500 }}
                  title={g.value}
                >
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    {g.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="admin-label flex items-center gap-1.5">
              <Palette size={11} /> Or paste raw CSS
            </label>
            <textarea
              value={gradient}
              onChange={(e) => onGradientChange(e.target.value)}
              placeholder="linear-gradient(135deg, #0E1C30 0%, #25406A 100%)"
              rows={2}
              className="admin-input font-mono"
              style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}
            />
            <p className="text-[10px] text-ink/45 mt-1.5">
              Any valid CSS background-image value works:{" "}
              <code>linear-gradient(...)</code>, <code>radial-gradient(...)</code>, or
              even a stacked combination.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ThemePreview({ theme }: { theme: BrandTheme }) {
  // We compute the previewed "navy" background using the same logic the
  // CSS will use — gradient overlay on top of the solid color.
  const primaryBg = theme.primaryGradient || theme.primary;
  const surfaceBg = theme.surfaceGradient || theme.surface;

  return (
    <section className="admin-card p-0 overflow-hidden">
      <div className="px-6 py-3 border-b border-black/8 flex items-center justify-between">
        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55"
          style={{ fontWeight: 500 }}
        >
          Live preview
        </p>
      </div>

      <div className="p-6" style={{ background: surfaceBg }}>
        {/* Mock header */}
        <div
          className="rounded-lg px-5 py-4 flex items-center justify-between text-white shadow-sm mb-4"
          style={{ background: primaryBg }}
        >
          <span className="text-sm" style={{ fontWeight: 500, letterSpacing: "0.04em" }}>
            Samina Bilal
          </span>
          <div className="hidden sm:flex items-center gap-4 text-[11px] uppercase tracking-[0.2em] opacity-90">
            <span>Home</span>
            <span>Buyers</span>
            <span>Sellers</span>
            <span>Contact</span>
          </div>
        </div>

        {/* Mock body */}
        <div className="rounded-lg px-5 py-6 bg-white/70 mb-4">
          <p className="text-[10px] tracking-[0.32em] uppercase mb-2" style={{ color: theme.primary, fontWeight: 500 }}>
            Northern Virginia · Maryland
          </p>
          <h3 className="text-xl text-ink mb-2" style={{ fontWeight: 600 }}>
            Make Yourself at Home
          </h3>
          <p className="text-xs text-ink/65 mb-4">
            Boutique real estate guidance across Virginia and Maryland.
          </p>
          <div className="flex gap-2">
            <span
              className="inline-flex items-center px-3.5 py-2 rounded-md text-white text-xs"
              style={{ background: primaryBg, fontWeight: 500 }}
            >
              Primary button
            </span>
            <span
              className="inline-flex items-center px-3.5 py-2 rounded-md text-xs border"
              style={{ color: theme.primary, borderColor: theme.primary, fontWeight: 500 }}
            >
              Outline button
            </span>
          </div>
        </div>

        {/* Mock footer */}
        <div
          className="rounded-lg px-5 py-3 text-white text-[11px] flex items-center justify-between"
          style={{ background: primaryBg }}
        >
          <span className="opacity-80">© Samina Bilal · RE/MAX Galaxy</span>
          <span className="uppercase tracking-[0.2em] opacity-70">Footer</span>
        </div>
      </div>
    </section>
  );
}

const QUICK_COLORS = [
  "#142840", // current navy
  "#0F4C81", // atlantic
  "#1B4332", // forest
  "#7B2D26", // brick
  "#2B1B3F", // plum
  "#1F1F1F", // charcoal
  "#B89968", // brass
  "#F2EFEA", // current cream
  "#FFFFFF", // pure white
  "#F4EDE0", // bone
  "#EFE4D2", // sand
  "#E5E5E5", // soft grey
];
