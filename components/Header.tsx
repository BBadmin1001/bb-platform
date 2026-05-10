"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Logo from "./Logo";
import MenuDrawer from "./MenuDrawer";

export default function Header({
  portraitAvatar,
  realtorName,
  brokerage,
  customNavPages = [],
}: {
  portraitAvatar?: string;
  realtorName?: string;
  brokerage?: string;
  customNavPages?: { slug: string; title: string }[];
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Hide marketing header inside the admin panel + on standalone form
  // pages. Open-house pages SHOW the header on the web view (so visitors
  // get full site nav) and rely on the @media print rules on the page
  // itself to hide it during print.
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/leave-review") ||
    pathname?.startsWith("/form/")
  )
    return null;

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 80);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // On standalone pages with a light background (open-house flyer renders
  // on cream-soft right at the top), the transparent-header + white-text
  // combo is invisible. Force a solid navy band there so the header is
  // always readable.
  const forceSolid = pathname?.startsWith("/open-house") ?? false;
  // light band → dark contents (only when scrolled on the marketing site)
  const useLight = !forceSolid && scrolled;

  const headerClass = forceSolid
    ? "bg-navy py-4 shadow-[0_1px_0_rgba(255,255,255,0.06)]"
    : scrolled
      ? "bg-cream/95 backdrop-blur-md py-4 shadow-[0_1px_0_rgba(0,0,0,0.06)]"
      : "bg-transparent py-6";

  const logoVariant: "light" | "dark" = useLight ? "dark" : "light";

  const contactClass = useLight
    ? "border-ink text-ink hover:bg-navy hover:border-navy hover:text-white"
    : "border-white/80 text-white hover:bg-white hover:text-navy";

  const menuBtnClass = useLight
    ? "text-ink hover:text-navy"
    : "text-white hover:text-white/70";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-30 transition-all duration-500 ease-editorial ${headerClass}`}
      >
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex items-center justify-between">
          <Logo
            variant={logoVariant}
            portraitAvatar={portraitAvatar}
            realtorName={realtorName}
          />

          <div className="flex items-center gap-3 md:gap-6">
            <Link
              href="/contact"
              className={`hidden md:inline-flex items-center px-6 py-3 border text-xs tracking-[0.25em] uppercase font-light transition-all duration-400 ease-editorial ${contactClass}`}
            >
              Contact
            </Link>

            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className={`p-2 transition-colors ${menuBtnClass}`}
            >
              <Menu size={24} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <MenuDrawer
        open={open}
        onClose={() => setOpen(false)}
        portraitAvatar={portraitAvatar}
        realtorName={realtorName}
        brokerage={brokerage}
        customNavPages={customNavPages}
      />
    </>
  );
}
