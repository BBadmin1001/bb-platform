"use client";

import { useState, useTransition } from "react";
import { Send, Check, Download, Home } from "lucide-react";
import Link from "next/link";
import { submitFormPublic } from "@/app/admin/forms/actions";

export default function RsvpFormStandalone({
  formId,
  formSlug,
  slug,
  heading,
  address,
}: {
  formId: string;
  formSlug: string;
  slug: string;
  heading: string;
  address: string;
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

  if (done) {
    return (
      <div className="text-center">
        <div className="inline-flex w-14 h-14 rounded-full bg-emerald-50 items-center justify-center mb-5">
          <Check size={26} className="text-emerald-700" strokeWidth={1.5} />
        </div>
        <h2
          className="text-xl text-ink mb-2"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          You&rsquo;re on the list.
        </h2>
        <p className="text-sm text-ink/70 leading-relaxed mb-7 max-w-sm mx-auto">
          A reminder goes out the day before. Save the flyer to keep the
          address, time, and key details handy.
        </p>
        <a
          href={`/open-house/${slug}?print=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-navy text-white text-sm rounded hover:bg-navy-dark transition-colors mb-3"
          style={{ fontWeight: 500, letterSpacing: "0.04em" }}
        >
          <Download size={14} strokeWidth={1.75} />
          Download Flyer
        </a>
        <Link
          href={`/open-house/${slug}`}
          className="inline-flex items-center justify-center gap-1.5 text-xs uppercase tracking-[0.2em] text-ink/65 hover:text-ink"
        >
          <Home size={11} strokeWidth={1.75} />
          Back to listing
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
          className="w-full p-3 border border-black/15 rounded text-sm focus:outline-none focus:border-navy"
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
          className="w-full p-3 border border-black/15 rounded text-sm focus:outline-none focus:border-navy"
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
            className="w-full p-3 border border-black/15 rounded text-sm focus:outline-none focus:border-navy"
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
            className="w-full p-3 border border-black/15 rounded text-sm focus:outline-none focus:border-navy"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center px-7 py-3 bg-navy text-white text-sm rounded hover:bg-navy-dark disabled:opacity-50 transition-colors"
        style={{ fontWeight: 500, letterSpacing: "0.04em" }}
      >
        <Send size={14} className="mr-2" strokeWidth={1.75} />
        {pending ? "Sending…" : "Save my spot"}
      </button>
    </form>
  );
}
