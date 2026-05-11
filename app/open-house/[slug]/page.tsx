import { notFound } from "next/navigation";
import { MapPin, Calendar, Phone, Mail, Hash, ScanLine } from "lucide-react";
import { getOpenHouseBySlug } from "@/lib/openHousesLoader";
import { getPortrait, getBrokerLogo } from "@/lib/contentLoader";
import {
  OPEN_HOUSE_FEATURE_BY_KEY,
  TOTAL_FLYER_PILLS,
} from "@/lib/openHouseFeatures";
import { getTenantChrome } from "@/lib/tenant/chrome";
import * as LucideIcons from "lucide-react";
import PrintFlyerActions from "@/components/openhouse/PrintFlyerActions";
import { qrDataUrl, siteOrigin } from "@/lib/qrcode";
import type { SignupPill } from "@/components/openhouse/SignupModal";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const oh = await getOpenHouseBySlug(slug);
  if (!oh) return { title: "Open House" };

  // The flyer's hero photo doubles as the social-share image. The
  // description (capped at 100 words in admin) becomes the link-preview
  // excerpt. Falls back to a generic line when the realtor hasn't filled
  // a description in yet.
  const ogImage = oh.hero;
  const excerpt =
    (oh.description && oh.description.trim()) ||
    `Open house at ${oh.address}.`;
  const fullTitle = `${oh.heading} | Open House`;
  return {
    title: fullTitle,
    description: excerpt,
    openGraph: {
      title: fullTitle,
      description: excerpt,
      type: "website",
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: excerpt,
      images: [ogImage],
    },
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  // Compact format for pills — fits two side-by-side at bottom of hero
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Pill = SignupPill (icon stored as string name; resolved to a Lucide
// component at render time on whichever side renders it).

function buildPills(oh: {
  bedrooms: number | null;
  bathrooms: number | null;
  garageSpaces: number;
  features: string[];
}): SignupPill[] {
  const pills: SignupPill[] = [];
  // Bedrooms — always shown
  pills.push({
    key: "bedrooms",
    label: `${oh.bedrooms ?? 0} ${oh.bedrooms === 1 ? "Bedroom" : "Bedrooms"}`,
    icon: "BedDouble",
  });
  // Bathrooms — always shown
  pills.push({
    key: "bathrooms",
    label: `${
      oh.bathrooms == null
        ? 0
        : Number.isInteger(oh.bathrooms)
          ? oh.bathrooms
          : oh.bathrooms.toFixed(1)
    } ${oh.bathrooms === 1 ? "Bathroom" : "Bathrooms"}`,
    icon: "Bath",
  });
  // Garage — only if > 0
  if (oh.garageSpaces > 0) {
    pills.push({
      key: "garage",
      label: `${oh.garageSpaces}-Car Garage`,
      icon: "Car",
    });
  }
  // Fill remaining slots with extra features
  for (const k of oh.features) {
    if (pills.length >= TOTAL_FLYER_PILLS) break;
    const f = OPEN_HOUSE_FEATURE_BY_KEY[k];
    if (!f) continue;
    pills.push({ key: f.key, label: f.label, icon: f.icon });
  }
  return pills;
}

export default async function OpenHousePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [oh, portrait, brokerLogo, chrome] = await Promise.all([
    getOpenHouseBySlug(slug),
    getPortrait(),
    getBrokerLogo(),
    getTenantChrome(),
  ]);
  if (!oh) notFound();
  // Primary license number shown under the realtor's name on the flyer
  // (e.g. "Realtor · VA Lic # 0225..."). Picks the first configured
  // license — usually the agent's home state — and omits the line
  // entirely if no license is set.
  const primaryLicense = chrome.licenses[0];

  const dateLabel = formatDate(oh.date);
  const pills = buildPills(oh);

  // QR code that links scanners directly to the standalone RSVP page
  const rsvpUrl = `${siteOrigin()}/open-house/${oh.slug}/rsvp`;
  const qrSrc = oh.formId ? await qrDataUrl(rsvpUrl, { size: 220 }) : "";

  return (
    <>
      {/* Print + viewport tweaks. The flyer is locked to A4 portrait
          (210 × 297 mm) and any overflow is clipped so it ALWAYS prints
          on a single page. */}
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
          html, body { margin: 0 !important; padding: 0 !important; }
          /* Hide site chrome (marketing header + footer) and any element
             marked .no-print during print so the flyer is the only thing
             that prints. */
          body > header, body > footer, nav, .no-print { display: none !important; }
          main, body main { padding: 0 !important; background: #fff !important; }
          .flyer {
            box-shadow: none !important;
            margin: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
        }
        .flyer { width: 210mm; height: 297mm; max-height: 297mm; overflow: hidden; }
        @media (max-width: 760px) {
          .flyer { width: 100%; height: auto; max-height: none; overflow: visible; }
        }
      `}</style>

      <main className="bg-cream-soft pt-28 md:pt-32 pb-12 md:pb-16 px-4 print:p-0 print:bg-white">
        <article
          className="flyer mx-auto bg-white text-ink shadow-[0_30px_80px_-30px_rgba(20,40,64,0.25)] flex flex-col overflow-hidden"
          style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
        >
          {/* HEADER BAND — broker logo (from brand identity) + OPEN HOUSE INVITATION */}
          <div className="bg-navy text-white px-7 md:px-9 py-3.5 flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brokerLogo}
              alt={chrome.brokerageOffice?.name || chrome.brokerage || "Brokerage"}
              className="h-8 md:h-9 w-auto object-contain"
            />
            <span
              className="text-[0.65rem] md:text-[0.74rem] tracking-[0.42em] uppercase opacity-95"
              style={{ fontWeight: 600 }}
            >
              Open House Invitation
            </span>
          </div>

          {/* HEADING + ADDRESS — luxury feel: thicker uppercase + decorative line */}
          <div className="px-7 md:px-9 pt-5 md:pt-6 pb-3 md:pb-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-2.5 text-navy">
              <span className="block w-6 h-px bg-navy/35" />
              <span
                className="text-[0.55rem] md:text-[0.62rem] tracking-[0.5em] uppercase"
                style={{ fontWeight: 600 }}
              >
                Now Showing
              </span>
              <span className="block w-6 h-px bg-navy/35" />
            </div>
            <h1
              className="uppercase text-ink leading-[1.04]"
              style={{
                fontWeight: 700,
                letterSpacing: "0.01em",
                fontSize: "clamp(1.6rem, 2.6vw, 2.3rem)",
              }}
            >
              {oh.heading}
            </h1>
            {/* Line 2 — structured city / state / postal (falls back to legacy
                 `address` if no structured pieces have been entered yet) */}
            <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[0.65rem] md:text-[0.7rem] tracking-[0.18em] uppercase text-ink/65">
              <MapPin size={11} strokeWidth={1.75} />
              <span style={{ fontWeight: 500 }}>
                {oh.cityLine || oh.address}
              </span>
            </div>
          </div>

          {/* HERO PHOTO with date/time pill(s) at bottom-center.
              One pill per scheduled day (max 2). */}
          <div className="relative mx-6 md:mx-8 aspect-[16/9] overflow-hidden rounded-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={oh.hero}
              alt={oh.heading}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {oh.days.some((d) => d.date || d.timeLabel) && (
              <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 max-w-[92%]">
                {oh.days.map((d, i) => {
                  const dl = formatDate(d.date);
                  if (!dl && !d.timeLabel) return null;
                  return (
                    <div
                      key={i}
                      className="bg-white/95 backdrop-blur-sm rounded-full pl-3 md:pl-3.5 pr-3.5 md:pr-4 py-1.5 md:py-2 shadow-lg border border-white/60"
                    >
                      <div className="flex items-center gap-1.5">
                        <Calendar
                          size={12}
                          className="text-navy shrink-0"
                          strokeWidth={1.75}
                        />
                        <div
                          className="text-[0.58rem] md:text-[0.66rem] uppercase tracking-[0.14em] text-navy leading-tight whitespace-nowrap"
                          style={{ fontWeight: 600 }}
                        >
                          {dl && <span>{dl}</span>}
                          {dl && d.timeLabel && (
                            <span className="text-ink/55"> · </span>
                          )}
                          {d.timeLabel && (
                            <span className="text-ink/85">{d.timeLabel}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* TWO LANDSCAPE PHOTOS BELOW — 2:1 (very wide / shallow) so the
              flyer never spills past one A4 page */}
          <div className="grid grid-cols-2 gap-3 md:gap-3.5 mx-6 md:mx-8 mt-3 md:mt-3.5">
            <div className="relative aspect-[2/1] overflow-hidden rounded-sm bg-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={oh.second}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="relative aspect-[2/1] overflow-hidden rounded-sm bg-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={oh.third}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>

          {/* FEATURE PILLS — bedrooms / bathrooms / [garage] / [extras] */}
          {pills.length > 0 && (
            <div className="px-7 md:px-9 pt-4 md:pt-5">
              <div
                className="grid gap-2 md:gap-2.5"
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
                        size={18}
                        strokeWidth={1.5}
                        className="text-navy mx-auto mb-1"
                      />
                      <p
                        className="text-[0.58rem] md:text-[0.66rem] tracking-[0.14em] uppercase text-ink/85 leading-tight"
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

          {/* DESCRIPTION — concise tagline. Extra bottom padding gives
              the flyer breathing room before the footer band. */}
          {oh.description && (
            <div className="px-8 md:px-12 pt-3 md:pt-4 pb-6 md:pb-8 text-center">
              <p
                className="text-[0.85rem] md:text-[0.92rem] text-ink/85 italic leading-[1.6]"
                style={{ fontWeight: 300 }}
              >
                {oh.description}
              </p>
            </div>
          )}

          {/* FOOTER — 3-column: realtor (left) · QR + Scan-to-RSVP (middle) · brokerage (right) */}
          <div className="mt-auto bg-navy text-white px-7 md:px-9 py-4 md:py-5">
            <div className="grid grid-cols-12 gap-4 md:gap-5 items-center">
              {/* LEFT — realtor card */}
              <div className="col-span-5 flex items-center gap-3">
                <div className="relative w-14 h-14 md:w-[60px] md:h-[60px] rounded-full overflow-hidden ring-2 ring-white/30 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={portrait.avatar}
                    alt={chrome.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[0.85rem] md:text-[0.92rem] leading-tight"
                    style={{ fontWeight: 600, letterSpacing: "0.01em" }}
                  >
                    {chrome.name}
                  </p>
                  <p
                    className="text-[0.55rem] md:text-[0.6rem] tracking-[0.22em] uppercase opacity-80 mt-0.5"
                    style={{ fontWeight: 500 }}
                  >
                    {chrome.role || "Realtor"}
                    {primaryLicense
                      ? ` · ${primaryLicense.state} Lic # ${primaryLicense.number}`
                      : ""}
                  </p>
                  <div className="mt-1.5 flex flex-col gap-0.5 text-[0.66rem] md:text-[0.72rem]">
                    {chrome.phone && (
                      <a
                        href={chrome.phoneHref || undefined}
                        className="inline-flex items-center gap-1.5 opacity-95 hover:opacity-100"
                      >
                        <Phone size={10} strokeWidth={1.75} />
                        {chrome.phone}
                      </a>
                    )}
                    {chrome.email && (
                      <a
                        href={chrome.emailHref || undefined}
                        className="inline-flex items-center gap-1.5 opacity-95 hover:opacity-100"
                      >
                        <Mail size={10} strokeWidth={1.75} />
                        {chrome.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* MIDDLE — QR code (only if there's an RSVP form) */}
              <div className="col-span-3 flex flex-col items-center text-center border-l border-r border-white/15 px-2">
                {qrSrc ? (
                  <>
                    <div className="bg-white rounded p-1.5 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrSrc}
                        alt="Scan to RSVP"
                        className="w-[68px] h-[68px] md:w-[78px] md:h-[78px] block"
                      />
                    </div>
                    <p
                      className="mt-1.5 text-[0.55rem] md:text-[0.6rem] tracking-[0.22em] uppercase opacity-90 inline-flex items-center gap-1"
                      style={{ fontWeight: 600 }}
                    >
                      <ScanLine size={10} strokeWidth={2} />
                      Scan to RSVP
                    </p>
                  </>
                ) : chrome.brokerageOffice || chrome.brokerage ? (
                  <p
                    className="text-[0.55rem] tracking-[0.22em] uppercase opacity-70"
                    style={{ fontWeight: 500 }}
                  >
                    {chrome.brokerageOffice?.name || chrome.brokerage}
                  </p>
                ) : null}
              </div>

              {/* RIGHT — brokerage card with MLS + compliance. The
                  brokerage block falls back to just the brokerage name
                  when admin hasn't filled in the office address yet. */}
              <div className="col-span-4 flex flex-col items-end gap-1.5 text-right">
                <p
                  className="text-[0.55rem] md:text-[0.6rem] tracking-[0.22em] uppercase opacity-80"
                  style={{ fontWeight: 500 }}
                >
                  Listing brokerage
                </p>
                {(chrome.brokerageOffice?.name || chrome.brokerage) && (
                  <p
                    className="text-[0.75rem] md:text-[0.82rem] leading-tight"
                    style={{ fontWeight: 600, letterSpacing: "0.01em" }}
                  >
                    {chrome.brokerageOffice?.name || chrome.brokerage}
                  </p>
                )}
                {chrome.brokerageOffice && (
                  <p className="text-[0.62rem] md:text-[0.68rem] opacity-90 leading-snug">
                    {chrome.brokerageOffice.street}
                    {chrome.brokerageOffice.cityStateZip && (
                      <>
                        <br />
                        {chrome.brokerageOffice.cityStateZip}
                      </>
                    )}
                    {chrome.brokerageOffice.phone && (
                      <>
                        <br />
                        <a
                          href={chrome.brokerageOffice.phoneHref || undefined}
                          className="opacity-95 hover:opacity-100"
                        >
                          {chrome.brokerageOffice.phone}
                        </a>
                      </>
                    )}
                  </p>
                )}
                {oh.mlsId && (
                  <p
                    className="text-[0.6rem] md:text-[0.66rem] tracking-[0.18em] uppercase opacity-90 inline-flex items-center gap-1.5"
                    style={{ fontWeight: 500 }}
                  >
                    <Hash size={10} strokeWidth={2} />
                    MLS {oh.mlsId}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/Realtor-Emblem.png"
                    alt="Realtor"
                    className="h-4 md:h-[18px] w-auto opacity-90 brightness-0 invert"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/equal-housing-opportunity-logo-1200w.png"
                    alt="Equal Housing Opportunity"
                    className="h-3.5 md:h-4 w-auto opacity-90 brightness-0 invert"
                  />
                </div>
              </div>
            </div>
          </div>
        </article>
      </main>

      {/* Hovering Print + RSVP buttons (web-only, hidden on print) */}
      <PrintFlyerActions
        formId={oh.formId ?? ""}
        formSlug={`open-house-${oh.slug}`}
        slug={oh.slug}
        heading={oh.heading}
        address={oh.address}
        heroImage={oh.hero}
        dateLabel={dateLabel}
        timeLabel={oh.timeLabel}
        pills={pills}
        hasForm={Boolean(oh.formId)}
      />
    </>
  );
}
