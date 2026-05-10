/**
 * Shape of the intake-form payload that the public onboarding wizard
 * collects. Stored on `prospects.intake_data` (jsonb). Phase 8 maps
 * this onto the new tenant's content_blocks / media / theme.
 *
 * Every field is optional from the DB's perspective so a partial
 * draft can save without violating constraints. The wizard enforces
 * required fields per step on the client side.
 */

export type LicensedState = {
  state_abbr: string;
  license_number?: string;
};

export type IntakeData = {
  // ── Step 1 · contact ───────────────────────────────────────────
  contact_name: string;
  email: string;
  phone?: string;

  // ── Step 2 · realtor identity ──────────────────────────────────
  realtor_full_name: string;
  /** First-person bio paragraph used as the default "About" copy. */
  realtor_short_bio?: string;
  /** Free text describing tone preferences ("calm, no jargon",
   *  "playful but professional", etc.) — feeds AI polishing later. */
  voice_direction?: string;
  languages?: string[];
  /** Cities / counties / metros the realtor serves. Becomes the
   *  Communities section seed list during polishing. */
  service_areas?: string[];

  // ── Step 3 · business / brokerage / licensing ──────────────────
  brokerage_name: string;
  /** Cloudinary URL of the brokerage logo (dropped into footer). */
  brokerage_logo_url?: string;
  broker_office_address?: string;
  mls_id?: string;
  licensed_states: LicensedState[];
  social?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    linkedin?: string;
    youtube?: string;
  };

  // ── Step 4 · website identity ──────────────────────────────────
  /** What domain they want the site on. Verified later via DNS. */
  desired_domain?: string;
  /** Hex (e.g. "#142840"). Empty = let the polish team pick. */
  preferred_primary_color?: string;
  preferred_surface_color?: string;
  tagline?: string;

  // ── Step 5 · photos (Cloudinary URLs) ──────────────────────────
  portrait_url?: string;
  hero_url?: string;

  // ── Step 6 · extras ────────────────────────────────────────────
  /** Anything else the realtor wants the polish team to know. */
  notes?: string;
};

/**
 * Empty default — used to seed React state at wizard start.
 */
export function emptyIntake(): IntakeData {
  return {
    contact_name: "",
    email: "",
    realtor_full_name: "",
    brokerage_name: "",
    licensed_states: [],
  };
}

/**
 * Step metadata — drives the progress indicator and step navigation.
 * `requiredFields` is the minimal set that must be filled for the
 * step's "Next" button to enable.
 */
export const INTAKE_STEPS = [
  {
    id: "contact",
    label: "Contact",
    blurb: "How we reach you.",
    requiredFields: ["contact_name", "email"] as const,
  },
  {
    id: "realtor",
    label: "About you",
    blurb: "Your name, your story, your voice.",
    requiredFields: ["realtor_full_name"] as const,
  },
  {
    id: "business",
    label: "Business",
    blurb: "Brokerage, license, MLS.",
    requiredFields: ["brokerage_name"] as const,
  },
  {
    id: "site",
    label: "Site identity",
    blurb: "Domain, tagline, brand feel.",
    requiredFields: [] as const,
  },
  {
    id: "photos",
    label: "Photos",
    blurb: "Headshot + hero shot.",
    requiredFields: [] as const,
  },
  {
    id: "review",
    label: "Review & pay",
    blurb: "Confirm and head to checkout.",
    requiredFields: [] as const,
  },
] as const;

export type StepId = (typeof INTAKE_STEPS)[number]["id"];
