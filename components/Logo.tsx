import Link from "next/link";
import { cn } from "@/lib/cn";
import { site } from "@/lib/site";

export default function Logo({
  variant = "light",
  className,
  portraitAvatar,
  realtorName,
}: {
  variant?: "light" | "dark";
  className?: string;
  portraitAvatar?: string;
  /** Falls back to a neutral "Realtor" wordmark when no tenant is in
   *  context (e.g. master URL). On the public site this is always
   *  the active tenant's display name. */
  realtorName?: string;
}) {
  const avatar = portraitAvatar || site.portrait.avatar;
  const isLight = variant === "light";
  const color = isLight ? "text-white" : "text-ink";
  const ringColor = isLight ? "ring-white/40" : "ring-ink/15";

  const displayName = realtorName?.trim() || "Realtor";

  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-4 leading-none", color, className)}
      aria-label={`${displayName} — Home`}
    >
      {/* Circular portrait — left of wordmark */}
      <span
        className={cn(
          "relative inline-block w-11 h-11 md:w-12 md:h-12 rounded-full overflow-hidden ring-1 transition-all duration-500 ease-editorial",
          ringColor,
        )}
      >
        <span
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${avatar}')` }}
          aria-hidden="true"
        />
      </span>

      <span className="flex flex-col">
        <span
          className="text-[1.55rem] md:text-[1.8rem] font-thin tracking-[0.18em] uppercase whitespace-nowrap"
          style={{ fontWeight: 200 }}
        >
          {displayName}
        </span>
        <span
          className="text-[0.6rem] md:text-[0.68rem] font-light tracking-[0.42em] uppercase opacity-90 mt-1.5 self-end"
          style={{ fontWeight: 300 }}
        >
          Realtor
        </span>
      </span>
    </Link>
  );
}
