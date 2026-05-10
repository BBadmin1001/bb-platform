"use client";

import { useState, useTransition } from "react";
import { Star, Send, Check } from "lucide-react";
import { submitPublicReview } from "@/app/admin/reviews/actions";

export default function LeaveReviewForm() {
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [quote, setQuote] = useState("");
  const [consent, setConsent] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await submitPublicReview({
        author_name: name,
        author_email: email,
        author_phone: phone,
        rating,
        quote,
        consent_post_to_google: consent,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-md border border-emerald-200 p-10 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-5">
          <Check size={22} className="text-emerald-700" strokeWidth={1.5} />
        </div>
        <h2
          className="text-xl text-ink mb-2"
          style={{ fontWeight: 400 }}
        >
          Thank you.
        </h2>
        <p className="text-sm text-ink/70 max-w-md mx-auto leading-relaxed">
          Your review has been sent. Samina reviews each submission personally
          before it appears on her site — you&rsquo;ll see it within a few days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-md border border-black/10 p-6 md:p-10 space-y-6">
      <div>
        <label className="text-xs uppercase tracking-[0.18em] text-ink/55 block mb-3" style={{ fontWeight: 500 }}>
          How was your experience?
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(n)}
              className="text-amber-500"
            >
              <Star
                size={28}
                fill={
                  (hovered || rating) >= n ? "currentColor" : "none"
                }
                strokeWidth={1.25}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.18em] text-ink/55 block mb-2" style={{ fontWeight: 500 }}>
          Your review
        </label>
        <textarea
          required
          rows={5}
          className="w-full p-3 border border-black/15 rounded text-sm focus:outline-none focus:border-navy"
          placeholder="What was the experience like? What would you tell a friend who's about to buy or sell?"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-ink/55 block mb-2" style={{ fontWeight: 500 }}>
            Name
          </label>
          <input
            type="text"
            className="w-full p-3 border border-black/15 rounded text-sm focus:outline-none focus:border-navy"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-ink/55 block mb-2" style={{ fontWeight: 500 }}>
            Email <span className="text-ink/40 normal-case">(optional)</span>
          </label>
          <input
            type="email"
            className="w-full p-3 border border-black/15 rounded text-sm focus:outline-none focus:border-navy"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-ink/55 block mb-2" style={{ fontWeight: 500 }}>
            Phone <span className="text-ink/40 normal-case">(optional)</span>
          </label>
          <input
            type="tel"
            className="w-full p-3 border border-black/15 rounded text-sm focus:outline-none focus:border-navy"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span className="text-xs text-ink/65 leading-relaxed">
          Samina may also share my review on her Google Business profile,
          Zillow, or Realtor.com. I can withdraw consent at any time.
        </span>
      </label>

      {error && (
        <p className="text-xs text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending || !quote}
        className="inline-flex items-center justify-center px-7 py-3 bg-navy text-white text-sm rounded hover:bg-navy-dark disabled:opacity-50"
        style={{ fontWeight: 500, letterSpacing: "0.04em" }}
      >
        <Send size={14} className="mr-2" />
        {pending ? "Sending…" : "Send my review"}
      </button>
    </form>
  );
}
