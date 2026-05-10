"use client";

import { useState, useTransition } from "react";
import { X, Send, Check, Download, MapPin, Calendar } from "lucide-react";
import { submitFormPublic } from "@/app/admin/forms/actions";
import * as LucideIcons from "lucide-react";

export type SignupPill = { key: string; label: string; icon: string };

export default function SignupModal({
  formId,
  formSlug,
  slug,
  heading,
  address,
  heroImage,
  dateLabel,
  timeLabel,
  pills,
  onClose,
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
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await submitFormPublic({
        formId,
        source: formSlug,
        data: {
          name,
          email,
          phone,
          party_size: partySize,
          open_house: heading,
          address,
        },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
    });
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-md w-full max-w-md max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Hero photo at top with close button overlaid */}
        <div className="relative aspect-[16/9] bg-black/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt={heading}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2.5 right-2.5 bg-white/95 hover:bg-white rounded-full p-1.5 shadow-md"
          >
            <X size={16} className="text-ink/75" />
          </button>
          {(dateLabel || timeLabel) && (
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md border border-white/60">
              <div className="flex items-center gap-1.5">
                <Calendar size={11} className="text-navy" strokeWidth={1.75} />
                <span
                  className="text-[0.6rem] uppercase tracking-[0.14em] text-navy"
                  style={{ fontWeight: 600 }}
                >
                  {dateLabel}
                  {timeLabel && (
                    <span className="text-ink/65"> · {timeLabel}</span>
                  )}
                </span>
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
          <h3
            className="text-lg uppercase text-ink leading-[1.15] mb-2"
            style={{ fontWeight: 700, letterSpacing: "0.01em" }}
          >
            {heading}
          </h3>
          <p className="inline-flex items-center gap-1.5 text-[0.65rem] tracking-[0.16em] uppercase text-ink/60">
            <MapPin size={10} strokeWidth={1.75} />
            {address}
          </p>
        </div>

        {/* Body — form OR thank-you state */}
        <div className="px-6 pt-5 pb-2">
          {done ? (
            <div className="text-center py-2">
              <div className="inline-flex w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-4">
                <Check size={22} className="text-emerald-700" strokeWidth={1.5} />
              </div>
              <h2
                className="text-base text-ink mb-1.5"
                style={{ fontWeight: 600 }}
              >
                You&rsquo;re on the list.
              </h2>
              <p className="text-sm text-ink/70 leading-relaxed mb-5 max-w-xs mx-auto">
                A reminder goes out the day before. Save the flyer for the
                address and key details.
              </p>
              <a
                href={`/open-house/${slug}?print=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-navy text-white text-sm rounded hover:bg-navy-dark transition-colors"
                style={{ fontWeight: 500, letterSpacing: "0.04em" }}
              >
                <Download size={14} strokeWidth={1.75} />
                Download Flyer
              </a>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 text-[11px] uppercase tracking-[0.2em] text-ink/55 hover:text-ink"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label
                  className="text-[10px] uppercase tracking-[0.18em] text-ink/55 block mb-1.5"
                  style={{ fontWeight: 500 }}
                >
                  Your name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-black/15 rounded text-sm focus:outline-none focus:border-navy"
                />
              </div>
              <div>
                <label
                  className="text-[10px] uppercase tracking-[0.18em] text-ink/55 block mb-1.5"
                  style={{ fontWeight: 500 }}
                >
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 border border-black/15 rounded text-sm focus:outline-none focus:border-navy"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-[10px] uppercase tracking-[0.18em] text-ink/55 block mb-1.5"
                    style={{ fontWeight: 500 }}
                  >
                    Phone <span className="text-ink/40 normal-case">(opt.)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 border border-black/15 rounded text-sm focus:outline-none focus:border-navy"
                  />
                </div>
                <div>
                  <label
                    className="text-[10px] uppercase tracking-[0.18em] text-ink/55 block mb-1.5"
                    style={{ fontWeight: 500 }}
                  >
                    Party size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                    placeholder="1"
                    className="w-full p-2.5 border border-black/15 rounded text-sm focus:outline-none focus:border-navy"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-700">{error}</p>}

              <button
                type="submit"
                disabled={pending}
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-navy text-white text-sm rounded hover:bg-navy-dark disabled:opacity-50 transition-colors"
                style={{ fontWeight: 500, letterSpacing: "0.04em" }}
              >
                <Send size={14} className="mr-2" strokeWidth={1.75} />
                {pending ? "Sending…" : "Save my spot"}
              </button>
            </form>
          )}
        </div>

        {/* Features at bottom (hide on success state) */}
        {pills.length > 0 && !done && (
          <div className="px-6 pb-6 pt-4">
            <p
              className="text-[0.55rem] tracking-[0.3em] uppercase text-ink/55 text-center mb-2.5"
              style={{ fontWeight: 500 }}
            >
              What&rsquo;s inside
            </p>
            <div
              className="grid gap-1.5"
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
                    className="text-center bg-cream-soft/70 rounded px-1.5 py-2"
                  >
                    <Icon
                      size={14}
                      strokeWidth={1.5}
                      className="text-navy mx-auto mb-0.5"
                    />
                    <p
                      className="text-[0.5rem] tracking-[0.1em] uppercase text-ink/85 leading-tight"
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
      </div>
    </div>
  );
}
