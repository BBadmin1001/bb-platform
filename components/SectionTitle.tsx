import { cn } from "@/lib/cn";

export default function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = "center",
  variant = "dark",
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  variant?: "dark" | "light";
  className?: string;
}) {
  const color = variant === "light" ? "text-white" : "text-ink";
  const muted = variant === "light" ? "text-white/70" : "text-ink-muted";
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {eyebrow && (
        <p className={cn("eyebrow mb-5", muted)}>{eyebrow}</p>
      )}
      <h2
        className={cn(
          "heading-section text-section-title",
          color
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "mt-6 text-base md:text-lg font-light leading-relaxed",
            muted
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
