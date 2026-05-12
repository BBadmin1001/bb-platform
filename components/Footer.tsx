"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Instagram, Facebook, Music2, Linkedin } from "lucide-react";
import type { TenantChrome } from "@/lib/tenant/chrome";

/**
 * Marketing footer. Reads the full tenant chrome bundle from the root
 * layout (server-rendered) so it no longer depends on the hardcoded
 * `site` constants — every field is per-tenant.
 *
 * When `hasTenant` is false (master URL / unknown host) we render only
 * the platform shell — no name, no contact, no socials — to avoid
 * leaking one tenant's data onto another's chrome.
 */
export default function Footer({
  portraitAvatar,
  chrome,
}: {
  portraitAvatar?: string;
  chrome: TenantChrome;
}) {
  const pathname = usePathname();
  const avatar = portraitAvatar || "";
  const displayName = chrome.name;
  const displayRole = chrome.role || "Realtor";
  const displayBrokerage = chrome.brokerage;

  // Hide marketing footer inside the admin panel + on standalone form
  // pages — those layouts own their own framing.
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/leave-review") ||
    pathname?.startsWith("/form/")
  )
    return null;

  const hasAnyDirect = chrome.phone || chrome.email;
  const hasAnySocial =
    chrome.social.instagram ||
    chrome.social.facebook ||
    chrome.social.tiktok ||
    chrome.social.linkedin;

  return (
    <footer className="bg-navy text-white pt-20 md:pt-24 pb-8">
      <div className="max-w-[1500px] mx-auto gutter-x grid md:grid-cols-2 gap-14 md:gap-20">
        {/* Left — realtor + brokerage */}
        <div>
          {avatar && (
            <div className="relative w-24 h-24 rounded-full overflow-hidden ring-1 ring-white/30 mb-5">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${avatar}')` }}
                aria-hidden="true"
              />
            </div>
          )}
          <p
            className="text-[0.7rem] tracking-[0.42em] uppercase text-white/85 mb-2"
            style={{ fontWeight: 300 }}
          >
            {displayName}&nbsp;· {displayRole}
          </p>
          {displayBrokerage && (
            <p
              className="text-[0.6rem] tracking-[0.32em] uppercase text-white/55 mb-10"
              style={{ fontWeight: 300 }}
            >
              {displayBrokerage}
            </p>
          )}

          {/* Direct contact — only when at least one channel is set */}
          {hasAnyDirect && (
            <>
              <p
                className="text-[0.7rem] tracking-[0.32em] uppercase text-white/55 mb-3"
                style={{ fontWeight: 400 }}
              >
                Direct
              </p>
              <p className="text-base font-light leading-[1.85]">
                {chrome.phone && (
                  <>
                    <a
                      href={chrome.phoneHref || undefined}
                      className="hover:opacity-70 transition-opacity"
                    >
                      {chrome.phone}
                    </a>
                    {chrome.email && <br />}
                  </>
                )}
                {chrome.email && (
                  <a
                    href={chrome.emailHref || undefined}
                    className="hover:opacity-70 transition-opacity"
                  >
                    {chrome.email}
                  </a>
                )}
              </p>
            </>
          )}

          {/* Brokerage office card — full address block when admin filled
              it in; otherwise just the brokerage name appears above. */}
          {chrome.brokerageOffice && (
            <div className="mt-10 pt-6 border-t border-white/10">
              <p
                className="text-[0.65rem] tracking-[0.32em] uppercase text-white/55 mb-3"
                style={{ fontWeight: 400 }}
              >
                Brokerage
              </p>
              <p
                className="text-sm font-light text-white/90 leading-[1.75] mb-2"
                style={{ fontWeight: 300 }}
              >
                {chrome.brokerageOffice.name}
              </p>
              {chrome.brokerageOffice.street && (
                <p
                  className="text-sm font-light text-white/75 leading-[1.75]"
                  style={{ fontWeight: 300 }}
                >
                  {chrome.brokerageOffice.street}
                  {chrome.brokerageOffice.cityStateZip && (
                    <>
                      <br />
                      {chrome.brokerageOffice.cityStateZip}
                    </>
                  )}
                </p>
              )}
              {chrome.brokerageOffice.phone && (
                <p className="text-sm font-light text-white/75 mt-2">
                  <a
                    href={chrome.brokerageOffice.phoneHref || undefined}
                    className="hover:opacity-70 transition-opacity"
                  >
                    {chrome.brokerageOffice.phone}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right — Social + (intentionally non-functional) newsletter
            preview. The newsletter input was previously a dead form
            (no handler, no integration) — replaced with a small
            "stay-in-touch" prompt that links to /contact until a real
            list-builder integration ships. */}
        <div>
          <p className="eyebrow-light mb-6">Stay in Touch</p>
          <h3
            className="text-2xl md:text-3xl uppercase mb-6"
            style={{ fontWeight: 200, letterSpacing: "0.06em" }}
          >
            Get in Touch
          </h3>
          <div className="mb-8 w-12 h-px bg-white/40" />
          <p className="text-base font-light leading-[1.85] text-white/85 mb-8 max-w-md">
            Have a question, or want a market read for your zip code? Reach
            out — I&apos;ll get back to you within a business day.
          </p>

          <Link
            href="/contact"
            className="inline-flex mt-2 px-9 py-3 border border-white/70 text-[0.7rem] tracking-[0.32em] uppercase font-light hover:bg-white hover:text-navy transition-all duration-500 ease-editorial"
          >
            Contact
          </Link>

          {hasAnySocial && (
            <div className="mt-12 flex items-center gap-7">
              {chrome.social.instagram && (
                <a
                  href={chrome.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="hover:opacity-70 transition-opacity"
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
                  className="hover:opacity-70 transition-opacity"
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
                  className="hover:opacity-70 transition-opacity"
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
                  className="hover:opacity-70 transition-opacity"
                >
                  <Linkedin size={22} strokeWidth={1.5} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar — single compact row */}
      <div className="max-w-[1500px] mx-auto gutter-x mt-16 pt-6 border-t border-white/10">
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-[0.6rem] tracking-[0.22em] uppercase text-white/50 leading-[1.7]"
          style={{ fontWeight: 300 }}
        >
          {/* Left — copyright + privacy link */}
          <div className="flex flex-wrap items-center gap-3 md:gap-5">
            <span>
              © {new Date().getFullYear()} {displayName}
            </span>
            <span className="opacity-60 hidden sm:inline">·</span>
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              Privacy &amp; Disclaimers
            </Link>
          </div>

          {/* Right — small compliance + platform credit */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
            {/* Tiny compliance logos — Equal Housing always renders
                because every U.S. real estate listing is subject to
                fair-housing law. The Realtor® emblem is dropped from
                the default footer; it's NAR-trademarked and showing
                it for non-NAR licensees is a brand-use violation.
                Will be re-added as an opt-in compliance toggle in a
                later phase (see Phase plan in TESTING_REPORT.md). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/equal-housing-opportunity-logo-1200w.png"
              alt="Equal Housing Opportunity"
              className="h-5 w-auto opacity-80 brightness-0 invert"
            />

            <span className="opacity-40 mx-1">|</span>

            {/* Platform credit — small logo before name */}
            <a
              href="https://brandbonjour.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 hover:text-white transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/Brand%20Bonjour%20Logo.png.png"
                alt="Brand Bonjour"
                className="h-7 md:h-8 w-auto opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <span>Powered by Brand Bonjour</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
