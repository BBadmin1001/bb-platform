"use client";

import { useEffect, useState } from "react";
import { Printer, UserPlus } from "lucide-react";
import SignupModal, { type SignupPill } from "./SignupModal";

/**
 * The hovering action bar at center-bottom of the open-house landing page.
 * - Print Flyer button → triggers window.print() (CSS @media print scopes
 *   the page down to the A4 flyer layout).
 * - RSVP button → opens the auto-generated sign-up form in a modal with
 *   hero photo + features bracketing the form.
 *
 * Hidden during print via the `.no-print` class.
 *
 * Auto-fires print() on mount when the URL contains `?print=1` so the
 * admin's "Print flyer" link and the in-app "Download Flyer" button go
 * straight to the OS print dialog.
 */
export default function PrintFlyerActions({
  formId,
  formSlug,
  slug,
  heading,
  address,
  heroImage,
  dateLabel,
  timeLabel,
  pills,
  hasForm,
}: {
  formId: string;
  formSlug: string;
  slug: string;
  heading: string;
  address: string;
  heroImage: string;
  dateLabel?: string;
  timeLabel?: string | null;
  pills: SignupPill[];
  hasForm: boolean;
}) {
  const [signupOpen, setSignupOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") === "1") {
      // Slight delay so images get a chance to render before the dialog opens
      setTimeout(() => window.print(), 800);
    }
  }, []);

  return (
    <>
      <div className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-navy text-white rounded-full shadow-2xl border border-white/10 flex items-center overflow-hidden">
        {hasForm && (
          <button
            type="button"
            onClick={() => setSignupOpen(true)}
            className="inline-flex items-center gap-2 pl-5 pr-4 py-3.5 text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-colors"
            style={{ fontWeight: 500 }}
          >
            <UserPlus size={15} strokeWidth={1.75} />
            RSVP
          </button>
        )}
        {hasForm && <span className="w-px h-6 bg-white/15" />}
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 pl-4 pr-5 py-3.5 text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-colors"
          style={{ fontWeight: 500 }}
          title="Print A4 flyer"
        >
          <Printer size={15} strokeWidth={1.75} />
          Print Flyer
        </button>
      </div>

      {signupOpen && hasForm && (
        <SignupModal
          formId={formId}
          formSlug={formSlug}
          slug={slug}
          heading={heading}
          address={address}
          heroImage={heroImage}
          dateLabel={dateLabel}
          timeLabel={timeLabel}
          pills={pills}
          onClose={() => setSignupOpen(false)}
        />
      )}
    </>
  );
}
