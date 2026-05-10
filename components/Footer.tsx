"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Instagram, Facebook, Music2 } from "lucide-react";
import { site } from "@/lib/site";

export default function Footer({
  portraitAvatar,
}: {
  portraitAvatar?: string;
}) {
  const pathname = usePathname();
  const bo = site.brokerageOffice;
  const avatar = portraitAvatar || site.portrait.avatar;

  // Hide marketing footer inside the admin panel + on standalone form
  // pages. Open-house pages SHOW the footer on the web view; the
  // @media print rules on /open-house/[slug] hide it during print.
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/leave-review") ||
    pathname?.startsWith("/form/")
  )
    return null;

  return (
    <footer className="bg-navy text-white pt-20 md:pt-24 pb-8">
      <div className="max-w-[1500px] mx-auto gutter-x grid md:grid-cols-2 gap-14 md:gap-20">
        {/* Left — Samina + brokerage */}
        <div>
          <div className="relative w-24 h-24 rounded-full overflow-hidden ring-1 ring-white/30 mb-5">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${avatar}')` }}
              aria-hidden="true"
            />
          </div>
          <p
            className="text-[0.7rem] tracking-[0.42em] uppercase text-white/85 mb-2"
            style={{ fontWeight: 300 }}
          >
            Samina&nbsp;Bilal · Realtor
          </p>
          <p
            className="text-[0.6rem] tracking-[0.32em] uppercase text-white/55 mb-10"
            style={{ fontWeight: 300 }}
          >
            Licensed in Virginia &amp; Maryland
          </p>

          {/* Direct contact */}
          <p
            className="text-[0.7rem] tracking-[0.32em] uppercase text-white/55 mb-3"
            style={{ fontWeight: 400 }}
          >
            Direct
          </p>
          <p className="text-base font-light leading-[1.85]">
            <a href={site.phoneHref} className="hover:opacity-70 transition-opacity">
              {site.phone}
            </a>
            <br />
            <a href={site.emailHref} className="hover:opacity-70 transition-opacity">
              {site.email}
            </a>
          </p>

          {/* Brokerage card — info + large RE/MAX Galaxy logo at the end */}
          <div className="mt-10 pt-6 border-t border-white/10">
            <p
              className="text-[0.65rem] tracking-[0.32em] uppercase text-white/55 mb-3"
              style={{ fontWeight: 400 }}
            >
              Brokerage Office
            </p>
            <p
              className="text-sm font-light text-white/90 leading-[1.75] mb-2"
              style={{ fontWeight: 300 }}
            >
              {bo.name}
              <br />
              {bo.street}
              <br />
              {bo.cityStateZip}
            </p>
            <a
              href={bo.phoneHref}
              className="text-sm font-light text-white/85 hover:opacity-70 transition-opacity"
            >
              {bo.phone}
            </a>

            {/* RE/MAX Galaxy logo — displayed at the END of the brokerage info */}
            <div className="mt-7">
              <img
                src="/images/Remax%20Galaxy.png"
                alt="RE/MAX Galaxy"
                className="h-20 md:h-24 w-auto object-contain"
              />
            </div>
          </div>
        </div>

        {/* Right — Newsletter */}
        <div>
          <p className="eyebrow-light mb-6">Stay in Touch</p>
          <h3
            className="text-2xl md:text-3xl uppercase mb-6"
            style={{ fontWeight: 200, letterSpacing: "0.06em" }}
          >
            Newsletter
          </h3>
          <div className="mb-8 w-12 h-px bg-white/40" />
          <p className="text-base font-light leading-[1.85] text-white/85 mb-8 max-w-md">
            Quarterly market reports for Northern Virginia &amp; Maryland. New
            listings, sold prices, and what it means for your zip code. No spam,
            ever.
          </p>

          <form className="max-w-md">
            <input
              type="email"
              placeholder="Email Address"
              className="w-full bg-transparent border-b border-white/35 py-3 text-base font-light placeholder:text-white/45 focus:outline-none focus:border-white transition-colors"
            />
            <button
              type="submit"
              className="mt-7 px-9 py-3 border border-white/70 text-[0.7rem] tracking-[0.32em] uppercase font-light hover:bg-white hover:text-navy transition-all duration-500 ease-editorial"
            >
              Subscribe
            </button>
          </form>

          <div className="mt-12 flex items-center gap-7">
            <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:opacity-70 transition-opacity">
              <Instagram size={22} strokeWidth={1.5} />
            </a>
            <a href={site.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:opacity-70 transition-opacity">
              <Facebook size={22} strokeWidth={1.5} />
            </a>
            <a href={site.social.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="hover:opacity-70 transition-opacity">
              <Music2 size={22} strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar — single compact row */}
      <div className="max-w-[1500px] mx-auto gutter-x mt-16 pt-6 border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-[0.6rem] tracking-[0.22em] uppercase text-white/50 leading-[1.7]"
          style={{ fontWeight: 300 }}
        >
          {/* Left — copyright + privacy link */}
          <div className="flex flex-wrap items-center gap-3 md:gap-5">
            <span>
              © {new Date().getFullYear()} Samina Bilal · Licensed in VA &amp; MD
            </span>
            <span className="opacity-60 hidden sm:inline">·</span>
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              Privacy &amp; Disclaimers
            </Link>
          </div>

          {/* Right — small compliance + design credit */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
            {/* Tiny compliance logos — white */}
            <img
              src="/images/Realtor-Emblem.png"
              alt="Realtor"
              className="h-6 w-auto opacity-80 brightness-0 invert"
            />
            <img
              src="/images/equal-housing-opportunity-logo-1200w.png"
              alt="Equal Housing Opportunity"
              className="h-5 w-auto opacity-80 brightness-0 invert"
            />

            <span className="opacity-40 mx-1">|</span>

            {/* Brand Bonjour credit — small logo before name */}
            <a
              href="https://brandbonjour.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 hover:text-white transition-colors"
            >
              <img
                src="/images/Brand%20Bonjour%20Logo.png.png"
                alt="Brand Bonjour"
                className="h-7 md:h-8 w-auto opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <span>Copyrights reserved by Brand Bonjour</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
