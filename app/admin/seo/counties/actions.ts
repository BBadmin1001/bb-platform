"use server";

/**
 * County landing page admin actions.
 *
 *   createCountyLanding(input)     — full-form create. Auto-generates slug.
 *   updateCountyLanding(slug, ...) — full-form edit
 *   deleteCountyLanding(slug)      — permanent delete
 *   togglePublishCounty(slug)      — quick on/off
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTenantUser } from "@/lib/auth";
import { STATE_NAMES, isValidStateAbbr } from "@/lib/counties";

type Result = { ok: true; slug?: string } | { ok: false; error: string };

/**
 * Slugify "Loudoun" + "VA" → "loudoun-virginia". Works for any US state.
 *
 *  • county lowercased + apostrophes stripped + non-alphanumerics → "-"
 *  • state name (full, lowercased) appended after a hyphen
 *  • spaces in multi-word state names ("New York") become hyphens
 */
export async function buildCountySlug(
  countyName: string,
  stateAbbr: string,
): Promise<string> {
  const base = countyName
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const stateName = STATE_NAMES[stateAbbr] ?? stateAbbr;
  const stateSlug = stateName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base ? `${base}-${stateSlug}` : stateSlug;
}

export interface CountyLandingInput {
  county_name: string;
  state_abbr: string;
  zip_codes: string[];
  service_areas: string[];
  hero_image_id: string | null;
  custom_heading: string | null;
  custom_intro: string | null;
  custom_meta_description: string | null;
  is_published: boolean;
}

function validate(input: CountyLandingInput): string | null {
  if (!input.county_name?.trim()) return "County name is required.";
  if (!isValidStateAbbr(input.state_abbr)) {
    return "Pick a valid US state.";
  }
  return null;
}

export async function createCountyLanding(
  input: CountyLandingInput,
): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const validationError = validate(input);
  if (validationError) return { ok: false, error: validationError };

  const slug = await buildCountySlug(input.county_name, input.state_abbr);

  // Bail if slug already exists (admin can edit the existing one instead)
  const { data: existing } = await supabase
    .from("county_landing_pages")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: `A landing page for ${input.county_name} County, ${STATE_NAMES[input.state_abbr]} already exists. Edit that one instead.`,
    };
  }

  const { error } = await supabase.from("county_landing_pages").insert({
    tenant_id: tenantId,
    slug,
    county_name: input.county_name.trim(),
    state_abbr: input.state_abbr,
    state_name: STATE_NAMES[input.state_abbr] ?? input.state_abbr,
    is_published: input.is_published,
    custom_heading: input.custom_heading || null,
    custom_intro: input.custom_intro || null,
    custom_meta_description: input.custom_meta_description || null,
    hero_image_id: input.hero_image_id || null,
    zip_codes: input.zip_codes,
    service_areas: input.service_areas,
    updated_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/seo/counties");
  revalidatePath("/sitemap.xml");
  if (input.is_published) revalidatePath(`/realtor-in/${slug}`);
  return { ok: true, slug };
}

export async function updateCountyLanding(
  slug: string,
  input: CountyLandingInput,
): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const validationError = validate(input);
  if (validationError) return { ok: false, error: validationError };

  // Slug may change if the admin renames the county — recompute and check
  // that the new slug isn't claimed by another row.
  const newSlug = await buildCountySlug(input.county_name, input.state_abbr);
  if (newSlug !== slug) {
    const { data: collision } = await supabase
      .from("county_landing_pages")
      .select("id")
      .eq("slug", newSlug)
      .maybeSingle();
    if (collision) {
      return {
        ok: false,
        error: `Renaming would collide with an existing landing page (${newSlug}).`,
      };
    }
  }

  const { error } = await supabase
    .from("county_landing_pages")
    .update({
      slug: newSlug,
      county_name: input.county_name.trim(),
      state_abbr: input.state_abbr,
      state_name: STATE_NAMES[input.state_abbr] ?? input.state_abbr,
      is_published: input.is_published,
      custom_heading: input.custom_heading || null,
      custom_intro: input.custom_intro || null,
      custom_meta_description: input.custom_meta_description || null,
      hero_image_id: input.hero_image_id || null,
      zip_codes: input.zip_codes,
      service_areas: input.service_areas,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("slug", slug);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/seo/counties");
  revalidatePath(`/admin/seo/counties/${newSlug}/edit`);
  revalidatePath(`/realtor-in/${slug}`);
  revalidatePath(`/realtor-in/${newSlug}`);
  revalidatePath("/sitemap.xml");
  return { ok: true, slug: newSlug };
}

export async function deleteCountyLanding(slug: string): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { error } = await supabase
    .from("county_landing_pages")
    .delete()
    .eq("slug", slug);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/seo/counties");
  revalidatePath("/sitemap.xml");
  return { ok: true };
}

export async function togglePublishCounty(slug: string): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { data: existing, error: readErr } = await supabase
    .from("county_landing_pages")
    .select("id, is_published")
    .eq("slug", slug)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!existing) return { ok: false, error: "Landing page not found." };

  const { error } = await supabase
    .from("county_landing_pages")
    .update({
      is_published: !existing.is_published,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", existing.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/seo/counties");
  revalidatePath(`/realtor-in/${slug}`);
  revalidatePath("/sitemap.xml");
  return { ok: true };
}

/** Used by the form's "Save" → router.push redirect. */
export async function navigateToEditor(slug: string) {
  redirect(`/admin/seo/counties/${slug}/edit`);
}
