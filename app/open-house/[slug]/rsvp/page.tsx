import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, BedDouble, Bath, Car } from "lucide-react";
import { getOpenHouseBySlug } from "@/lib/openHousesLoader";
import {
  OPEN_HOUSE_FEATURE_BY_KEY,
  TOTAL_FLYER_PILLS,
} from "@/lib/openHouseFeatures";
import * as LucideIcons from "lucide-react";
import RsvpFormStandalone from "@/components/openhouse/RsvpFormStandalone";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const oh = await getOpenHouseBySlug(slug);
  if (!oh) return { title: "RSVP" };
  return {
    title: `RSVP — ${oh.heading}`,
    description: `Save your spot at ${oh.address}.`,
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default async function OpenHouseRsvpPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const oh = await getOpenHouseBySlug(slug);
  if (!oh || !oh.formId) notFound();

  const dateLabel = formatDate(oh.date);

  // Build the same 4-pill list the flyer uses
  const pills: { key: string; label: string; icon: string }[] = [
    {
      key: "bd",
      label: `${oh.bedrooms ?? 0} ${oh.bedrooms === 1 ? "Bed" : "Beds"}`,
      icon: "BedDouble",
    },
    {
      key: "ba",
      label: `${
        oh.bathrooms == null
          ? 0
          : Number.isInteger(oh.bathrooms)
            ? oh.bathrooms
            : oh.bathrooms.toFixed(1)
      } ${oh.bathrooms === 1 ? "Bath" : "Baths"}`,
      icon: "Bath",
    },
  ];
  if (oh.garageSpaces > 0) {
    pills.push({
      key: "garage",
      label: `${oh.garageSpaces}-Car Garage`,
      icon: "Car",
    });
  }
  for (const k of oh.features) {
    if (pills.length >= TOTAL_FLYER_PILLS) break;
    const f = OPEN_HOUSE_FEATURE_BY_KEY[k];
    if (!f) continue;
    pills.push({ key: f.key, label: f.label, icon: f.icon });
  }

  return (
    <main className="min-h-screen bg-cream-soft pt-8 md:pt-10 pb-24 px-4">
      <div className="max-w-md mx-auto">
        <Link
          href={`/open-house/${oh.slug}`}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-ink/55 hover:text-ink mb-4"
        >
          <ArrowLeft size={13} /> Back to listing
        </Link>

        <article className="bg-white rounded-md shadow-[0_30px_80px_-30px_rgba(20,40,64,0.18)] overflow-hidden">
          {/* Hero photo at top */}
          <div className="relative aspect-[16/9] bg-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={oh.hero}
              alt={oh.heading}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {(dateLabel || oh.timeLabel) && (
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md border border-white/60">
                <div className="flex items-center gap-1.5">
                  <Calendar size={11} className="text-navy" strokeWidth={1.75} />
                  <div className="text-[0.6rem] uppercase tracking-[0.14em] text-navy leading-tight" style={{ fontWeight: 600 }}>
                    {dateLabel}
                    {oh.timeLabel && (
                      <span className="text-ink/65"> · {oh.timeLabel}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Heading + address */}
          <div className="px-6 pt-5 pb-1 text-center">
            <p
              className="text-[0.6rem] tracking-[0.4em] uppercase text-navy/85 mb-2"
              style={{ fontWeight: 600 }}
            >
              You&rsquo;re Invited
            </p>
            <h1
              className="text-xl md:text-2xl text-ink uppercase leading-[1.1] mb-2"
              style={{ fontWeight: 700, letterSpacing: "0.01em" }}
            >
              {oh.heading}
            </h1>
            <p className="inline-flex items-center gap-1.5 text-[0.7rem] tracking-[0.16em] uppercase text-ink/60">
              <MapPin size={11} strokeWidth={1.75} />
              {oh.address}
            </p>
          </div>

          {/* RSVP Form */}
          <div className="px-6 pt-6 pb-6">
            <RsvpFormStandalone
              formId={oh.formId}
              formSlug={`open-house-${oh.slug}`}
              slug={oh.slug}
              heading={oh.heading}
              address={oh.address}
            />
          </div>

          {/* Features at bottom */}
          {pills.length > 0 && (
            <div className="px-6 pb-7 pt-1">
              <p
                className="text-[0.58rem] tracking-[0.3em] uppercase text-ink/55 text-center mb-3"
                style={{ fontWeight: 500 }}
              >
                What&rsquo;s inside
              </p>
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${pills.length}, minmax(0, 1fr))`,
                }}
              >
                {pills.map((p) => {
                  const Icon =
                    (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>>)[
                      p.icon
                    ] ?? LucideIcons.Check;
                  return (
                    <div
                      key={p.key}
                      className="text-center bg-cream-soft/70 rounded px-2 py-2.5"
                    >
                      <Icon
                        size={16}
                        strokeWidth={1.5}
                        className="text-navy mx-auto mb-1"
                      />
                      <p
                        className="text-[0.55rem] tracking-[0.12em] uppercase text-ink/85 leading-tight"
                        style={{ fontWeight: 600 }}
                      >
                        {p.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
