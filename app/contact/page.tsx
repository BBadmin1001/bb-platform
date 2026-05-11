import { Phone, Mail, MapPin, Clock, Instagram, Facebook, Music2, Linkedin } from "lucide-react";
import ShimmerText from "@/components/ShimmerText";
import ContactForm from "@/components/ContactForm";
import { getPageContent, resolveImageUrl } from "@/lib/contentLoader";
import { getTenantChrome } from "@/lib/tenant/chrome";
import { getCurrentTenant } from "@/lib/tenant/context";

export async function generateMetadata() {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    return {
      title: "Contact",
      description: "Get in touch.",
    };
  }
  const subline = tenant.brokerage
    ? `${tenant.realtor_name}, ${tenant.brokerage}`
    : tenant.realtor_name;
  return {
    title: `Contact | ${tenant.realtor_name}`,
    description: `Get in touch with ${subline}.`,
  };
}

export const dynamic = "force-dynamic";

type ContactContent = {
  hero: {
    eyebrow: string;
    titleLines: string[];
    subtitle: string;
    backgroundImage?: { image_id?: string };
  };
  formIntro: { eyebrow: string; heading: string };
  detailsIntro: { eyebrow: string; heading: string };
};

export default async function ContactPage() {
  const [c, chrome] = await Promise.all([
    getPageContent<ContactContent>("contact"),
    getTenantChrome(),
  ]);
  const heroBg = await resolveImageUrl(c.hero.backgroundImage, {
    fallback:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&auto=format&fit=crop&q=85",
    crop: "wide",
    width: 1920,
  });
  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[60vh] w-full overflow-hidden bg-navy-dark">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${heroBg}')`,
          }}
        />
        <div className="absolute inset-0 overlay-hero" />

        <div className="relative z-10 min-h-[60vh] flex flex-col items-center justify-center text-center px-6 pt-28 md:pt-32 pb-14 md:pb-16">
          <p className="eyebrow-light mb-10">{c.hero.eyebrow}</p>
          <h1
            className="heading-display text-white"
            style={{
              fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
              lineHeight: 1.04,
            }}
          >
            <ShimmerText>
              {c.hero.titleLines.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < c.hero.titleLines.length - 1 && <br />}
                </span>
              ))}
            </ShimmerText>
          </h1>
          <div className="mt-12 w-16 h-px bg-white/40" />
          <p className="mt-12 max-w-xl text-base md:text-lg font-light text-white/90 leading-[1.95] italic">
            {c.hero.subtitle}
          </p>
        </div>
      </section>

      <section className="section-y-lg gutter-x">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 md:gap-24">
          {/* Form */}
          <div>
            <p className="eyebrow mb-8">{c.formIntro.eyebrow}</p>
            <h2
              className="heading-section text-ink mb-12"
              style={{ fontSize: "clamp(1.4rem, 2.4vw, 1.75rem)" }}
            >
              {c.formIntro.heading}
            </h2>
            <div className="mb-12 w-12 h-px bg-navy/40" />

            <ContactForm realtorName={chrome.name} />
          </div>

          {/* Direct details */}
          <div>
            <p className="eyebrow mb-8">{c.detailsIntro.eyebrow}</p>
            <h2
              className="heading-section text-ink mb-12"
              style={{ fontSize: "clamp(1.4rem, 2.4vw, 1.75rem)" }}
            >
              {c.detailsIntro.heading}
            </h2>
            <div className="mb-12 w-12 h-px bg-navy/40" />

            <div className="glass-light p-7 md:p-12 space-y-10">
              {chrome.phone && (
                <Detail
                  icon={<Phone size={20} strokeWidth={1.5} />}
                  label="Phone"
                >
                  <a
                    href={chrome.phoneHref || undefined}
                    className="hover:text-navy transition-colors"
                  >
                    {chrome.phone}
                  </a>
                </Detail>
              )}
              {chrome.email && (
                <Detail
                  icon={<Mail size={20} strokeWidth={1.5} />}
                  label="Email"
                >
                  <a
                    href={chrome.emailHref || undefined}
                    className="hover:text-navy transition-colors"
                  >
                    {chrome.email}
                  </a>
                </Detail>
              )}
              {chrome.brokerageOffice &&
                (chrome.brokerageOffice.street ||
                  chrome.brokerageOffice.cityStateZip) && (
                  <Detail
                    icon={<MapPin size={20} strokeWidth={1.5} />}
                    label="Office"
                  >
                    {chrome.brokerageOffice.street}
                    {chrome.brokerageOffice.cityStateZip && (
                      <>
                        <br />
                        {chrome.brokerageOffice.cityStateZip}
                      </>
                    )}
                  </Detail>
                )}
              <Detail icon={<Clock size={20} strokeWidth={1.5} />} label="Hours">
                By appointment, 7 days a week
              </Detail>
            </div>

            {/* Social */}
            {(chrome.social.instagram ||
              chrome.social.facebook ||
              chrome.social.tiktok ||
              chrome.social.linkedin) && (
              <div className="mt-12">
                <p className="eyebrow mb-6">Follow</p>
                <div className="flex items-center gap-7 text-navy">
                  {chrome.social.instagram && (
                    <a
                      href={chrome.social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="hover:opacity-60 transition-opacity"
                    >
                      <Instagram size={22} strokeWidth={1.5} />
                    </a>
                  )}
                  {chrome.social.facebook && (
                    <a
                      href={chrome.social.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="hover:opacity-60 transition-opacity"
                    >
                      <Facebook size={22} strokeWidth={1.5} />
                    </a>
                  )}
                  {chrome.social.tiktok && (
                    <a
                      href={chrome.social.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="TikTok"
                      className="hover:opacity-60 transition-opacity"
                    >
                      <Music2 size={22} strokeWidth={1.5} />
                    </a>
                  )}
                  {chrome.social.linkedin && (
                    <a
                      href={chrome.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="LinkedIn"
                      className="hover:opacity-60 transition-opacity"
                    >
                      <Linkedin size={22} strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-6">
      <div className="text-navy flex-shrink-0 pt-1">{icon}</div>
      <div>
        <p className="eyebrow mb-2">{label}</p>
        <p className="text-base md:text-lg font-light text-ink/85 leading-[1.9]">
          {children}
        </p>
      </div>
    </div>
  );
}
