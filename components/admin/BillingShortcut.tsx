"use client";

/**
 * Compact "Manage billing" link below the dashboard cards. Appears
 * only when the tenant has at least one unlocked premium feature
 * (i.e. they actually have a Stripe customer). For tenants without
 * any subs we hide it so we don't push billing UI onto setup-only
 * customers who haven't subscribed to anything yet.
 *
 * Clicking opens a Stripe Customer Portal session in a new tab —
 * the realtor can update their card, view invoices, or cancel any
 * subscription without us building bespoke UI.
 */

import { useState, useTransition } from "react";
import { CreditCard, Loader2, AlertCircle } from "lucide-react";
import { openBillingPortal } from "@/app/admin/upgrade/actions";

export default function BillingShortcut({
  unlockedCount,
}: {
  unlockedCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (unlockedCount === 0) return null;

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await openBillingPortal();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="mt-8 flex items-center justify-between flex-wrap gap-3 admin-card p-4">
      <div>
        <p
          className="text-xs uppercase tracking-[0.18em] mb-1"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Billing
        </p>
        <p
          className="text-sm"
          style={{ color: "var(--card-foreground)" }}
        >
          Update your payment method, view invoices, or cancel a
          subscription.
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={onClick}
          disabled={pending}
          className="admin-btn admin-btn-secondary inline-flex items-center"
          style={pending ? { opacity: 0.6 } : undefined}
        >
          {pending ? (
            <>
              <Loader2 size={13} className="mr-2 animate-spin" />
              Opening…
            </>
          ) : (
            <>
              <CreditCard size={13} className="mr-2" />
              Manage billing
            </>
          )}
        </button>
        {error && (
          <p
            className="text-[11px] flex items-center gap-1"
            style={{ color: "var(--destructive)" }}
          >
            <AlertCircle size={11} /> {error}
          </p>
        )}
      </div>
    </div>
  );
}
