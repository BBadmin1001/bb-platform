"use client";

/**
 * Multi-step intake wizard — the public-facing onboarding form a
 * realtor fills after a sales rep sends them the link.
 *
 * Six steps, each saved to localStorage on every change so a
 * customer who closes the tab can pick up where they left off:
 *
 *   1. Contact            — name, email, phone
 *   2. About you          — realtor name, bio, voice direction, langs, service areas
 *   3. Business           — brokerage, MLS, licensed states, socials
 *   4. Site identity      — domain wish, brand colors, tagline
 *   5. Photos             — headshot + hero (Cloudinary unsigned upload)
 *   6. Review & pay       — confirm + redirect to Stripe (when an
 *                           agreed price was encoded into the link)
 *                           OR submit and wait for master quote
 *
 * URL params honoured:
 *   ?ref=<sales_rep_slug>  — sales rep attribution
 *   ?price=<dollars>       — pre-agreed setup fee (whole dollars)
 *
 * Both are saved on the prospect row so master can audit who sold
 * what and at what price.
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Upload,
  AlertCircle,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import {
  type IntakeData,
  type StepId,
  emptyIntake,
  INTAKE_STEPS,
} from "@/lib/intakeSchema";
import {
  cloudinaryConfigured,
  uploadToCloudinary,
} from "@/lib/cloudinary";
import { submitIntakeWizard } from "@/app/get-started/actions";

const LS_KEY = "bb-intake-draft-v1";

/** Common US state abbrs for the licensed-states picker. */
const US_STATES: { abbr: string; name: string }[] = [
  { abbr: "AL", name: "Alabama" }, { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" }, { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" }, { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" }, { abbr: "DE", name: "Delaware" },
  { abbr: "FL", name: "Florida" }, { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" }, { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" }, { abbr: "IN", name: "Indiana" },
  { abbr: "IA", name: "Iowa" }, { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" }, { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" }, { abbr: "MD", name: "Maryland" },
  { abbr: "MA", name: "Massachusetts" }, { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" }, { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" }, { abbr: "MT", name: "Montana" },
  { abbr: "NE", name: "Nebraska" }, { abbr: "NV", name: "Nevada" },
  { abbr: "NH", name: "New Hampshire" }, { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" }, { abbr: "NY", name: "New York" },
  { abbr: "NC", name: "North Carolina" }, { abbr: "ND", name: "North Dakota" },
  { abbr: "OH", name: "Ohio" }, { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" }, { abbr: "PA", name: "Pennsylvania" },
  { abbr: "RI", name: "Rhode Island" }, { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" }, { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" }, { abbr: "UT", name: "Utah" },
  { abbr: "VT", name: "Vermont" }, { abbr: "VA", name: "Virginia" },
  { abbr: "WA", name: "Washington" }, { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" }, { abbr: "WY", name: "Wyoming" },
  { abbr: "DC", name: "District of Columbia" },
];

export default function IntakeWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const salesRepRef = (params.get("ref") || "").toLowerCase().trim() || null;
  const agreedPriceParam = params.get("price");
  const agreedSetupCents =
    agreedPriceParam && /^\d+(\.\d{1,2})?$/.test(agreedPriceParam)
      ? Math.round(Number(agreedPriceParam) * 100)
      : null;

  const [stepIdx, setStepIdx] = useState(0);
  const step = INTAKE_STEPS[stepIdx];
  const [data, setData] = useState<IntakeData>(emptyIntake);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Restore draft on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      setData((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore corrupted draft
    }
  }, []);

  // Auto-save draft on every change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }, [data]);

  function patch(partial: Partial<IntakeData>) {
    setData((prev) => ({ ...prev, ...partial }));
    setError(null);
  }

  function canProceed(): boolean {
    for (const f of step.requiredFields) {
      const v = (data as Record<string, unknown>)[f];
      if (typeof v !== "string" || !v.trim()) return false;
    }
    if (step.id === "contact") {
      if (!/.+@.+\..+/.test(data.email.trim())) return false;
    }
    return true;
  }

  async function next() {
    setError(null);
    if (!canProceed()) {
      setError("Please fill in the required fields before continuing.");
      return;
    }
    if (stepIdx < INTAKE_STEPS.length - 1) {
      setStepIdx(stepIdx + 1);
      // Scroll to top of wizard so the next step starts fresh in view.
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function back() {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await submitIntakeWizard({
        intakeData: data,
        salesRepRef,
        agreedSetupCents,
      });
      if (!res.ok) {
        setError(res.error);
        setSubmitting(false);
        return;
      }
      // Clear the draft so a future visit starts fresh.
      localStorage.removeItem(LS_KEY);
      // Either redirect to Stripe (if a price was set) or to a thanks
      // page (master will follow up to set the price).
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        router.push("/onboarding/done");
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong submitting the form.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* ── Progress ───────────────────────────────────────────── */}
      <ol className="flex items-center justify-between gap-2 mb-10 flex-wrap">
        {INTAKE_STEPS.map((s, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <li
              key={s.id}
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]"
              style={{
                color: active
                  ? "#142840"
                  : done
                  ? "rgba(20,40,64,0.55)"
                  : "rgba(20,40,64,0.3)",
                fontWeight: active ? 700 : 500,
              }}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px]"
                style={{
                  background: done
                    ? "#142840"
                    : active
                    ? "rgba(20,40,64,0.12)"
                    : "rgba(20,40,64,0.05)",
                  color: done ? "white" : "inherit",
                  fontWeight: 700,
                }}
              >
                {done ? <Check size={12} strokeWidth={2.5} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </li>
          );
        })}
      </ol>

      {/* ── Step heading ───────────────────────────────────────── */}
      <div className="mb-8">
        <p
          className="text-[11px] uppercase tracking-[0.28em] mb-2"
          style={{ color: "rgba(20,40,64,0.55)" }}
        >
          Step {stepIdx + 1} of {INTAKE_STEPS.length}
        </p>
        <h2
          className="text-2xl md:text-3xl mb-2"
          style={{ fontWeight: 200, color: "#142840", letterSpacing: "0.005em" }}
        >
          {step.label}
        </h2>
        <p
          className="text-sm"
          style={{ color: "rgba(20,40,64,0.7)" }}
        >
          {step.blurb}
        </p>
      </div>

      {/* ── Step body ──────────────────────────────────────────── */}
      <div className="space-y-5 mb-10">
        {step.id === "contact" && (
          <ContactStep data={data} patch={patch} />
        )}
        {step.id === "realtor" && (
          <RealtorStep data={data} patch={patch} />
        )}
        {step.id === "business" && (
          <BusinessStep data={data} patch={patch} />
        )}
        {step.id === "site" && <SiteStep data={data} patch={patch} />}
        {step.id === "photos" && (
          <PhotosStep data={data} patch={patch} />
        )}
        {step.id === "review" && (
          <ReviewStep
            data={data}
            patch={patch}
            agreedSetupCents={agreedSetupCents}
            salesRepRef={salesRepRef}
          />
        )}
      </div>

      {/* ── Errors ─────────────────────────────────────────────── */}
      {error && (
        <div
          className="mb-6 p-4 rounded-md flex items-start gap-3 text-sm"
          style={{
            background: "rgba(220, 38, 38, 0.06)",
            border: "1px solid rgba(220, 38, 38, 0.25)",
            color: "rgb(127, 29, 29)",
          }}
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Nav ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {stepIdx > 0 ? (
          <button
            type="button"
            onClick={back}
            className="inline-flex items-center gap-2 text-sm"
            style={{ color: "rgba(20,40,64,0.7)" }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        ) : (
          <span />
        )}

        {stepIdx < INTAKE_STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            disabled={!canProceed()}
            className="inline-flex items-center gap-2 px-7 py-3 text-xs uppercase tracking-[0.22em] transition-all disabled:opacity-50"
            style={{
              background: "#142840",
              color: "white",
              fontWeight: 500,
            }}
          >
            Next <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-8 py-3 text-xs uppercase tracking-[0.22em]"
            style={{
              background: "#142840",
              color: "white",
              fontWeight: 600,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Submitting…
              </>
            ) : agreedSetupCents ? (
              <>
                Submit &amp; Pay $
                {(agreedSetupCents / 100).toFixed(0)}
                <ArrowRight size={14} />
              </>
            ) : (
              <>
                Submit
                <ArrowRight size={14} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Auto-save hint */}
      <p
        className="mt-8 text-center text-[11px]"
        style={{ color: "rgba(20,40,64,0.4)" }}
      >
        Your progress is saved automatically — close the tab and come back
        any time.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step bodies
// ─────────────────────────────────────────────────────────────────────

function ContactStep({
  data,
  patch,
}: {
  data: IntakeData;
  patch: (p: Partial<IntakeData>) => void;
}) {
  return (
    <>
      <Field label="Your full name" required>
        <input
          type="text"
          className="intake-input"
          value={data.contact_name}
          onChange={(e) => patch({ contact_name: e.target.value })}
          placeholder="Jane Smith"
        />
      </Field>
      <Field label="Email" required>
        <input
          type="email"
          className="intake-input"
          value={data.email}
          onChange={(e) => patch({ email: e.target.value })}
          placeholder="jane@brokerage.com"
        />
      </Field>
      <Field label="Phone (optional)">
        <input
          type="tel"
          className="intake-input"
          value={data.phone ?? ""}
          onChange={(e) => patch({ phone: e.target.value })}
          placeholder="(555) 123-4567"
        />
      </Field>
    </>
  );
}

function RealtorStep({
  data,
  patch,
}: {
  data: IntakeData;
  patch: (p: Partial<IntakeData>) => void;
}) {
  return (
    <>
      <Field label="Your name as it should appear on the site" required>
        <input
          type="text"
          className="intake-input"
          value={data.realtor_full_name}
          onChange={(e) => patch({ realtor_full_name: e.target.value })}
          placeholder="Jane Smith"
        />
        <p className="mt-1 text-[11px]" style={{ color: "rgba(20,40,64,0.55)" }}>
          This is what visitors see in the header, footer, and About page.
        </p>
      </Field>
      <Field label="Short bio (optional)">
        <textarea
          className="intake-input"
          rows={4}
          value={data.realtor_short_bio ?? ""}
          onChange={(e) => patch({ realtor_short_bio: e.target.value })}
          placeholder="A few sentences about who you serve, your approach, what makes you different. Don't overthink it — we'll polish."
        />
      </Field>
      <Field label="Voice / tone preferences (optional)">
        <input
          type="text"
          className="intake-input"
          value={data.voice_direction ?? ""}
          onChange={(e) => patch({ voice_direction: e.target.value })}
          placeholder="e.g. calm and professional · warm but not chatty · no jargon"
        />
      </Field>
      <TagsField
        label="Languages you speak (optional)"
        values={data.languages ?? []}
        onChange={(v) => patch({ languages: v })}
        placeholder="e.g. English, Spanish, Mandarin"
      />
      <TagsField
        label="Cities / counties you serve"
        values={data.service_areas ?? []}
        onChange={(v) => patch({ service_areas: v })}
        placeholder="e.g. Loudoun County VA, Fairfax VA, Bethesda MD"
      />
    </>
  );
}

function BusinessStep({
  data,
  patch,
}: {
  data: IntakeData;
  patch: (p: Partial<IntakeData>) => void;
}) {
  function addLicense() {
    patch({
      licensed_states: [
        ...(data.licensed_states ?? []),
        { state_abbr: "" },
      ],
    });
  }
  function updateLicense(i: number, field: "state_abbr" | "license_number", value: string) {
    const next = [...(data.licensed_states ?? [])];
    next[i] = { ...next[i], [field]: value };
    patch({ licensed_states: next });
  }
  function removeLicense(i: number) {
    const next = [...(data.licensed_states ?? [])];
    next.splice(i, 1);
    patch({ licensed_states: next });
  }

  const social = data.social ?? {};
  function setSocial(k: keyof NonNullable<IntakeData["social"]>, v: string) {
    patch({ social: { ...social, [k]: v } });
  }

  return (
    <>
      <Field label="Brokerage name" required>
        <input
          type="text"
          className="intake-input"
          value={data.brokerage_name}
          onChange={(e) => patch({ brokerage_name: e.target.value })}
          placeholder="Compass · Keller Williams · RE/MAX"
        />
      </Field>
      <Field label="Brokerage office address (optional)">
        <input
          type="text"
          className="intake-input"
          value={data.broker_office_address ?? ""}
          onChange={(e) => patch({ broker_office_address: e.target.value })}
          placeholder="123 Main St, Anytown, ST 12345"
        />
      </Field>
      <Field label="MLS ID (optional)">
        <input
          type="text"
          className="intake-input"
          value={data.mls_id ?? ""}
          onChange={(e) => patch({ mls_id: e.target.value })}
          placeholder="Your MLS member ID"
        />
      </Field>

      <Field label="Licensed states + license #s">
        <div className="space-y-2">
          {(data.licensed_states ?? []).map((ls, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                className="intake-input"
                style={{ flex: "0 0 6.5rem" }}
                value={ls.state_abbr}
                onChange={(e) => updateLicense(i, "state_abbr", e.target.value)}
              >
                <option value="">State</option>
                {US_STATES.map((s) => (
                  <option key={s.abbr} value={s.abbr}>
                    {s.abbr} — {s.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="intake-input"
                value={ls.license_number ?? ""}
                onChange={(e) => updateLicense(i, "license_number", e.target.value)}
                placeholder="License # (optional)"
              />
              <button
                type="button"
                onClick={() => removeLicense(i)}
                className="p-2"
                style={{ color: "rgba(20,40,64,0.55)" }}
                aria-label="Remove license row"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addLicense}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.22em] mt-1"
            style={{ color: "#142840", fontWeight: 600 }}
          >
            <Plus size={14} /> Add a license
          </button>
        </div>
      </Field>

      <Field label="Social handles (optional)">
        <div className="space-y-2">
          <input
            type="text"
            className="intake-input"
            placeholder="Instagram URL or handle"
            value={social.instagram ?? ""}
            onChange={(e) => setSocial("instagram", e.target.value)}
          />
          <input
            type="text"
            className="intake-input"
            placeholder="Facebook page URL"
            value={social.facebook ?? ""}
            onChange={(e) => setSocial("facebook", e.target.value)}
          />
          <input
            type="text"
            className="intake-input"
            placeholder="TikTok @handle"
            value={social.tiktok ?? ""}
            onChange={(e) => setSocial("tiktok", e.target.value)}
          />
          <input
            type="text"
            className="intake-input"
            placeholder="LinkedIn URL"
            value={social.linkedin ?? ""}
            onChange={(e) => setSocial("linkedin", e.target.value)}
          />
        </div>
      </Field>
    </>
  );
}

function SiteStep({
  data,
  patch,
}: {
  data: IntakeData;
  patch: (p: Partial<IntakeData>) => void;
}) {
  return (
    <>
      <Field label="Domain you'd like (optional)">
        <input
          type="text"
          className="intake-input"
          value={data.desired_domain ?? ""}
          onChange={(e) => patch({ desired_domain: e.target.value })}
          placeholder="janesmithrealtor.com"
        />
        <p className="mt-1 text-[11px]" style={{ color: "rgba(20,40,64,0.55)" }}>
          Don&apos;t have one yet? Skip this — we&apos;ll help you pick + register.
        </p>
      </Field>
      <Field label="Tagline (optional)">
        <input
          type="text"
          className="intake-input"
          value={data.tagline ?? ""}
          onChange={(e) => patch({ tagline: e.target.value })}
          placeholder="Make Yourself at Home · Where You Belong · etc."
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Primary brand color (optional)">
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={data.preferred_primary_color || "#142840"}
              onChange={(e) => patch({ preferred_primary_color: e.target.value })}
              style={{ width: "3rem", height: "2.6rem", border: "none", cursor: "pointer" }}
            />
            <input
              type="text"
              className="intake-input"
              value={data.preferred_primary_color ?? ""}
              onChange={(e) => patch({ preferred_primary_color: e.target.value })}
              placeholder="#142840"
            />
          </div>
        </Field>
        <Field label="Surface / cream color (optional)">
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={data.preferred_surface_color || "#F2EFEA"}
              onChange={(e) => patch({ preferred_surface_color: e.target.value })}
              style={{ width: "3rem", height: "2.6rem", border: "none", cursor: "pointer" }}
            />
            <input
              type="text"
              className="intake-input"
              value={data.preferred_surface_color ?? ""}
              onChange={(e) => patch({ preferred_surface_color: e.target.value })}
              placeholder="#F2EFEA"
            />
          </div>
        </Field>
      </div>

      <p className="text-[11px]" style={{ color: "rgba(20,40,64,0.55)" }}>
        Not sure on colors? Skip them — our designers will pick something
        that fits your brand. You can change everything later in your admin
        panel.
      </p>
    </>
  );
}

function PhotosStep({
  data,
  patch,
}: {
  data: IntakeData;
  patch: (p: Partial<IntakeData>) => void;
}) {
  const ready = cloudinaryConfigured();
  return (
    <>
      <PhotoUpload
        label="Headshot / portrait"
        url={data.portrait_url}
        onUpload={(url) => patch({ portrait_url: url })}
        onClear={() => patch({ portrait_url: undefined })}
        disabled={!ready}
        hint="Square or vertical · roughly head-and-shoulders · max 10MB."
      />
      <PhotoUpload
        label="Hero / cover photo (optional)"
        url={data.hero_url}
        onUpload={(url) => patch({ hero_url: url })}
        onClear={() => patch({ hero_url: undefined })}
        disabled={!ready}
        hint="Wide landscape · 1920×1080 or similar · max 10MB."
      />
      <PhotoUpload
        label="Brokerage logo (optional)"
        url={data.brokerage_logo_url}
        onUpload={(url) => patch({ brokerage_logo_url: url })}
        onClear={() => patch({ brokerage_logo_url: undefined })}
        disabled={!ready}
        hint="PNG with transparent background ideal."
      />
      {!ready && (
        <p
          className="text-xs p-3 rounded-md"
          style={{
            background: "rgba(220, 38, 38, 0.06)",
            border: "1px solid rgba(220, 38, 38, 0.25)",
            color: "rgb(127, 29, 29)",
          }}
        >
          Photo upload is temporarily unavailable. Please continue — you
          (or your sales rep) can email photos and we&apos;ll add them
          during the polish step.
        </p>
      )}
    </>
  );
}

function ReviewStep({
  data,
  patch,
  agreedSetupCents,
  salesRepRef,
}: {
  data: IntakeData;
  patch: (p: Partial<IntakeData>) => void;
  agreedSetupCents: number | null;
  salesRepRef: string | null;
}) {
  return (
    <div className="space-y-5">
      <p
        className="text-sm"
        style={{ color: "rgba(20,40,64,0.7)" }}
      >
        Quick check — does everything below look right? You can go back to
        any step to edit.
      </p>

      <ReviewBlock label="Contact">
        {data.contact_name} · {data.email}
        {data.phone && <> · {data.phone}</>}
      </ReviewBlock>
      <ReviewBlock label="Realtor">
        <div>{data.realtor_full_name || "—"}</div>
        {data.languages && data.languages.length > 0 && (
          <div className="text-[11px] mt-1">
            Languages: {data.languages.join(", ")}
          </div>
        )}
        {data.service_areas && data.service_areas.length > 0 && (
          <div className="text-[11px] mt-0.5">
            Areas: {data.service_areas.join(", ")}
          </div>
        )}
      </ReviewBlock>
      <ReviewBlock label="Business">
        <div>{data.brokerage_name || "—"}</div>
        {data.licensed_states && data.licensed_states.length > 0 && (
          <div className="text-[11px] mt-1">
            Licensed:{" "}
            {data.licensed_states
              .filter((l) => l.state_abbr)
              .map(
                (l) =>
                  `${l.state_abbr}${l.license_number ? ` (${l.license_number})` : ""}`,
              )
              .join(", ") || "—"}
          </div>
        )}
        {data.mls_id && <div className="text-[11px]">MLS: {data.mls_id}</div>}
      </ReviewBlock>
      <ReviewBlock label="Site">
        <div>
          {data.desired_domain ? (
            <code style={{ fontSize: "0.85rem" }}>{data.desired_domain}</code>
          ) : (
            <span style={{ color: "rgba(20,40,64,0.55)" }}>
              — (we&apos;ll help you pick a domain)
            </span>
          )}
        </div>
        {data.tagline && <div className="text-[11px] mt-1">"{data.tagline}"</div>}
      </ReviewBlock>
      <ReviewBlock label="Photos">
        <div className="flex gap-3 flex-wrap">
          {data.portrait_url && (
            <ReviewPhoto label="Portrait" url={data.portrait_url} />
          )}
          {data.hero_url && <ReviewPhoto label="Hero" url={data.hero_url} />}
          {data.brokerage_logo_url && (
            <ReviewPhoto label="Brokerage logo" url={data.brokerage_logo_url} />
          )}
          {!data.portrait_url &&
            !data.hero_url &&
            !data.brokerage_logo_url && (
              <span
                className="text-[11px]"
                style={{ color: "rgba(20,40,64,0.55)" }}
              >
                — (you can email these later)
              </span>
            )}
        </div>
      </ReviewBlock>

      <Field label="Anything else we should know? (optional)">
        <textarea
          className="intake-input"
          rows={3}
          value={data.notes ?? ""}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Specific photos to use, headlines you love, things to avoid…"
        />
      </Field>

      <div
        className="p-4 rounded-md"
        style={{
          background: "rgba(20,40,64,0.04)",
          border: "1px solid rgba(20,40,64,0.1)",
        }}
      >
        <p
          className="text-[11px] uppercase tracking-[0.22em] mb-2"
          style={{ color: "rgba(20,40,64,0.55)", fontWeight: 600 }}
        >
          Setup
        </p>
        {agreedSetupCents !== null ? (
          <p className="text-sm" style={{ color: "#142840" }}>
            <span style={{ fontWeight: 600 }}>
              ${(agreedSetupCents / 100).toFixed(2)}
            </span>{" "}
            one-time setup fee — agreed with your sales rep. After paying,
            our team builds the site, polishes everything, and emails you
            for review before going live.
          </p>
        ) : (
          <p className="text-sm" style={{ color: "#142840" }}>
            We&apos;ll review your intake and follow up with a quote within
            one business day.
          </p>
        )}
        {salesRepRef && (
          <p
            className="mt-2 text-[11px]"
            style={{ color: "rgba(20,40,64,0.55)" }}
          >
            Sent by: <span style={{ fontWeight: 600 }}>{salesRepRef}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Reusable bits
// ─────────────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block mb-1.5 text-xs uppercase tracking-[0.18em]"
        style={{ color: "rgba(20,40,64,0.65)", fontWeight: 600 }}
      >
        {label}
        {required && <span style={{ color: "#b91c1c" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function TagsField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  function commit() {
    const v = draft.trim();
    if (!v) return;
    onChange([...values, v]);
    setDraft("");
  }
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
            style={{
              background: "rgba(20,40,64,0.08)",
              color: "#142840",
            }}
          >
            {v}
            <button
              type="button"
              onClick={() =>
                onChange(values.filter((_, idx) => idx !== i))
              }
              aria-label={`Remove ${v}`}
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="intake-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={commit}
          className="px-3 text-xs uppercase tracking-[0.22em]"
          style={{
            background: "rgba(20,40,64,0.08)",
            color: "#142840",
            fontWeight: 600,
          }}
        >
          Add
        </button>
      </div>
      <p className="mt-1 text-[11px]" style={{ color: "rgba(20,40,64,0.55)" }}>
        Press Enter or comma to add each one.
      </p>
    </Field>
  );
}

function PhotoUpload({
  label,
  url,
  onUpload,
  onClear,
  disabled,
  hint,
}: {
  label: string;
  url?: string;
  onUpload: (url: string) => void;
  onClear: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await uploadToCloudinary(file);
      onUpload(res.secure_url);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Upload failed.");
    } finally {
      setBusy(false);
      e.target.value = ""; // reset so the same file can be re-picked
    }
  }

  return (
    <Field label={label}>
      {url ? (
        <div
          className="flex items-center gap-3 p-3 rounded-md"
          style={{
            background: "rgba(20,40,64,0.04)",
            border: "1px solid rgba(20,40,64,0.1)",
          }}
        >
          <img
            src={url}
            alt=""
            className="h-16 w-16 object-cover rounded"
            style={{ background: "rgba(0,0,0,0.05)" }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate" style={{ color: "#142840" }}>
              Uploaded.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] truncate block"
              style={{ color: "rgba(20,40,64,0.55)" }}
            >
              {url}
            </a>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "rgba(20,40,64,0.55)", fontWeight: 600 }}
          >
            Replace
          </button>
        </div>
      ) : (
        <label
          className="flex items-center gap-3 p-4 rounded-md cursor-pointer"
          style={{
            background: disabled
              ? "rgba(20,40,64,0.02)"
              : "rgba(20,40,64,0.04)",
            border: "1px dashed rgba(20,40,64,0.25)",
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {busy ? (
            <Loader2
              size={20}
              className="animate-spin shrink-0"
              style={{ color: "rgba(20,40,64,0.55)" }}
            />
          ) : (
            <Upload size={20} style={{ color: "rgba(20,40,64,0.55)" }} />
          )}
          <div className="flex-1 text-sm" style={{ color: "#142840" }}>
            {busy
              ? "Uploading…"
              : disabled
              ? "Upload unavailable"
              : "Click to upload"}
          </div>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={onChange}
            disabled={disabled || busy}
          />
        </label>
      )}
      {hint && (
        <p
          className="mt-1 text-[11px]"
          style={{ color: "rgba(20,40,64,0.55)" }}
        >
          {hint}
        </p>
      )}
      {err && (
        <p
          className="mt-1 text-[11px]"
          style={{ color: "rgb(127, 29, 29)" }}
        >
          {err}
        </p>
      )}
    </Field>
  );
}

function ReviewBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="p-3 rounded-md"
      style={{
        background: "rgba(20,40,64,0.03)",
        border: "1px solid rgba(20,40,64,0.08)",
      }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.22em] mb-1.5"
        style={{ color: "rgba(20,40,64,0.55)", fontWeight: 700 }}
      >
        {label}
      </p>
      <div className="text-sm" style={{ color: "#142840" }}>
        {children}
      </div>
    </div>
  );
}

function ReviewPhoto({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <img
        src={url}
        alt=""
        className="h-16 w-16 object-cover rounded"
        style={{ background: "rgba(0,0,0,0.05)" }}
      />
      <span
        className="text-[10px]"
        style={{ color: "rgba(20,40,64,0.55)" }}
      >
        {label}
      </span>
    </div>
  );
}
