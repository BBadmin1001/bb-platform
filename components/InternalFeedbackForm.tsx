"use client";

/**
 * InternalFeedbackForm — companion to LeaveReviewForm but with explicit
 * "this is private" copy. Submits to `review_submissions` with kind='internal'.
 * Lands in /admin/reviews "Internal feedback" section. Never auto-publishes.
 */

import { useState, useTransition } from "react";
import { Star, Lock, Check } from "lucide-react";
import { submitInternalReview } from "@/app/admin/reviews/actions";

export default function InternalFeedbackForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [authorPhone, setAuthorPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [quote, setQuote] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!quote.trim()) {
      setError("Please share your feedback before submitting.");
      return;
    }
    startTransition(async () => {
      const res = await submitInternalReview({
        author_name: authorName,
        author_email: authorEmail,
        author_phone: authorPhone,
        rating,
        quote,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="bg-cream/60 border border-navy/20 rounded-md p-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-4">
          <Check size={22} />
        </div>
        <h2
          className="text-xl text-ink mb-2"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          Thank you.
        </h2>
        <p className="text-sm text-ink/70 max-w-md mx-auto leading-relaxed">
          Your feedback was sent privately to Samina. She reviews every note
          personally and will reach out if you&apos;ve asked for a follow-up.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Privacy badge — drives the trust signal */}
      <div
        className="rounded-md border-2 border-dashed p-4 flex items-start gap-3"
        style={{ borderColor: "rgba(20,40,64,0.18)" }}
      >
        <Lock size={18} className="text-navy mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-ink mb-1" style={{ fontWeight: 600 }}>
            This is private feedback.
          </p>
          <p className="text-xs text-ink/70 leading-relaxed">
            What you write here goes only to Samina. It is <strong>not</strong>{" "}
            posted to Google, and it does <strong>not</strong> appear on the
            public website. Use this space to be honest — including
            constructive criticism — so she can address anything that fell short.
          </p>
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.18em] text-ink/55 block mb-2" style={{ fontWeight: 600 }}>
          How did everything go?
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="text-amber-500 transition-transform hover:scale-110"
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
            >
              <Star
                size={28}
                fill={n <= rating ? "currentColor" : "none"}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.18em] text-ink/55 block mb-2" style={{ fontWeight: 600 }}>
          Your feedback
        </label>
        <textarea
          rows={6}
          required
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder="Anything that went well, anything that didn't, what could've been better — be honest, this stays between you and Samina."
          className="w-full px-4 py-3 border border-black/15 rounded bg-white text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-ink/55 block mb-2" style={{ fontWeight: 600 }}>
            Name (optional)
          </label>
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full px-4 py-3 border border-black/15 rounded bg-white text-sm focus:outline-none focus:border-navy"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-ink/55 block mb-2" style={{ fontWeight: 600 }}>
            Email (optional)
          </label>
          <input
            type="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 border border-black/15 rounded bg-white text-sm focus:outline-none focus:border-navy"
          />
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.18em] text-ink/55 block mb-2" style={{ fontWeight: 600 }}>
          Phone (optional, for follow-up)
        </label>
        <input
          type="tel"
          value={authorPhone}
          onChange={(e) => setAuthorPhone(e.target.value)}
          placeholder="(703) 123-4567"
          className="w-full px-4 py-3 border border-black/15 rounded bg-white text-sm focus:outline-none focus:border-navy"
        />
        <p className="text-[11px] text-ink/55 mt-1.5">
          Only used if Samina wants to reach out about your feedback.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <button type="submit" disabled={pending} className="btn-solid w-full sm:w-auto">
        {pending ? "Sending…" : "Send privately to Samina"}
      </button>
    </form>
  );
}
