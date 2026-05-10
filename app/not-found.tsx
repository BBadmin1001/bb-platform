import Link from "next/link";
import ShimmerText from "@/components/ShimmerText";

export default function NotFound() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-navy-dark">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&auto=format&fit=crop&q=85')",
        }}
      />
      <div className="absolute inset-0 overlay-hero" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-6">
        <p className="eyebrow-light mb-10">404</p>
        <h1
          className="heading-display text-white"
          style={{
            fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
            lineHeight: 1.04,
          }}
        >
          <ShimmerText>Page Not Found</ShimmerText>
        </h1>
        <div className="mt-12 w-16 h-px bg-white/40" />
        <p className="mt-12 max-w-md text-base md:text-lg font-light text-white/90 leading-[1.95] italic">
          The page you're looking for doesn't exist — but we have plenty of others worth visiting.
        </p>
        <div className="mt-14 flex flex-wrap justify-center gap-5">
          <Link href="/" className="btn-glass">
            Return Home
          </Link>
          <Link href="/communities" className="btn-outline-light">
            Explore Communities
          </Link>
        </div>
      </div>
    </section>
  );
}
