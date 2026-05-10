/**
 * Server-side reader for county landing pages.
 *
 *   getPublishedCountySlugs()  → all currently-live slugs (used by the
 *                                public sitemap.ts)
 *   getCountyLanding(slug)     → fetched row + resolved Cloudinary hero URL
 *   listAllCountyLandingRows() → admin uses this to render the manager
 */

import { getServiceClient } from "./contentLoader";
import { getCurrentTenantId } from "./tenant/context";

export interface CountyLandingPage {
  id: string;
  slug: string;
  countyName: string;
  /** Two-letter US state code, e.g. "VA", "FL", "CA". */
  stateAbbr: string;
  stateName: string;
  isPublished: boolean;
  /** Optional admin overrides — auto-generated defaults are used when empty. */
  customHeading: string | null;
  customIntro: string | null;
  customMetaDescription: string | null;
  /** Cloudinary URL ready to render. Falls through to a sensible default. */
  heroImageUrl: string | null;
  zipCodes: string[];
  /** Cities / towns / neighborhoods inside this county (admin-entered). */
  serviceAreas: string[];
}

interface DbRow {
  id: string;
  slug: string;
  county_name: string;
  state_abbr: string;
  state_name: string;
  is_published: boolean;
  custom_heading: string | null;
  custom_intro: string | null;
  custom_meta_description: string | null;
  hero_image_id: string | null;
  hero_media: { cloudinary_public_id: string | null; url: string } | null;
  zip_codes: unknown;
  service_areas: unknown;
}

const SELECT = `id, slug, county_name, state_abbr, state_name, is_published,
  custom_heading, custom_intro, custom_meta_description,
  hero_image_id, hero_media:hero_image_id ( cloudinary_public_id, url ),
  zip_codes, service_areas`;

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

async function buildHeroUrl(
  media: DbRow["hero_media"],
): Promise<string | null> {
  if (!media) return null;
  if (media.cloudinary_public_id) {
    const { cldUrl } = await import("./cloudinary");
    return cldUrl(media.cloudinary_public_id, { crop: "wide", width: 1920 });
  }
  return media.url || null;
}

async function rowToPage(row: DbRow): Promise<CountyLandingPage> {
  return {
    id: row.id,
    slug: row.slug,
    countyName: row.county_name,
    stateAbbr: row.state_abbr,
    stateName: row.state_name,
    isPublished: row.is_published,
    customHeading: row.custom_heading,
    customIntro: row.custom_intro,
    customMetaDescription: row.custom_meta_description,
    heroImageUrl: await buildHeroUrl(row.hero_media),
    zipCodes: asStringArray(row.zip_codes),
    serviceAreas: asStringArray(row.service_areas),
  };
}

export async function getPublishedCountySlugs(): Promise<string[]> {
  try {
    const supabase = getServiceClient();
    if (!supabase) return [];
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return [];
    const { data } = await supabase
      .from("county_landing_pages")
      .select("slug")
      .eq("tenant_id", tenantId)
      .eq("is_published", true);
    return (data ?? []).map((r) => r.slug);
  } catch {
    return [];
  }
}

export async function getCountyLanding(
  slug: string,
): Promise<CountyLandingPage | null> {
  try {
    const supabase = getServiceClient();
    if (!supabase) return null;
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return null;
    const { data } = await supabase
      .from("county_landing_pages")
      .select(SELECT)
      .eq("tenant_id", tenantId)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!data) return null;
    return await rowToPage(data as unknown as DbRow);
  } catch {
    return null;
  }
}

/** Admin-side: lists every row regardless of is_published, with preview data. */
export async function listAllCountyLandingRows(): Promise<CountyLandingPage[]> {
  try {
    const supabase = getServiceClient();
    if (!supabase) return [];
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return [];
    const { data } = await supabase
      .from("county_landing_pages")
      .select(SELECT)
      .eq("tenant_id", tenantId)
      .order("state_abbr", { ascending: true })
      .order("county_name", { ascending: true });
    if (!data) return [];
    return await Promise.all(
      (data as unknown as DbRow[]).map(rowToPage),
    );
  } catch {
    return [];
  }
}
