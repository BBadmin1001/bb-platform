import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntakeData } from "@/lib/intakeSchema";

/**
 * Apply the wizard intake payload onto a freshly-provisioned tenant —
 * seeds content_blocks, brand theme, and media library so the polish
 * team starts editing the customer's actual data instead of blank
 * defaults.
 *
 * Idempotent: every write is an upsert against the natural unique
 * key (`(tenant_id, page, key)` for content_blocks). Re-running on
 * the same tenant with updated intake refreshes the rows.
 *
 * Errors on individual writes are collected but don't abort the
 * whole seed — partial seeding is better than no seeding when one
 * field is malformed.
 *
 * Caller should pass a service-role-scoped Supabase client (the
 * webhook + master provisioning both run with elevated privileges).
 */
export async function seedTenantFromIntake(
  supabase: SupabaseClient,
  tenantId: string,
  intake: IntakeData,
): Promise<{ ok: true; warnings: string[] } | { ok: false; error: string }> {
  const warnings: string[] = [];

  // ── 1. Brand identity content block ─────────────────────────────
  // Drives the public Header/Footer name + role. Stored under
  // (page="brand", key="identity") in keeping with the existing
  // content_blocks convention used by the brand admin.
  await upsertBlock(supabase, tenantId, "brand", "identity", {
    name: intake.realtor_full_name || "",
    role: "Realtor",
    brokerage: intake.brokerage_name || "",
    tagline: intake.tagline || "",
    languages: intake.languages || [],
    serviceArea: (intake.service_areas || []).join(" · "),
  }, warnings);

  // ── 2. Brand theme (only if customer picked colors) ────────────
  if (intake.preferred_primary_color || intake.preferred_surface_color) {
    await upsertBlock(supabase, tenantId, "brand", "theme", {
      primary: intake.preferred_primary_color || "#142840",
      surface: intake.preferred_surface_color || "#F2EFEA",
      primaryGradient: "",
      surfaceGradient: "",
    }, warnings);
  }

  // ── 3. Home page seeds ─────────────────────────────────────────
  // Hero subtitle + meet section + sign-off pull from the intake
  // narrative. Tokens stay where the realtor name belongs so
  // contentLoader can substitute on render too.
  await upsertBlock(supabase, tenantId, "home", "hero", {
    eyebrow: intake.tagline ? "" : "Real Estate, Done Right",
    titleLines: ["Make Yourself", "at Home"],
    subtitle: buildHeroSubtitle(intake),
    ctas: [
      { label: "Explore Communities", href: "/communities", style: "glass" },
      { label: "Path to Ownership", href: "/path-to-ownership", style: "outline" },
    ],
    stats: [
      { value: 5.0, decimals: 1, suffix: "★", label: "Client Reviews" },
      { value: 0, suffix: "+", label: "Five-Star Client Reviews" },
      {
        value: intake.licensed_states?.length || 1,
        label: `State${(intake.licensed_states?.length || 1) > 1 ? "s" : ""} Licensed`,
      },
    ],
  }, warnings);

  if (intake.realtor_short_bio || intake.realtor_full_name) {
    const firstName =
      (intake.realtor_full_name || "").split(/\s+/)[0] || "your Realtor";
    await upsertBlock(supabase, tenantId, "home", "meet", {
      eyebrow: `Meet ${firstName}`,
      heading:
        "A boutique approach to one of the biggest decisions you'll ever make.",
      body: bioToParagraphs(intake),
      quote:
        "I treat every client the way I'd want to be treated — with patience, clarity, and a real plan.",
      cta: { label: `About ${firstName}`, href: "/about" },
    }, warnings);
  }

  // ── 4. About page seeds ────────────────────────────────────────
  if (intake.realtor_short_bio || intake.realtor_full_name) {
    const firstName =
      (intake.realtor_full_name || "").split(/\s+/)[0] || "your Realtor";
    await upsertBlock(supabase, tenantId, "about", "hero", {
      eyebrow: "Realtor",
      titleLines: [intake.realtor_full_name || ""],
      subtitle: "A boutique approach to one of the biggest decisions you'll make.",
    }, warnings);
    await upsertBlock(supabase, tenantId, "about", "bio", {
      eyebrow: `A Note From ${firstName}`,
      paragraphs: bioToParagraphs(intake),
    }, warnings);

    // Credentials block
    await upsertBlock(supabase, tenantId, "about", "credentials", {
      eyebrow: "Credentials",
      heading: "Licensed and affiliated.",
      items: buildCredentials(intake),
    }, warnings);
  }

  // ── 5. Contact details block ───────────────────────────────────
  await upsertBlock(supabase, tenantId, "contact", "detailsIntro", {
    eyebrow: "Direct Contact",
    heading: `${intake.realtor_full_name || ""} · Realtor`,
  }, warnings);

  // ── 5b. Brand contact block (A3-006) ────────────────────────────
  // The intake collects phone/email/social/licenses/brokerage office,
  // and there's a Contact & License admin editor wired to
  // `content_blocks(page='brand', key='contact')` (A1-003). Seed it
  // here so customers land in admin with their submitted details
  // pre-filled instead of staring at blank inputs, AND so the public
  // footer/header chrome has correct phone/email/social on first
  // render rather than falling back to platform defaults.
  const licenses = (intake.licensed_states ?? [])
    .filter((ls) => ls.state_abbr)
    .map((ls) => ({
      state: ls.state_abbr,
      number: ls.license_number || "",
    }));
  const office = intake.broker_office_address
    ? parseBrokerAddress(intake.broker_office_address, intake.brokerage_name)
    : null;
  await upsertBlock(
    supabase,
    tenantId,
    "brand",
    "contact",
    {
      phone: intake.phone || "",
      email: intake.email || "",
      social: {
        instagram: intake.social?.instagram || "",
        facebook: intake.social?.facebook || "",
        tiktok: intake.social?.tiktok || "",
        linkedin: intake.social?.linkedin || "",
      },
      licenses,
      office: office ?? {
        name: intake.brokerage_name || "",
        street: "",
        cityStateZip: "",
        phone: "",
      },
    },
    warnings,
  );

  // ── 6. Photo media rows ────────────────────────────────────────
  // Save each uploaded Cloudinary URL as a media row so the polish
  // team can pick them via the admin image picker. We don't pre-link
  // them to specific blocks (let the team place them where they want).
  await importPhoto(supabase, tenantId, intake.portrait_url, "Headshot from intake", warnings);
  await importPhoto(supabase, tenantId, intake.hero_url, "Hero photo from intake", warnings);
  await importPhoto(supabase, tenantId, intake.brokerage_logo_url, "Brokerage logo from intake", warnings);

  return { ok: true, warnings };
}

// ─────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────

async function upsertBlock(
  supabase: SupabaseClient,
  tenantId: string,
  page: string,
  key: string,
  value: unknown,
  warnings: string[],
): Promise<void> {
  const { error } = await supabase.from("content_blocks").upsert(
    {
      tenant_id: tenantId,
      page,
      key,
      value: JSON.stringify(value),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,page,key" },
  );
  if (error) {
    warnings.push(`content_blocks ${page}.${key}: ${error.message}`);
  }
}

async function importPhoto(
  supabase: SupabaseClient,
  tenantId: string,
  url: string | undefined,
  alt: string,
  warnings: string[],
): Promise<void> {
  if (!url) return;
  // Try to extract the Cloudinary public_id from the URL — the URL
  // shape is .../upload/v123/<public_id>.<ext>
  const m = url.match(/\/upload\/(?:v\d+\/)?([^.]+)\.[a-z]+$/i);
  const publicId = m ? m[1] : null;

  const { error } = await supabase.from("media").insert({
    tenant_id: tenantId,
    kind: "image",
    cloudinary_public_id: publicId,
    url,
    alt,
  });
  if (error) {
    warnings.push(`media import (${alt}): ${error.message}`);
  }
}

function buildHeroSubtitle(intake: IntakeData): string {
  const parts: string[] = [];
  if (intake.tagline) {
    return intake.tagline;
  }
  if (intake.realtor_full_name && intake.brokerage_name) {
    parts.push(
      `Boutique real estate guidance — with ${intake.realtor_full_name}, ${intake.brokerage_name}.`,
    );
  } else if (intake.realtor_full_name) {
    parts.push(
      `Boutique real estate guidance with ${intake.realtor_full_name}.`,
    );
  } else {
    parts.push("Boutique real estate guidance.");
  }
  return parts.join(" ");
}

function bioToParagraphs(intake: IntakeData): string[] {
  if (intake.realtor_short_bio?.trim()) {
    // Split on double newlines or sentence boundaries to get paragraphs
    return intake.realtor_short_bio
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  // Fall back to a generic intro built from the structured fields.
  const lines: string[] = [];
  if (intake.realtor_full_name && intake.brokerage_name) {
    lines.push(
      `I'm ${intake.realtor_full_name} — a Realtor with ${intake.brokerage_name}. I work with first-time buyers, growing families, and clients relocating into the area.`,
    );
  } else if (intake.realtor_full_name) {
    lines.push(`I'm ${intake.realtor_full_name} — a licensed Realtor.`);
  }
  if (intake.languages && intake.languages.length > 0) {
    lines.push(
      `I speak ${formatList(intake.languages)} — which has been a quiet strength when working with families across cultures.`,
    );
  }
  if (intake.service_areas && intake.service_areas.length > 0) {
    lines.push(
      `I serve ${formatList(intake.service_areas)} and the surrounding area.`,
    );
  }
  if (lines.length === 0) {
    lines.push(
      "My approach to real estate is calm, transparent, and detail-oriented. Buying or selling a home shapes the next chapter of your life — it deserves a Realtor who treats it that way.",
    );
  }
  return lines;
}

function buildCredentials(intake: IntakeData): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  if (intake.brokerage_name) {
    items.push({ label: "Brokerage", value: `${intake.brokerage_name} · Associate` });
  }
  for (const ls of intake.licensed_states ?? []) {
    if (!ls.state_abbr) continue;
    // A3-018: when license number is blank, emit a single "Licensed in
    // <state>" row instead of "<state> License: " with a dangling
    // empty suffix. Keeps the credentials block visually clean
    // regardless of whether the realtor filled the optional field.
    const lic = (ls.license_number || "").trim();
    if (lic) {
      items.push({ label: `${ls.state_abbr} License`, value: lic });
    } else {
      items.push({ label: "Licensed", value: ls.state_abbr });
    }
  }
  if (intake.mls_id) {
    items.push({ label: "MLS ID", value: intake.mls_id });
  }
  if (intake.languages && intake.languages.length > 0) {
    items.push({ label: "Languages", value: formatList(intake.languages) });
  }
  if (intake.service_areas && intake.service_areas.length > 0) {
    items.push({
      label: "Service Area",
      value: formatList(intake.service_areas),
    });
  }
  return items;
}

/**
 * Heuristic split of a free-text broker office address into
 * `{name, street, cityStateZip, phone}`. The intake field is a single
 * textarea so we can't trust line breaks; we do a best-effort by
 * peeling off the last comma-segment that looks like `City, ST ZIP`
 * and keeping the rest as street. Brokerage name comes from the
 * sibling intake field.
 */
function parseBrokerAddress(
  raw: string,
  brokerageName?: string,
): { name: string; street: string; cityStateZip: string; phone: string } {
  const trimmed = raw.trim();
  // Match a trailing "City, ST 12345(-1234)" segment.
  const m = trimmed.match(/,\s*([^,]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)\s*$/);
  if (m) {
    const cityStateZip = m[1].trim();
    const street = trimmed.slice(0, m.index!).trim().replace(/,$/, "").trim();
    return {
      name: brokerageName || "",
      street,
      cityStateZip,
      phone: "",
    };
  }
  return {
    name: brokerageName || "",
    street: trimmed,
    cityStateZip: "",
    phone: "",
  };
}

function formatList(arr: string[]): string {
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
}
