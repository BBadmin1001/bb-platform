"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Save,
  AlertCircle,
  Check,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  saveTenantIntake,
  type SaveIntakeInput,
} from "@/app/master/tenants/actions";
import type { IntakeData } from "@/lib/intakeSchema";
import {
  cloudinaryConfigured,
  uploadToCloudinary,
} from "@/lib/cloudinary";

/**
 * Master-side intake form. One long form (no multi-step wizard,
 * master is internal) covering every field the public onboarding
 * wizard collects PLUS photo uploads and brand color pickers — so a
 * hand-created tenant can have its site fully personalized in one
 * sitting before AI Polish runs.
 *
 * What lands where on save (`saveTenantIntake` action):
 *
 *   - intake_data jsonb     ← every field from this form (AI Polish reads it)
 *   - tenants row fields    ← realtor_name, brokerage, state_abbr, contact_*
 *   - media rows            ← one per uploaded photo
 *   - content_blocks rows:
 *       brand.portrait        — { portrait: { image_id } }
 *       brand.brokerLogo      — { logo: { image_id } }
 *       brand.favicon         — { icon: { image_id } }
 *       brand.featuredImage   — { image: { image_id } }
 *       brand.theme           — { primary, surface, primaryGradient, surfaceGradient }
 *       home.hero             — { ...existing, backgroundImage: { image_id } }
 *
 * Optional "Save + run polish" button chains AI Polish in the same
 * transition for the canonical "one-click new tenant" flow.
 */

type ImageRef = {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
} | null;

type FormState = {
  // contact
  contact_name: string;
  email: string;
  phone: string;
  // identity
  realtor_full_name: string;
  realtor_short_bio: string;
  voice_direction: string;
  languages: string;
  service_areas: string;
  tagline: string;
  // business
  brokerage_name: string;
  broker_office_address: string;
  mls_id: string;
  licensed_states: string;
  // social
  instagram: string;
  facebook: string;
  tiktok: string;
  linkedin: string;
  youtube: string;
  // photos
  portrait: ImageRef;
  hero: ImageRef;
  brokerage_logo: ImageRef;
  favicon: ImageRef;
  featured_image: ImageRef;
  // brand colors
  primary_color: string;
  surface_color: string;
  // misc
  desired_domain: string;
  notes: string;
};

function intakeToForm(
  initial: (IntakeData & Record<string, unknown>) | null | undefined,
): FormState {
  const i = (initial ?? {}) as IntakeData & Record<string, unknown>;
  const photo = (key: string): ImageRef => {
    const url = (i as Record<string, unknown>)[key + "_url"];
    const pid = (i as Record<string, unknown>)[key + "_public_id"];
    if (typeof url === "string" && url && typeof pid === "string" && pid) {
      return { url, publicId: pid };
    }
    if (typeof url === "string" && url) {
      // Migrated public-wizard data that only stored URL — keep the URL,
      // surface as un-managed (we won't be able to create a media row).
      return { url, publicId: "" };
    }
    return null;
  };
  return {
    contact_name: i.contact_name ?? "",
    email: i.email ?? "",
    phone: i.phone ?? "",
    realtor_full_name: i.realtor_full_name ?? "",
    realtor_short_bio: i.realtor_short_bio ?? "",
    voice_direction: i.voice_direction ?? "",
    languages: (i.languages ?? []).join(", "),
    service_areas: (i.service_areas ?? []).join(", "),
    tagline: i.tagline ?? "",
    brokerage_name: i.brokerage_name ?? "",
    broker_office_address: i.broker_office_address ?? "",
    mls_id: i.mls_id ?? "",
    licensed_states: (i.licensed_states ?? [])
      .map((l) =>
        l.license_number ? `${l.state_abbr}:${l.license_number}` : l.state_abbr,
      )
      .join(", "),
    instagram: i.social?.instagram ?? "",
    facebook: i.social?.facebook ?? "",
    tiktok: i.social?.tiktok ?? "",
    linkedin: i.social?.linkedin ?? "",
    youtube: i.social?.youtube ?? "",
    portrait: photo("portrait"),
    hero: photo("hero"),
    brokerage_logo: photo("brokerage_logo"),
    favicon: photo("favicon"),
    featured_image: photo("featured_image"),
    primary_color: i.preferred_primary_color ?? "",
    surface_color: i.preferred_surface_color ?? "",
    desired_domain: i.desired_domain ?? "",
    notes: i.notes ?? "",
  };
}

function formToIntake(f: FormState): SaveIntakeInput {
  const langs = f.languages.split(",").map((s) => s.trim()).filter(Boolean);
  const areas = f.service_areas.split(",").map((s) => s.trim()).filter(Boolean);
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
  // Store photo URL + publicId alongside each other. The
  // saveTenantIntake action consumes the publicId fields to mint
  // media rows + content_blocks. Existing IntakeData consumers
  // (public wizard, AI Polish) only need the `*_url` fields, which
  // are kept exactly compatible.
  const out: SaveIntakeInput & Record<string, unknown> = {
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
      youtube: f.youtube.trim() || undefined,
    },
    portrait_url: f.portrait?.url,
    hero_url: f.hero?.url,
    brokerage_logo_url: f.brokerage_logo?.url,
    preferred_primary_color: f.primary_color.trim() || undefined,
    preferred_surface_color: f.surface_color.trim() || undefined,
    desired_domain: f.desired_domain.trim() || undefined,
    notes: f.notes.trim() || undefined,
  };
  // Extra fields outside the IntakeData type — picked up by
  // saveTenantIntake so we can wire photos to media + content_blocks.
  out.portrait_public_id = f.portrait?.publicId;
  out.hero_public_id = f.hero?.publicId;
  out.brokerage_logo_public_id = f.brokerage_logo?.publicId;
  out.favicon_url = f.favicon?.url;
  out.favicon_public_id = f.favicon?.publicId;
  out.featured_image_url = f.featured_image?.url;
  out.featured_image_public_id = f.featured_image?.publicId;
  return out;
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
  const [v, setV] = useState<FormState>(
    intakeToForm(initial as IntakeData & Record<string, unknown>),
  );
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
      if (opts.thenPolish) {
        router.push(`/master/tenants/${slug}?polished=1`);
      } else {
        router.refresh();
      }
    });
  }

  const cloudOk = cloudinaryConfigured();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save({ thenPolish: false });
      }}
      className="space-y-8"
    >
      {/* CONTACT ───────────────────────────────────────────────── */}
      <Section title="Contact" blurb="How you reach the realtor for follow-ups.">
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

      {/* IDENTITY (AI POLISH SIGNAL) ─────────────────────────────── */}
      <Section
        title="About the realtor"
        blurb="The bio + voice direction here are the primary AI Polish inputs — the fuller these are, the more bespoke the site copy."
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
          <Field label="Languages" blurb="Comma-separated.">
            <input
              type="text"
              className="admin-input"
              value={v.languages}
              onChange={(e) => set("languages", e.target.value)}
              placeholder="English, Urdu, Hindi"
            />
          </Field>
          <Field label="Service areas" blurb="Cities, counties, or metros — comma-separated.">
            <input
              type="text"
              className="admin-input"
              value={v.service_areas}
              onChange={(e) => set("service_areas", e.target.value)}
              placeholder="Northern Virginia, Loudoun County, Fairfax County"
            />
          </Field>
        </Row>
      </Section>

      {/* TAGLINE — own section so it doesn't get lost ──────────── */}
      <Section
        title="Tagline"
        blurb='One short line that becomes the home page hero subhead — e.g. "Make Yourself at Home" or "Real Estate, Done Right".'
      >
        <Field label="Tagline">
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
      <Section title="Business" blurb="Brokerage, license, MLS. Drops into footer + credentials.">
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
            blurb='Comma-separated. Optional license # after a colon: "VA:0225001234, MD"'
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
      </Section>

      {/* PHOTOS ─────────────────────────────────────────────────── */}
      <Section
        title="Photos"
        blurb="Uploads go to Cloudinary. Each photo gets wired to the right place on the site automatically — portrait → /about + meet section, hero → home page background, brokerage logo + favicon → header / footer / browser tab."
      >
        {!cloudOk && (
          <div
            className="p-3 rounded-md text-[12px] flex items-start gap-2"
            style={{
              background:
                "color-mix(in srgb, var(--destructive) 6%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--destructive) 18%, transparent)",
              color: "var(--destructive)",
            }}
          >
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            Cloudinary not configured (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME or
            NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET missing). Image uploads are
            disabled.
          </div>
        )}
        <Row>
          <PhotoField
            label="Portrait"
            blurb="Realtor headshot. Square or portrait orientation."
            value={v.portrait}
            onChange={(val) => set("portrait", val)}
            disabled={!cloudOk}
          />
          <PhotoField
            label="Hero background"
            blurb="Home page hero image. Wide / landscape, dramatic."
            value={v.hero}
            onChange={(val) => set("hero", val)}
            disabled={!cloudOk}
          />
        </Row>
        <Row>
          <PhotoField
            label="Brokerage logo"
            blurb="Goes in the footer + open-house flyer header."
            value={v.brokerage_logo}
            onChange={(val) => set("brokerage_logo", val)}
            disabled={!cloudOk}
          />
          <PhotoField
            label="Favicon"
            blurb="Browser tab icon. A small square version of the portrait or a brand mark."
            value={v.favicon}
            onChange={(val) => set("favicon", val)}
            disabled={!cloudOk}
          />
        </Row>
        <PhotoField
          label="Social share image"
          blurb="The image that shows up when the site is shared on social / via SMS. Wide / landscape."
          value={v.featured_image}
          onChange={(val) => set("featured_image", val)}
          disabled={!cloudOk}
        />
      </Section>

      {/* BRAND COLORS ───────────────────────────────────────────── */}
      <Section
        title="Brand colors"
        blurb='Two hex values. Primary = the dark accent (default "#142840" navy). Surface = the light background (default "#F2EFEA" cream). Leave blank to use the platform defaults.'
      >
        <Row>
          <Field
            label="Primary"
            blurb='Dark accent. Hex (e.g. "#142840" or "#5B2018").'
          >
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="admin-input"
                style={{ width: 56, padding: 4, height: 36, cursor: "pointer" }}
                value={
                  /^#[0-9a-f]{6}$/i.test(v.primary_color)
                    ? v.primary_color
                    : "#142840"
                }
                onChange={(e) => set("primary_color", e.target.value)}
              />
              <input
                type="text"
                className="admin-input admin-mono"
                value={v.primary_color}
                onChange={(e) => set("primary_color", e.target.value)}
                placeholder="#142840"
              />
            </div>
          </Field>
          <Field
            label="Surface"
            blurb='Light background. Hex (e.g. "#F2EFEA" or "#FFFFFF").'
          >
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="admin-input"
                style={{ width: 56, padding: 4, height: 36, cursor: "pointer" }}
                value={
                  /^#[0-9a-f]{6}$/i.test(v.surface_color)
                    ? v.surface_color
                    : "#F2EFEA"
                }
                onChange={(e) => set("surface_color", e.target.value)}
              />
              <input
                type="text"
                className="admin-input admin-mono"
                value={v.surface_color}
                onChange={(e) => set("surface_color", e.target.value)}
                placeholder="#F2EFEA"
              />
            </div>
          </Field>
        </Row>
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
        <Field label="YouTube">
          <input
            type="url"
            className="admin-input"
            value={v.youtube}
            onChange={(e) => set("youtube", e.target.value)}
            placeholder="https://youtube.com/@…"
          />
        </Field>
      </Section>

      {/* DOMAIN & NOTES ─────────────────────────────────────────── */}
      <Section
        title="Domain &amp; extras"
        blurb="Anything else worth knowing — quirks, preferences, things to avoid. AI Polish reads the notes too."
      >
        <Field
          label="Desired custom domain"
          blurb="What URL the realtor wants the site on. We verify DNS separately — this is informational."
        >
          <input
            type="text"
            className="admin-input admin-mono"
            value={v.desired_domain}
            onChange={(e) => set("desired_domain", e.target.value)}
            placeholder="saminabilal.com"
          />
        </Field>
        <Field label="Notes for the polish team">
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

// ─────────────────────────────────────────────────────────────────────
// One photo upload slot
// ─────────────────────────────────────────────────────────────────────

function PhotoField({
  label,
  blurb,
  value,
  onChange,
  disabled,
}: {
  label: string;
  blurb?: string;
  value: ImageRef;
  onChange: (val: ImageRef) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await uploadToCloudinary(f);
      onChange({
        url: res.secure_url,
        publicId: res.public_id,
        width: res.width,
        height: res.height,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      // Reset the input so the same file can be picked again after clear
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Field label={label} blurb={blurb}>
      <div
        className="rounded-md p-3 flex items-start gap-3"
        style={{
          border: "1px solid var(--border)",
          background:
            "color-mix(in srgb, var(--foreground) 2%, var(--card))",
        }}
      >
        {value?.url ? (
          <div
            className="relative shrink-0"
            style={{
              width: 84,
              height: 84,
              borderRadius: 6,
              overflow: "hidden",
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <Image
              src={value.url}
              alt={label}
              fill
              sizes="84px"
              style={{ objectFit: "cover" }}
              unoptimized
            />
          </div>
        ) : (
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 84,
              height: 84,
              borderRadius: 6,
              background:
                "color-mix(in srgb, var(--foreground) 6%, transparent)",
              border: "1px dashed var(--border)",
            }}
          >
            <span
              className="text-[10px] tracking-wider uppercase"
              style={{ color: "var(--muted-foreground)" }}
            >
              No image
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={disabled || busy}
              className="admin-btn admin-btn-secondary text-xs inline-flex items-center"
            >
              {busy ? (
                <>
                  <Loader2 size={11} className="mr-1.5 animate-spin" />
                  Uploading&hellip;
                </>
              ) : (
                <>
                  <Upload size={11} className="mr-1.5" />
                  {value?.url ? "Replace" : "Upload"}
                </>
              )}
            </button>
            {value?.url && (
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={disabled || busy}
                className="text-[11px] inline-flex items-center"
                style={{ color: "var(--destructive)", fontWeight: 600 }}
              >
                <X size={11} className="mr-1" /> Clear
              </button>
            )}
          </div>
          {err && (
            <p
              className="mt-2 text-[11px]"
              style={{ color: "var(--destructive)" }}
            >
              {err}
            </p>
          )}
          {value?.url && !value.publicId && (
            <p
              className="mt-2 text-[11px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Loaded from existing data (URL only). Re-upload to wire into
              the media library.
            </p>
          )}
        </div>
      </div>
    </Field>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────────────────────────────

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
