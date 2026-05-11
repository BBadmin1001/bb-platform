"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect } from "react";

/**
 * Side drawer menu. Reads tenant-specific values via props instead of
 * importing the (legacy, Samina-hardcoded) `site` constants from
 * `lib/site.ts`. Communities children come from the tenant's actual
 * communities table — passed in by the root layout.
 */

const STATIC_NAV: Array<{ label: string; href: string }> = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Buyers", href: "/buyers" },
  { label: "Sellers", href: "/sellers" },
  { label: "Path to Ownership", href: "/path-to-ownership" },
  // "Communities" is rendered separately below so we can inject the
  // per-tenant community children pulled from the DB.
  { label: "Recent Closings", href: "/closings" },
  { label: "Trusted Partners", href: "/partners" },
  { label: "Reviews", href: "/reviews" },
  { label: "Contact", href: "/contact" },
];

export default function MenuDrawer({
  open,
  onClose,
  portraitAvatar,
  realtorName,
  role,
  brokerage,
  phone,
  phoneHref,
  email,
  emailHref,
  socialInstagram,
  socialFacebook,
  socialTiktok,
  socialLinkedin,
  customNavPages = [],
  communityChildren = [],
}: {
  open: boolean;
  onClose: () => void;
  portraitAvatar?: string;
  realtorName?: string;
  role?: string;
  brokerage?: string;
  phone?: string;
  phoneHref?: string;
  email?: string;
  emailHref?: string;
  socialInstagram?: string;
  socialFacebook?: string;
  socialTiktok?: string;
  socialLinkedin?: string;
  customNavPages?: { slug: string; title: string }[];
  /** Per-tenant community slugs — feeds the Communities submenu. */
  communityChildren?: { slug: string; name: string }[];
}) {
  const avatar = portraitAvatar || "";
  const displayName = realtorName?.trim() || "Realtor";
  const displayRole = role?.trim() || "Realtor";
  void brokerage; // reserved for future use (subline / brokerage chip)
  void socialInstagram;
  void socialFacebook;
  void socialTiktok;
  void socialLinkedin;
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-500 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full md:w-[520px] bg-navy text-white shadow-2xl transition-transform duration-700 ease-editorial ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 md:top-8 md:right-8 p-2 hover:opacity-70 transition-opacity"
          aria-label="Close menu"
        >
          <X size={28} strokeWidth={1.25} />
        </button>

        {/* Portrait */}
        <div className="pt-16 md:pt-20 pb-8 md:pb-12 flex flex-col items-center">
          {avatar && (
            <div className="relative w-24 h-24 rounded-full overflow-hidden ring-1 ring-white/35">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${avatar}')` }}
                aria-hidden="true"
              />
            </div>
          )}
          <span
            className="mt-4 text-[0.7rem] tracking-[0.4em] uppercase text-white/85 whitespace-nowrap"
            style={{ fontWeight: 300 }}
          >
            {displayName}
          </span>
          <span className="mt-1.5 text-[0.6rem] tracking-[0.4em] uppercase text-white/55">
            {displayRole}
          </span>
        </div>

        {/* Nav */}
        <nav
          className="px-10 md:px-14 pb-12 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 240px)" }}
        >
          {/* Home → Path to Ownership */}
          {STATIC_NAV.slice(0, 5).map((item) => (
            <NavRow key={item.href} item={item} onClose={onClose} />
          ))}

          {/* Communities — children come from the tenant's communities
              table (passed in as prop). When the tenant hasn't added
              any communities, we still link to the index page but skip
              the submenu. */}
          <div className="border-b border-white/10">
            <Link
              href="/communities"
              onClick={onClose}
              className="block py-5 text-2xl md:text-[1.6rem] font-light tracking-wide uppercase hover:text-white/70 transition-colors"
              style={{ fontWeight: 300, letterSpacing: "0.06em" }}
            >
              Communities
            </Link>
            {communityChildren.length > 0 && (
              <div className="pb-4 -mt-2 pl-4">
                {communityChildren.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/communities/${c.slug}`}
                    onClick={onClose}
                    className="block py-1.5 text-sm tracking-wider opacity-70 hover:opacity-100 transition-opacity"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Closings → Contact */}
          {STATIC_NAV.slice(5).map((item) => (
            <NavRow key={item.href} item={item} onClose={onClose} />
          ))}

          {/* Custom pages flagged show_in_nav by the realtor — appended
              after the standard items so the existing menu order is
              preserved. */}
          {customNavPages.map((p) => (
            <div
              key={p.slug}
              className="border-b border-white/10 last:border-0"
            >
              <Link
                href={`/p/${p.slug}`}
                onClick={onClose}
                className="block py-5 text-2xl md:text-[1.6rem] font-light tracking-wide uppercase hover:text-white/70 transition-colors"
                style={{ fontWeight: 300, letterSpacing: "0.06em" }}
              >
                {p.title}
              </Link>
            </div>
          ))}

          {/* Quick contact — only if at least one channel is set on this tenant */}
          {(phone || email) && (
            <div className="mt-10 pt-8 border-t border-white/10 text-sm space-y-2 opacity-80">
              <p className="tracking-wider uppercase text-[0.7rem] opacity-70 mb-3">
                Direct
              </p>
              {phone && (
                <a
                  href={phoneHref || undefined}
                  className="block hover:opacity-100"
                >
                  {phone}
                </a>
              )}
              {email && (
                <a
                  href={emailHref || undefined}
                  className="block hover:opacity-100"
                >
                  {email}
                </a>
              )}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}

function NavRow({
  item,
  onClose,
}: {
  item: { label: string; href: string };
  onClose: () => void;
}) {
  return (
    <div className="border-b border-white/10 last:border-0">
      <Link
        href={item.href}
        onClick={onClose}
        className="block py-5 text-2xl md:text-[1.6rem] font-light tracking-wide uppercase hover:text-white/70 transition-colors"
        style={{ fontWeight: 300, letterSpacing: "0.06em" }}
      >
        {item.label}
      </Link>
    </div>
  );
}
