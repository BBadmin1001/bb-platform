import Link from "next/link";
import { ChevronDown } from "lucide-react";
import ShimmerText from "@/components/ShimmerText";
import Counter from "@/components/Counter";
import {
  getSection,
  resolveImageUrl,
  resolveVideoUrl,
} from "@/lib/contentLoader";

type HeroStat = {
  value: number | string;
  decimals?: number | string;
  prefix?: string;
  suffix?: string;
  label: string;
};

type HeroCta = { label: string; href: string; style?: string };

type HeroContent = {
  eyebrow: string;
  titleLines: string[];
  subtitle: string;
  ctas: HeroCta[];
  stats: HeroStat[];
  backgroundImage?: { image_id?: string };
  backgroundVideo?: { media_id?: string };
};

const FALLBACK_VIDEO_MP4 =
  "https://res.cloudinary.com/dgkg1aozt/video/upload/v1/samples/sea-turtle.mp4";
const FALLBACK_POSTER =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&auto=format&fit=crop&q=85";

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toIntOrUndef(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = parseInt(asString(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

function asString(v: unknown): string {
  return v == null ? "" : String(v);
}

export default async function Hero() {
  const c = await getSection<HeroContent>("home", "hero");
  const [posterUrl, video] = await Promise.all([
    resolveImageUrl(c.backgroundImage, {
      fallback: FALLBACK_POSTER,
      crop: "wide",
      width: 1920,
    }),
    resolveVideoUrl(c.backgroundVideo),
  ]);

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-navy-dark">
      {/* Video / image layer — YouTube iframe if a video was picked,
           otherwise the default mp4 (sea turtle) with the poster image. */}
      <div className="absolute inset-0">
        {video.kind === "youtube" ? (
          <iframe
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[177.78vh] min-w-full h-[56.25vw] min-h-full pointer-events-none"
            src={video.embedUrl}
            title="Hero background video"
            allow="autoplay; encrypted-media"
            allowFullScreen={false}
            frameBorder="0"
          />
        ) : (
          <video
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            poster={posterUrl}
          >
            <source src={FALLBACK_VIDEO_MP4} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 overlay-hero" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 sm:px-8 pt-28 md:pt-32 pb-10 md:pb-12">
          <p
            className="eyebrow-light mb-7 md:mb-10 animate-fade-in"
            style={{ animationDelay: "0.2s", animationFillMode: "both" }}
          >
            {c.eyebrow}
          </p>

          <h1
            className="heading-display text-white animate-fade-in-up"
            style={{
              fontSize: "clamp(2.5rem, 9vw, 6.5rem)",
              animationDelay: "0.4s",
              animationFillMode: "both",
              lineHeight: 1.04,
            }}
          >
            <ShimmerText delay={1.2}>
              {c.titleLines.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < c.titleLines.length - 1 && <br />}
                </span>
              ))}
            </ShimmerText>
          </h1>

          <div
            className="mt-9 md:mt-12 w-14 md:w-16 h-px bg-white/40 animate-fade-in"
            style={{ animationDelay: "0.7s", animationFillMode: "both" }}
          />

          <p
            className="mt-9 md:mt-12 max-w-xl text-sm sm:text-base md:text-lg font-light text-white/90 leading-[1.85] md:leading-[1.9] animate-fade-in-up px-2"
            style={{ animationDelay: "0.85s", animationFillMode: "both" }}
          >
            {c.subtitle}
          </p>

          <div
            className="mt-10 md:mt-16 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-5 w-full max-w-md sm:max-w-none animate-fade-in-up"
            style={{ animationDelay: "1.05s", animationFillMode: "both" }}
          >
            {c.ctas.map((cta) => (
              <Link
                key={cta.label}
                href={cta.href}
                className={`${cta.style === "glass" ? "btn-glass" : "btn-outline-light"} w-full sm:w-auto justify-center`}
              >
                {cta.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Frosted glass stat strip — sized down on mobile */}
        <div className="relative pb-16 md:pb-24 px-4 sm:px-6">
          <div
            className="max-w-6xl mx-auto glass-dark rounded-[2px] animate-fade-in-up"
            style={{ animationDelay: "1.3s", animationFillMode: "both" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3">
              {c.stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`px-6 sm:px-8 md:px-12 py-9 sm:py-11 md:py-16 text-center ${
                    i > 0 ? "md:border-l border-white/15 border-t md:border-t-0" : ""
                  }`}
                >
                  <p
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white tracking-wide"
                    style={{ fontWeight: 200, letterSpacing: "0.04em" }}
                  >
                    <Counter
                      to={toNumber(stat.value)}
                      decimals={toIntOrUndef(stat.decimals)}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                    />
                  </p>
                  <div className="mx-auto my-4 md:my-5 w-8 md:w-9 h-px bg-white/35" />
                  <p
                    className="text-[0.62rem] sm:text-[0.68rem] md:text-[0.75rem] tracking-[0.30em] md:tracking-[0.32em] uppercase text-white/80 px-2"
                    style={{ fontWeight: 400 }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <a
            href="#intro"
            aria-label="Scroll to next section"
            className="absolute left-1/2 -translate-x-1/2 bottom-4 md:bottom-6 text-white/70 hover:text-white transition-colors animate-fade-in"
            style={{ animationDelay: "1.6s", animationFillMode: "both" }}
          >
            <ChevronDown size={28} strokeWidth={1} className="md:hidden" />
            <ChevronDown size={32} strokeWidth={1} className="hidden md:block" />
          </a>
        </div>
      </div>
    </section>
  );
}
