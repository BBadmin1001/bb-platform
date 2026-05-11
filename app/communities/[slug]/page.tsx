import { notFound } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Trees, UtensilsCrossed, Train } from "lucide-react";
import { getCommunities, getCommunityBySlug } from "@/lib/communitiesLoader";
import ShimmerText from "@/components/ShimmerText";
import DarkBreak from "@/components/DarkBreak";
import { getCurrentTenant } from "@/lib/tenant/context";
import { getTenantChrome } from "@/lib/tenant/chrome";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [c, tenant] = await Promise.all([
    getCommunityBySlug(slug),
    getCurrentTenant(),
  ]);
  if (!c) return {};
  const name = tenant?.realtor_name?.trim();
  return {
    title: `${c.name}, ${c.state} Real Estate${name ? ` | ${name}` : ""}`,
    description: c.tagline,
  };
}

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [c, chrome] = await Promise.all([
    getCommunityBySlug(slug),
    getTenantChrome(),
  ]);
  if (!c) notFound();
  const all = await getCommunities();
  const others = all.filter((x) => x.slug !== slug).slice(0, 3);
  const firstName = chrome.name.split(/\s+/)[0] || chrome.name;

  const yoyColor =
    c.yoyDirection === "up"
      ? "text-emerald-300"
      : c.yoyDirection === "down"
      ? "text-orange-300"
      : "text-white/85";

  return (
    <>
      {/* HERO — uses heroImage override if set, else falls back to the
           same photo that appears on the homepage card grid */}
      <section className="relative min-h-[100vh] w-full overflow-hidden bg-navy-dark">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${c.heroImage || c.image}')` }}
        />
        <div className="absolute inset-0 overlay-hero" />

        <div className="relative z-10 min-h-[100vh] flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-32 pb-12">
            <p className="eyebrow-light mb-10">{c.state}</p>
            <h1
              className="heading-display text-white"
              style={{
                fontSize: "clamp(3rem, 8vw, 6.5rem)",
                lineHeight: 1.02,
              }}
            >
              <ShimmerText>{c.name}</ShimmerText>
            </h1>
            <div className="mt-12 w-16 h-px bg-white/40" />
            <p className="mt-12 max-w-xl text-base md:text-lg font-light text-white/90 leading-[1.9] italic">
              {c.tagline}
            </p>
          </div>

          {/* Frosted glass stat strip */}
          <div className="pb-24 px-6">
            <div className="max-w-6xl mx-auto glass-dark">
              <div className="grid grid-cols-2 md:grid-cols-4">
                <Stat label="Median (Mar 2026)" value={c.median} />
                <Stat label="YoY Change" value={c.yoy} className={yoyColor} divider />
                <Stat label="Days on Market" value={c.dom} divider />
                <Stat
                  label="Market"
                  value={c.marketType === "Balanced" ? "Balanced" : `${c.marketType}'s`}
                  small
                  divider
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto text-center">
          <p className="eyebrow mb-8">About this neighborhood</p>
          <h2
            className="heading-section text-ink mb-10"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            What {c.name} Is
          </h2>
          <div className="mx-auto mb-12 w-12 h-px bg-navy/40" />
          <p className="text-base md:text-lg font-light leading-[1.95] text-ink/80 text-left md:text-center">
            {c.about}
          </p>
        </div>
      </section>

      {/* The 2026 market */}
      <section className="bg-cream-soft section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto text-center">
          <p className="eyebrow mb-8">2026 Market Read</p>
          <h2
            className="heading-section text-ink mb-10"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            The Year So Far
          </h2>
          <div className="mx-auto mb-12 w-12 h-px bg-navy/40" />
          <p className="text-base md:text-lg font-light leading-[1.95] text-ink/80 text-left md:text-center">
            {c.market2026}
          </p>
        </div>
      </section>

      {/* Dark break — separates market read from price tiers */}
      <DarkBreak
        bgImage={c.image}
        height="sm"
      />

      {/* Price tiers */}
      <section className="section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-24">
          <p className="eyebrow mb-8">What you get for your money</p>
          <h2
            className="heading-section text-ink"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            Three Price Tiers
          </h2>
        </div>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 md:gap-10">
          {c.priceTiers.map((p, i) => (
            <div key={i} className="glass-light p-7 md:p-12 flex flex-col">
              <p
                className="text-3xl text-navy mb-2 tracking-wide"
                style={{ fontWeight: 200 }}
              >
                {p.tier}
              </p>
              <div className="my-6 w-10 h-px bg-navy/40" />
              <p className="text-base font-light leading-[1.85] text-ink/80">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Life here */}
      <section className="bg-cream-soft section-y-lg gutter-x">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-24">
          <p className="eyebrow mb-8">Life here</p>
          <h2
            className="heading-section text-ink"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            Day-to-Day in {c.name}
          </h2>
        </div>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-16">
          <LifeCard icon={<GraduationCap size={28} strokeWidth={1.25} />} title="Schools" body={c.life.schools} />
          <LifeCard icon={<Trees size={28} strokeWidth={1.25} />} title="Parks" body={c.life.parks} />
          <LifeCard icon={<UtensilsCrossed size={28} strokeWidth={1.25} />} title="Dining & Shopping" body={c.life.dining} />
          <LifeCard icon={<Train size={28} strokeWidth={1.25} />} title="Commute" body={c.life.commute} />
        </div>
      </section>

      {/* Dark break — separates "Life here" from "Samina's take" */}
      <DarkBreak
        bgImage="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&auto=format&fit=crop&q=85"
        height="sm"
      />

      {/* Realtor's take — sign-off uses the active tenant's name + role,
          no longer hardcoded to Samina. The quote itself is per-tenant
          per-community via communities.samina_quote (legacy column
          name; treated as a generic "realtor's quote" column). */}
      {c.saminaQuote && (
        <section className="section-y-lg gutter-x">
          <div className="max-w-3xl mx-auto text-center">
            <p className="eyebrow mb-12">{firstName}&apos;s Take</p>
            <blockquote
              className="text-2xl md:text-3xl lg:text-4xl leading-[1.45] text-ink italic"
              style={{ fontWeight: 200, letterSpacing: "0.005em" }}
            >
              &ldquo;{c.saminaQuote}&rdquo;
            </blockquote>
            <div className="mx-auto my-12 w-10 h-px bg-navy/40" />
            <p className="text-[0.7rem] tracking-[0.4em] uppercase text-ink-muted">
              {chrome.name} · {chrome.role || "Realtor"}
            </p>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative bg-navy text-white section-y gutter-x overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.18]"
          style={{ backgroundImage: `url('${c.image}')` }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2
            className="heading-section mb-10"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
          >
            Thinking about {c.name}?
          </h2>
          <div className="mx-auto mb-10 w-12 h-px bg-white/40" />
          <p className="text-base md:text-lg font-light leading-[1.9] text-white/85 max-w-xl mx-auto mb-14">
            Get a custom market report for your situation — buyer or seller — within 24 hours.
          </p>
          <div className="flex flex-wrap justify-center gap-5">
            <Link href="/contact" className="btn-glass">
              Schedule a Call
            </Link>
            <Link href="/sellers" className="btn-outline-light">
              Get Home Valuation
            </Link>
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="section-y gutter-x bg-cream">
        <p className="eyebrow mb-16 text-center">More Communities</p>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 md:gap-10">
          {others.map((o) => (
            <Link
              key={o.slug}
              href={`/communities/${o.slug}`}
              className="group relative aspect-[4/3] block overflow-hidden bg-navy-dark"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.4s] ease-editorial group-hover:scale-[1.05]"
                style={{ backgroundImage: `url('${o.image}')` }}
              />
              <div className="absolute inset-0 overlay-card" />
              <div className="absolute left-5 right-5 bottom-5 glass-dark px-6 py-5 text-white">
                <h3
                  className="text-xl uppercase tracking-wide"
                  style={{ fontWeight: 200, letterSpacing: "0.05em" }}
                >
                  {o.name}
                </h3>
                <p className="mt-2 text-xs font-light opacity-80 tracking-wider">
                  {o.median} · {o.yoy}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  className,
  small,
  divider,
}: {
  label: string;
  value: string;
  className?: string;
  small?: boolean;
  divider?: boolean;
}) {
  return (
    <div
      className={`px-6 py-10 md:py-12 text-center ${
        divider ? "border-t md:border-t-0 md:border-l border-white/15" : ""
      }`}
    >
      <p
        className={`${small ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"} tracking-wide ${className ?? "text-white"}`}
        style={{ fontWeight: 200, letterSpacing: "0.04em" }}
      >
        {value}
      </p>
      <div className="mx-auto my-4 w-7 h-px bg-white/30" />
      <p
        className="text-[0.62rem] tracking-[0.32em] uppercase text-white/70"
        style={{ fontWeight: 400 }}
      >
        {label}
      </p>
    </div>
  );
}

function LifeCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div>
      <div className="text-navy mb-6">{icon}</div>
      <p className="text-[0.65rem] tracking-[0.32em] uppercase text-ink-muted mb-5">
        {title}
      </p>
      <p className="text-sm font-light leading-[1.85] text-ink/80">{body}</p>
    </div>
  );
}
