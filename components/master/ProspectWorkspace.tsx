"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Send,
  Rocket,
  ExternalLink,
  Copy as CopyIcon,
  ArrowUpRight,
} from "lucide-react";
import {
  createQuote,
  setProspectStatus,
  provisionFromProspect,
  updateProspect,
} from "@/app/master/prospects/actions";

interface PlanOption {
  slug: string;
  name: string;
  price_cents: number;
  interval: string;
  features: string[];
}

interface ProspectShape {
  id: string;
  status: string;
  desiredDomain: string | null;
  notes: string | null;
  quotedSetupFeeCents: number | null;
  quotedPlans: string[];
  quoteNotes: string | null;
  stripePaymentLinkUrl: string | null;
  paidAt: string | null;
  tenantSlug: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  paid: "Paid",
  provisioned: "Provisioned",
  abandoned: "Abandoned",
};

export default function ProspectWorkspace({
  prospect,
  plans,
  stripeConfigured,
}: {
  prospect: ProspectShape;
  plans: PlanOption[];
  stripeConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [setupFee, setSetupFee] = useState(
    prospect.quotedSetupFeeCents != null
      ? prospect.quotedSetupFeeCents / 100
      : 800,
  );
  const [selected, setSelected] = useState<Set<string>>(
    new Set(prospect.quotedPlans),
  );
  const [quoteNotes, setQuoteNotes] = useState(prospect.quoteNotes ?? "");

  // Provisioning slug — pre-fill from desired domain or business name.
  const defaultSlug = (prospect.desiredDomain ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.[a-z]{2,}$/, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const [slug, setSlug] = useState(defaultSlug || "");

  function toggle(s: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function notify(text: string) {
    setInfo(text);
    setTimeout(() => setInfo(null), 1800);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => notify("Copied."));
  }

  function handleSetStatus(s: ProspectShape["status"]) {
    setError(null);
    startTransition(async () => {
      const res = await setProspectStatus(
        prospect.id,
        s as Parameters<typeof setProspectStatus>[1],
      );
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  function handleSaveQuote() {
    setError(null);
    startTransition(async () => {
      const res = await createQuote({
        prospectId: prospect.id,
        setupFeeCents: Math.round(setupFee * 100),
        planSlugs: Array.from(selected),
        quoteNotes,
      });
      if (!res.ok) return setError(res.error);
      notify("Quote saved.");
      router.refresh();
    });
  }

  function handleProvision() {
    setError(null);
    if (!slug) {
      setError("Pick a slug for the new tenant.");
      return;
    }
    if (
      !confirm(
        `Provision tenant "${slug}" for ${prospect.id.slice(0, 8)}? This creates the tenant row and links it back. Make sure they've actually paid.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await provisionFromProspect({
        prospectId: prospect.id,
        slug,
      });
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  const monthlyTotal = plans
    .filter((p) => selected.has(p.slug))
    .reduce((s, p) => s + p.price_cents, 0);

  return (
    <>
      {/* STATUS BAR */}
      <div className="admin-card p-4 mb-6 flex items-center gap-3 flex-wrap">
        <span
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
        >
          Status
        </span>
        <span
          className="text-xs uppercase tracking-[0.18em] px-2.5 py-1 rounded-full"
          style={{
            background: "color-mix(in srgb, var(--primary) 14%, transparent)",
            color: "var(--primary)",
            fontWeight: 700,
          }}
        >
          {STATUS_LABELS[prospect.status] ?? prospect.status}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {prospect.status === "new" && (
            <button
              type="button"
              onClick={() => handleSetStatus("contacted")}
              disabled={pending}
              className="admin-btn admin-btn-secondary"
            >
              <Send size={12} className="mr-1.5" />
              Mark contacted
            </button>
          )}
          {prospect.status !== "abandoned" && prospect.status !== "provisioned" && (
            <button
              type="button"
              onClick={() => handleSetStatus("abandoned")}
              disabled={pending}
              className="admin-btn admin-btn-secondary"
              style={{ color: "var(--destructive)" }}
            >
              Mark abandoned
            </button>
          )}
          {prospect.tenantSlug && (
            <Link
              href={`/master/tenants/${prospect.tenantSlug}`}
              className="admin-btn"
            >
              View tenant
              <ArrowUpRight size={11} className="ml-1.5" />
            </Link>
          )}
        </div>
      </div>

      {/* INTAKE NOTES */}
      {prospect.notes && (
        <section className="admin-card p-6 mb-6">
          <p
            className="text-xs uppercase tracking-[0.18em] mb-3"
            style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
          >
            Intake notes
          </p>
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--card-foreground)" }}
          >
            {prospect.notes}
          </p>
          {prospect.desiredDomain && (
            <p
              className="text-xs admin-mono mt-3"
              style={{ color: "var(--muted-foreground)" }}
            >
              Desired domain: {prospect.desiredDomain}
            </p>
          )}
        </section>
      )}

      {/* QUOTE BUILDER */}
      <section className="admin-card p-6 mb-6">
        <p
          className="text-xs uppercase tracking-[0.18em] mb-4"
          style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
        >
          Build a quote
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="admin-label">One-time setup fee (USD)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={setupFee}
              onChange={(e) => setSetupFee(parseFloat(e.target.value || "0"))}
              className="admin-input admin-mono"
            />
            <p
              className="text-[11px] mt-1.5"
              style={{ color: "var(--muted-foreground)" }}
            >
              Variable by deal — typically $600–$1,000.
            </p>
          </div>
        </div>

        <div className="mb-5">
          <p
            className="admin-label mb-3"
          >
            Monthly add-ons
          </p>
          <div className="space-y-2">
            {plans.map((p) => {
              const checked = selected.has(p.slug);
              return (
                <label
                  key={p.slug}
                  className="flex items-start gap-3 p-3 rounded cursor-pointer"
                  style={{
                    border: "1px solid var(--border)",
                    background: checked
                      ? "color-mix(in srgb, var(--primary) 6%, var(--card))"
                      : "var(--card)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(p.slug)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span
                        className="admin-mono text-[11px]"
                        style={{ color: "var(--primary)", fontWeight: 600 }}
                      >
                        ${(p.price_cents / 100).toFixed(0)}/{p.interval === "yearly" ? "yr" : "mo"}
                      </span>
                    </div>
                    {p.features.length > 0 && (
                      <p
                        className="text-[11px] mt-1 admin-mono"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {p.features.join(" · ")}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
            {plans.length === 0 && (
              <p
                className="text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                No active plans yet. Create some in{" "}
                <Link
                  href="/master/plans"
                  className="underline"
                  style={{ color: "var(--primary)" }}
                >
                  /master/plans
                </Link>
                .
              </p>
            )}
          </div>
        </div>

        <div className="mb-5">
          <label className="admin-label">Quote notes (optional)</label>
          <textarea
            rows={2}
            value={quoteNotes}
            onChange={(e) => setQuoteNotes(e.target.value)}
            placeholder="Anything you want to remember about this deal."
            className="admin-input"
          />
        </div>

        {/* Summary */}
        <div
          className="rounded-md p-4 mb-5 text-sm"
          style={{
            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
          }}
        >
          <div className="flex justify-between mb-1">
            <span style={{ color: "var(--muted-foreground)" }}>One-time</span>
            <span className="admin-mono" style={{ fontWeight: 600 }}>
              ${setupFee.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--muted-foreground)" }}>
              Monthly recurring
            </span>
            <span className="admin-mono" style={{ fontWeight: 600 }}>
              ${(monthlyTotal / 100).toFixed(2)}/mo
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSaveQuote}
            disabled={pending}
            className="admin-btn"
          >
            <Save size={13} className="mr-2" />
            Save quote
          </button>

          {!stripeConfigured && (
            <span
              className="text-[11px] inline-flex items-center gap-1.5"
              style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}
            >
              <AlertCircle size={11} />
              Stripe not configured — record kept; send the customer manually.
            </span>
          )}
        </div>
      </section>

      {/* PAYMENT LINK */}
      {prospect.stripePaymentLinkUrl && (
        <section className="admin-card p-6 mb-6">
          <p
            className="text-xs uppercase tracking-[0.18em] mb-3"
            style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
          >
            Payment link
          </p>
          <div
            className="rounded-md p-3 admin-mono text-xs flex items-center gap-2"
            style={{
              background: "color-mix(in srgb, var(--primary) 6%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
            }}
          >
            <span className="flex-1 break-all">
              {prospect.stripePaymentLinkUrl}
            </span>
            <button
              type="button"
              onClick={() => copy(prospect.stripePaymentLinkUrl!)}
              className="opacity-70 hover:opacity-100 shrink-0"
              aria-label="Copy"
            >
              <CopyIcon size={13} />
            </button>
            <a
              href={prospect.stripePaymentLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 shrink-0"
              aria-label="Open"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        </section>
      )}

      {/* PROVISION */}
      {prospect.status === "paid" && !prospect.tenantSlug && (
        <section
          className="admin-card p-6 mb-6"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 35%, transparent)",
          }}
        >
          <p
            className="text-xs uppercase tracking-[0.18em] mb-3"
            style={{ color: "var(--primary)", fontWeight: 700 }}
          >
            Ready to provision
          </p>
          <p
            className="text-sm mb-5"
            style={{ color: "var(--card-foreground)" }}
          >
            They've paid. Pick the slug and we'll create the tenant + link
            it back to this prospect.
          </p>
          <div className="flex gap-3">
            <input
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, ""),
                )
              }
              placeholder="samina"
              className="admin-input admin-mono flex-1"
            />
            <button
              type="button"
              onClick={handleProvision}
              disabled={pending || !slug}
              className="admin-btn"
            >
              <Rocket size={13} className="mr-2" />
              Provision tenant
            </button>
          </div>
        </section>
      )}

      {/* MANUAL "MARK PAID" — for testing without webhook */}
      {prospect.status === "quoted" && (
        <section className="admin-card p-6 mb-6">
          <p
            className="text-xs uppercase tracking-[0.18em] mb-3"
            style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
          >
            Manual confirmations
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--muted-foreground)" }}
          >
            Until Stripe webhooks are wired, you can mark this prospect as
            paid manually after they confirm. Then provision their tenant.
          </p>
          <button
            type="button"
            onClick={() => handleSetStatus("paid")}
            disabled={pending}
            className="admin-btn admin-btn-secondary"
          >
            <CheckCircle2 size={13} className="mr-2" />
            Mark paid
          </button>
        </section>
      )}

      {error && (
        <p
          className="text-xs"
          style={{ color: "var(--destructive)", fontWeight: 600 }}
        >
          {error}
        </p>
      )}
      {info && (
        <p
          className="text-xs"
          style={{ color: "var(--primary)", fontWeight: 600 }}
        >
          {info}
        </p>
      )}
    </>
  );
}
