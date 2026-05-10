"use client";

/**
 * Client child of UpgradeBanner — the "Subscribe & unlock" button
 * that hits the startPlanCheckout server action and redirects the
 * tenant to Stripe Checkout for a monthly subscription.
 *
 * Server-rendered banner stays a server component; this stays a
 * client component because it calls navigator + window.location after
 * the action returns.
 */

import { useState, useTransition } from "react";
import { CreditCard, Loader2, Mail, AlertCircle } from "lucide-react";
import { startPlanCheckout } from "@/app/admin/upgrade/actions";

export default function UpgradeBannerCTA({
  planSlug,
  planLabel,
}: {
  planSlug: string;
  planLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubscribe() {
    setError(null);
    startTransition(async () => {
      const res = await startPlanCheckout(planSlug);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = res.url;
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onSubscribe}
        disabled={pending}
        className="admin-btn inline-flex items-center"
        style={pending ? { opacity: 0.6 } : undefined}
      >
        {pending ? (
          <>
            <Loader2 size={13} className="mr-2 animate-spin" />
            Starting checkout…
          </>
        ) : (
          <>
            <CreditCard size={13} className="mr-2" />
            Subscribe to {planLabel}
          </>
        )}
      </button>

      {/* Fallback path — old behaviour preserved for cases where
          Stripe isn't configured. Tenants on the receiving end of
          that error get a clear "email us" CTA. */}
      <a
        href="mailto:?subject=Add%20feature%20to%20my%20website"
        className="text-xs uppercase tracking-[0.18em] inline-flex items-center"
        style={{
          color: "var(--muted-foreground)",
          fontWeight: 600,
        }}
      >
        <Mail size={11} className="mr-1.5" />
        Or ask us by email
      </a>

      {error && (
        <p
          className="w-full text-xs flex items-center gap-1.5"
          style={{ color: "var(--destructive)" }}
        >
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}
