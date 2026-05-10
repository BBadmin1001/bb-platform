import Image from "next/image";
import LeaveReviewForm from "@/components/LeaveReviewForm";
import { getPortrait } from "@/lib/contentLoader";

export const metadata = {
  title: "Leave a Review | Samina Bilal",
  description:
    "Share your experience working with Samina Bilal — RE/MAX Galaxy Realtor, Northern Virginia & Maryland.",
};

export default async function LeaveReviewPage() {
  // Pull the admin-managed portrait so changing it in Brand Identity
  // automatically updates this page too. Falls back to the static
  // headshot path when nothing has been uploaded yet.
  const portrait = await getPortrait();

  return (
    <section className="min-h-screen bg-cream-soft pt-24 pb-24 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Big circular portrait — square Cloudinary crop, masked round
            via aspect-square + rounded-full. Decorative ring + soft
            glow lift it off the cream background. */}
        <div className="flex justify-center mb-8">
          <div
            className="relative w-44 h-44 md:w-56 md:h-56 rounded-full overflow-hidden ring-4 ring-white"
            style={{
              boxShadow:
                "0 30px 60px -20px rgba(20, 40, 64, 0.25), 0 0 0 1px rgba(20, 40, 64, 0.06)",
            }}
          >
            <Image
              src={portrait.avatar}
              alt="Samina Bilal"
              fill
              sizes="(min-width: 768px) 14rem, 11rem"
              className="object-cover"
              priority
            />
          </div>
        </div>

        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3 text-center"
          style={{ fontWeight: 600 }}
        >
          Thank you
        </p>
        <h1
          className="text-3xl md:text-4xl text-ink text-center mb-4"
          style={{ fontWeight: 600, letterSpacing: "0.005em", lineHeight: 1.2 }}
        >
          Leave Samina a review.
        </h1>
        <p className="text-sm md:text-base text-ink/70 text-center max-w-xl mx-auto mb-12 leading-relaxed">
          Your words help future first-time buyers and sellers know what to
          expect. Anything you share goes through Samina before it appears on
          her site — feel free to be honest.
        </p>

        <LeaveReviewForm />
      </div>
    </section>
  );
}
