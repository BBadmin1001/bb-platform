"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect } from "react";
import { nav, site } from "@/lib/site";

export default function MenuDrawer({
  open,
  onClose,
  portraitAvatar,
  realtorName,
  brokerage,
  customNavPages = [],
}: {
  open: boolean;
  onClose: () => void;
  portraitAvatar?: string;
  realtorName?: string;
  brokerage?: string;
  customNavPages?: { slug: string; title: string }[];
}) {
  const avatar = portraitAvatar || site.portrait.avatar;
  const displayName = realtorName?.trim() || "Realtor";
  void brokerage; // reserved for future use (subline / brokerage chip)
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
          <div className="relative w-24 h-24 rounded-full overflow-hidden ring-1 ring-white/35">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${avatar}')` }}
              aria-hidden="true"
            />
          </div>
          <span
            className="mt-4 text-[0.7rem] tracking-[0.4em] uppercase text-white/85 whitespace-nowrap"
            style={{ fontWeight: 300 }}
          >
            {displayName}
          </span>
          <span className="mt-1.5 text-[0.6rem] tracking-[0.4em] uppercase text-white/55">
            Realtor
          </span>
        </div>

        {/* Nav */}
        <nav className="px-10 md:px-14 pb-12 overflow-y-auto" style={{ maxHeight: "calc(100vh - 240px)" }}>
          {nav.map((item) => (
            <div key={item.href} className="border-b border-white/10 last:border-0">
              <Link
                href={item.href}
                onClick={onClose}
                className="block py-5 text-2xl md:text-[1.6rem] font-light tracking-wide uppercase hover:text-white/70 transition-colors"
                style={{ fontWeight: 300, letterSpacing: "0.06em" }}
              >
                {item.label}
              </Link>
              {item.children && (
                <div className="pb-4 -mt-2 pl-4">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onClose}
                      className="block py-1.5 text-sm tracking-wider opacity-70 hover:opacity-100 transition-opacity"
                      style={{ letterSpacing: "0.1em" }}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
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

          {/* Quick contact */}
          <div className="mt-10 pt-8 border-t border-white/10 text-sm space-y-2 opacity-80">
            <p className="tracking-wider uppercase text-[0.7rem] opacity-70 mb-3">
              Direct
            </p>
            <a href={site.phoneHref} className="block hover:opacity-100">
              {site.phone}
            </a>
            <a href={site.emailHref} className="block hover:opacity-100">
              {site.email}
            </a>
          </div>
        </nav>
      </aside>
    </>
  );
}
