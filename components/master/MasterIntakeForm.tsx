"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  AlertCircle,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  saveTenantIntake,
  type SaveIntakeInput,
} from "@/app/master/tenants/actions";
import type { IntakeData } from "@/lib/intakeSchema";

/**
 * Master-side intake form. Fills the same `IntakeData` shape the
 * public onboarding wizard collects, but as a single long form
 * instead of a 6-step wizard — master operators are internal users
 * who can scroll. We focus on the fields AI Polish actually consumes
 * (bio, voice direction, service areas, languages, tagline, notes);
 * fields like photos / brand colors / Cloudinary URLs are owned by
 * the brand-identity admin tools and aren't useful for polish.
 *
 * Save → upserts `tenants.intake_data`. Optional "Save + run polish"
 * button triggers AI Polish in the same transition so master can
 * one-click set up a fresh tenant.
 */

const US_STATES: ReadonlyArray<{ abbr: string; name: string }> = [
  { abbr: "AL", name: "Alabama" }, { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" }, { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" }, { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" }, { abbr: "DE", name: "Delaware" },
  { abbr: "DC", name: "District of Columbia" }, { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" }, { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" }, { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" }, { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" }, { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" }, { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" }, { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" }, { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" }, { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" }, { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" }, { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" }, { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" }, { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" }, { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" }, { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" }, { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" }, { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" }, { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" }, { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" }, { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" }, { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
];

type FormState = {
  contact_name: string;
  email: string;
  phone: string;
  realtor_full_name: string;
  realtor_short_bio: string;
  voice_direction: string;
  languages: string; // comma-separated for the form, parsed on save
  service_areas: string; // comma-separated
  brokerage_name: string;
  broker_office_address: string;
  mls_id: string;
  licensed_states: string; // CSV of "VA[:lic#]" entries
  tagline: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  linkedin: string;
  notes: string;
};

function intakeToForm(initial: IntakeData | null | undefined): FormState {
  const i = initial ?? ({} as Partial<IntakeData>);
  return {
    contact_name: i.contact_name ?? "",
    email: i.email ?? "",
    phone: i.phone ?? "",
    realtor_full_name: i.realtor_full_name ?? "",
    realtor_short_bio: i.realtor_short_bio ?? "",
    voice_direction: i.voice_direction ?? "",
    languages: (i.languages ?? []).join(", "),
    service_areas: (i.service_areas ?? []).join(", "),
    brokerage_name: i.brokerage_name ?? "",
    broker_office_address: i.broker_office_address ?? "",
    mls_id: i.mls_id ?? "",
    licensed_states: (i.licensed_states ?? [])
      .map((l) =>
        l.license_number ? `${l.state_abbr}:${l.license_number}` : l.state_abbr,
      )
      .join(", "),
    tagline: i.tagline ?? "",
    instagram: i.social?.instagram ?? "",
    facebook: i.social?.facebook ?? "",
    tiktok: i.social?.tiktok ?? "",
    linkedin: i.social?.linkedin ?? "",
    notes: i.notes ?? "",
  };
}

function formToIntake(f: FormState): SaveIntakeInput {
  const langs = f.languages
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const areas = f.service_areas
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const states = f.licensed_states
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const [abbr, lic] = token.split(":").map((p) => p.trim());
      return lic
        ? { state_abbr: (abbr ?? "").toUpperCase(), license_number: lic }
        : { state_abbr: (abbr ?? "").toUpperCase() };
    });
  return {
    contact_name: f.contact_name.trim(),
    email: f.email.trim(),
    phone: f.phone.trim() || undefined,
    realtor_full_name: f.realtor_full_name.trim(),
    realtor_short_bio: f.realtor_short_bio.trim() || undefined,
    voice_direction: f.voice_direction.trim() || undefined,
    languages: langs.length ? langs : undefined,
    service_areas: areas.length ? areas : undefined,
    brokerage_name: f.brokerage_name.trim(),
    broker_office_address: f.broker_office_address.trim() || undefined,
    mls_id: f.mls_id.trim() || undefined,
    licensed_states: states,
    tagline: f.tagline.trim() || undefined,
    social: {
      instagram: f.instagram.trim() || undefined,
      facebook: f.facebook.trim() || undefined,
      tiktok: f.tiktok.trim() || undefined,
      linkedin: f.linkedin.trim() || undefined,
    },
    notes: f.notes.trim() || undefined,
  };
}

export default function MasterIntakeForm({
  slug,
  initial,
}: {
  slug: string;
  initial: IntakeData | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState<FormState>(intakeToForm(initial));
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function set<K extends keyof FormState>(k: K, val: FormState[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  function save(opts: { thenPolish: boolean }) {
    setError(null);
    setSavedAt(null);
    const payload = formToIntake(v);
    if (!payload.realtor_full_name || !payload.brokerage_name) {
      setError("Realtor full name and brokerage are required.");
      return;
    }
    startTransition(async () => {
      const res = await saveTenantIntake(slug, payload, {
        thenPolish: opts.thenPolish,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
      // If we just polished, the master detail page shows the result
      // panel — bounce there so the user sees it.
      if (opts.thenPolish) {
        router.push(`/master/tenants/${slug}?polished=1`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save({ thenPolish: false });
      }}
      className="space-y-8"
    >
      {/* CONTACT ───────────────────────────────────────────────── */}
      <Section
        title="Contact"
        blurb="How you reach the realtor for follow-ups."
      >
        <Row>
          <Field label="Contact name" required>
            <input
              type="text"
              className="admin-input"
              value={v.contact_name}
              onChange={(e) => set("contact_name", e.target.value)}
              placeholder="Samina Bilal"
            />
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              className="admin-input"
              value={v.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="samina@example.com"
            />
          </Field>
        </Row>
        <Field label="Phone">
          <input
            type="tel"
            className="admin-input"
            value={v.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(703) 555-0100"
          />
        </Field>
      </Section>

      {/* IDENTITY + AI POLISH SIGNAL ─────────────────────────────── */}
      <Section
        title="About the realtor"
        blurb="The bio + voice direction here are the primary AI Polish inputs — fuller answers produce better copy."
      >
        <Field label="Realtor's full name" required>
          <input
            type="text"
            className="admin-input"
            value={v.realtor_full_name}
            onChange={(e) => set("realtor_full_name", e.target.value)}
            placeholder="Samina Bilal"
          />
        </Field>
        <Field
          label="Bio (the realtor's own words)"
          blurb="A paragraph or two about who they are, who they help, what makes their approach different. AI Polish uses this as primary source material — don't paraphrase, paste what the realtor wrote."
        >
          <textarea
            className="admin-input"
            rows={5}
            value={v.realtor_short_bio}
            onChange={(e) => set("realtor_short_bio", e.target.value)}
            placeholder="I'm a Realtor with RE/MAX Galaxy in Northern Virginia…"
          />
        </Field>
        <Field
          label="Voice direction"
          blurb={`Tone preferences in plain English: "calm, no jargon", "playful but professional", "Spanish phrases scattered throughout", "talks like a coach". Feeds AI Polish.`}
        >
          <textarea
            className="admin-input"
            rows={3}
            value={v.voice_direction}
            onChange={(e) => set("voice_direction", e.target.value)}
            placeholder="Calm, transparent, never boastful. Speaks plainly about money."
          />
        </Field>
        <Row>
          <Field
            label="Languages"
            blurb="Comma-separated."
          >
            <input
              type="text"
              className="admin-input"
              value={v.languages}
              onChange={(e) => set("languages", e.target.value)}
              placeholder="English, Urdu, Hindi"
            />
          </Field>
          <Field
            label="Service areas"
            blurb="Cities, counties, or metros — comma-separated."
          >
            <input
              type="text"
              className="admin-input"
              value={v.service_areas}
              onChange={(e) => set("service_areas", e.target.value)}
              placeholder="Northern Virginia, Loudoun County, Fairfax County"
            />
          </Field>
        </Row>
        <Field
          label="Tagline"
          blurb="One short line they want associated with the brand."
        >
          <input
            type="text"
            className="admin-input"
            value={v.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder="Make Yourself at Home"
          />
        </Field>
      </Section>

      {/* BUSINESS ───────────────────────────────────────────────── */}
      <Section
        title="Business"
        blurb="Brokerage, license, MLS. Drops into footer + credentials."
      >
        <Field label="Brokerage name" required>
          <input
            type="text"
            className="admin-input"
            value={v.brokerage_name}
            onChange={(e) => set("brokerage_name", e.target.value)}
            placeholder="RE/MAX Galaxy"
          />
        </Field>
        <Field
          label="Brokerage office address"
          blurb="Street, city, state, zip — used in the footer when present."
        >
          <input
            type="text"
            className="admin-input"
            value={v.broker_office_address}
            onChange={(e) => set("broker_office_address", e.target.value)}
            placeholder="123 Main St, Woodbridge, VA 22192"
          />
        </Field>
        <Row>
          <Field label="MLS ID">
            <input
              type="text"
              className="admin-input admin-mono"
              value={v.mls_id}
              onChange={(e) => set("mls_id", e.target.value)}
              placeholder="123456"
            />
          </Field>
          <Field
            label="Licensed states"
            blurb={'Comma-separated. Optional license # after a colon: "VA:0225001234, MD"'}
          >
            <input
              type="text"
              className="admin-input"
              value={v.licensed_states}
              onChange={(e) => set("licensed_states", e.target.value)}
              placeholder="VA, MD"
            />
          </Field>
        </Row>
        <p
          className="text-[10px] uppercase tracking-[0.18em] mt-2"
          style={{ color: "var(--muted-foreground)" }}
        >
          Common abbreviations:{" "}
          <span style={{ textTransform: "none" }}>
            {US_STATES.slice(0, 8)
              .map((s) => s.abbr)
              .join(" · ")}
            {" · …"}
          </span>
        </p>
      </Section>

      {/* SOCIAL ─────────────────────────────────────────────────── */}
      <Section title="Social (optional)" blurb="Used in the footer icon row.">
        <Row>
          <Field label="Instagram">
            <input
              type="url"
              className="admin-input"
              value={v.instagram}
              onChange={(e) => set("instagram", e.target.value)}
              placeholder="https://instagram.com/…"
            />
          </Field>
          <Field label="Facebook">
            <input
              type="url"
              className="admin-input"
              value={v.facebook}
              onChange={(e) => set("facebook", e.target.value)}
              placeholder="https://facebook.com/…"
            />
          </Field>
        </Row>
        <Row>
          <Field label="TikTok">
            <input
              type="url"
              className="admin-input"
              value={v.tiktok}
              onChange={(e) => set("tiktok", e.target.value)}
              placeholder="https://tiktok.com/@…"
            />
          </Field>
          <Field label="LinkedIn">
            <input
              type="url"
              className="admin-input"
              value={v.linkedin}
              onChange={(e) => set("linkedin", e.target.value)}
              placeholder="https://linkedin.com/in/…"
            />
          </Field>
        </Row>
      </Section>

      {/* NOTES ──────────────────────────────────────────────────── */}
      <Section
        title="Notes for the polish team"
        blurb="Anything else worth knowing. Quirks, preferences, things to avoid. AI Polish reads this too."
      >
        <Field label="Notes">
          <textarea
            className="admin-input"
            rows={4}
            value={v.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </Section>

      {/* ACTIONS ────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-3 pt-2"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <button
          type="submit"
          className="admin-btn admin-btn-secondary inline-flex items-center"
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 size={13} className="mr-2 animate-spin" />
              Saving&hellip;
            </>
          ) : (
            <>
              <Save size={13} className="mr-2" />
              Save intake
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => save({ thenPolish: true })}
          className="admin-btn inline-flex items-center"
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 size={13} className="mr-2 animate-spin" />
              Saving + polishing&hellip;
            </>
          ) : (
            <>
              <Sparkles size={13} className="mr-2" />
              Save + run AI polish
            </>
          )}
        </button>
        {savedAt && !pending && (
          <span
            className="inline-flex items-center gap-1 text-xs"
            style={{ color: "var(--primary)" }}
          >
            <Check size={12} /> Saved
          </span>
        )}
      </div>

      {error && (
        <div
          className="p-3 rounded-md text-sm flex items-start gap-2"
          style={{
            background:
              "color-mix(in srgb, var(--destructive) 6%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--destructive) 18%, transparent)",
            color: "var(--destructive)",
          }}
        >
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}

function Section({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-card p-6 space-y-4">
      <div>
        <h2
          className="text-base"
          style={{ color: "var(--card-foreground)", fontWeight: 600 }}
        >
          {title}
        </h2>
        {blurb && (
          <p
            className="text-[12px] mt-1"
            style={{ color: "var(--muted-foreground)", lineHeight: 1.6 }}
          >
            {blurb}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label,
  blurb,
  required,
  children,
}: {
  label: string;
  blurb?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="admin-label flex items-center gap-1">
        {label}
        {required && (
          <span style={{ color: "var(--destructive)" }} aria-label="required">
            *
          </span>
        )}
      </span>
      {children}
      {blurb && (
        <span
          className="block mt-1 text-[11px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          {blurb}
        </span>
      )}
    </label>
  );
}
