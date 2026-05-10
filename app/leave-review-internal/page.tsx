import type { Metadata } from "next";
import InternalFeedbackForm from "@/components/InternalFeedbackForm";

export const metadata: Metadata = {
  title: "Private feedback | Samina Bilal",
  description:
    "Private feedback channel for Samina Bilal's clients. Goes directly and only to Samina.",
  // Prevent indexing — this page should only be reachable via direct link
  // Samina shares with specific clients.
  robots: { index: false, follow: false },
};

export default function LeaveReviewInternalPage() {
  return (
    <main className="min-h-screen bg-cream">
      <section className="max-w-2xl mx-auto px-6 py-16 md:py-24">
        <p className="text-[0.72rem] tracking-[0.32em] uppercase text-ink/55 mb-3" style={{ fontWeight: 600 }}>
          Direct line
        </p>
        <h1
          className="text-3xl md:text-4xl text-ink mb-4"
          style={{ fontWeight: 600, letterSpacing: "0.005em", lineHeight: 1.2 }}
        >
          Tell Samina the unfiltered version.
        </h1>
        <p className="text-base text-ink/75 leading-relaxed mb-10 max-w-xl">
          Public reviews are great for the next person — this one&apos;s for
          her. Anything that went well, anything that didn&apos;t. Stays
          between the two of you, never on Google or her website.
        </p>

        <InternalFeedbackForm />
      </section>
    </main>
  );
}
