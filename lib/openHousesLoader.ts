/**
 * Public-side reader for open houses. Renders the landing page +
 * printable A4 flyer at /open-house/[slug].
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cldUrl } from "./cloudinary";
import { DEFAULT_COMMUNITY_PHOTO } from "./imageDefaults";
import { getCurrentTenantId } from "./tenant/context";

let cached: SupabaseClient | null = null;
function client(): SupabaseClient | null {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    return null;
  if (!cached) {
    cached = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );
  }
  return cached;
}

function asCropArea(
  v: unknown,
): { x: number; y: number; width: number; height: number } | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const r = v as Record<string, unknown>;
  if (
    typeof r.x === "number" &&
    typeof r.y === "number" &&
    typeof r.width === "number" &&
    typeof r.height === "number"
  ) {
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }
  return undefined;
}

export type OpenHouseDay = {
  date: string | null;
  timeLabel: string | null;
};

export type OpenHouse = {
  id: string;
  slug: string;
  heading: string;
  /** Legacy single-line address (used as fallback when structured fields blank). */
  address: string;
  /** Structured address line 2: "Woodbridge, Virginia 22192". */
  cityLine: string;
  city: string | null;
  stateFull: string | null;
  postalCode: string | null;
  /** 1 or 2 entries — the flyer renders one date/time pill per entry. */
  days: OpenHouseDay[];
  // Legacy single-day accessors kept for any older callers
  date: string | null;
  timeLabel: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garageSpaces: number;
  mlsId: string | null;
  features: string[];
  description: string;
  formId: string | null;
  isPublished: boolean;
  hero: string;
  second: string;
  third: string;
};

type DbRow = {
  id: string;
  slug: string;
  heading: string;
  address: string;
  city: string | null;
  state_full: string | null;
  postal_code: string | null;
  open_date: string | null;
  open_time_label: string | null;
  open_date_2: string | null;
  open_time_label_2: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garage_spaces: number | null;
  mls_id: string | null;
  features: string[] | null;
  description: string | null;
  form_id: string | null;
  is_published: boolean;
  hero_image_crop: unknown;
  second_image_crop: unknown;
  third_image_crop: unknown;
  hero_media: { cloudinary_public_id: string | null; url: string } | null;
  second_media: { cloudinary_public_id: string | null; url: string } | null;
  third_media: { cloudinary_public_id: string | null; url: string } | null;
};

function buildUrl(
  media: DbRow["hero_media"],
  crop: unknown,
  width: number,
  fallback: string,
): string {
  if (!media) return fallback;
  if (media.cloudinary_public_id) {
    return cldUrl(media.cloudinary_public_id, {
      crop: "wide",
      width,
      cropArea: asCropArea(crop),
    });
  }
  return media.url || fallback;
}

const SELECT = `id, slug, heading, address, city, state_full, postal_code,
  open_date, open_time_label, open_date_2, open_time_label_2,
  bedrooms, bathrooms, garage_spaces, mls_id,
  features, description, form_id, is_published,
  hero_image_crop, second_image_crop, third_image_crop,
  hero_media:hero_image_id ( cloudinary_public_id, url ),
  second_media:second_image_id ( cloudinary_public_id, url ),
  third_media:third_image_id ( cloudinary_public_id, url )`;

function rowToOpenHouse(row: DbRow): OpenHouse {
  // Build the structured second-line address ("City, State Full Postal").
  const cityState = [row.city, row.state_full].filter(Boolean).join(", ");
  const cityLine = [cityState, row.postal_code].filter(Boolean).join(" ").trim();

  // Compose a 1- or 2-entry days array. Day 2 only counts if a date or time
  // label is present.
  const days: OpenHouseDay[] = [
    { date: row.open_date, timeLabel: row.open_time_label },
  ];
  if (row.open_date_2 || row.open_time_label_2) {
    days.push({ date: row.open_date_2, timeLabel: row.open_time_label_2 });
  }

  return {
    id: row.id,
    slug: row.slug,
    heading: row.heading,
    address: row.address,
    cityLine,
    city: row.city,
    stateFull: row.state_full,
    postalCode: row.postal_code,
    days,
    date: row.open_date,
    timeLabel: row.open_time_label,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms == null ? null : Number(row.bathrooms),
    garageSpaces: row.garage_spaces ?? 0,
    mlsId: row.mls_id,
    features: row.features ?? [],
    description: row.description ?? "",
    formId: row.form_id,
    isPublished: row.is_published,
    hero: buildUrl(row.hero_media, row.hero_image_crop, 2000, DEFAULT_COMMUNITY_PHOTO),
    second: buildUrl(row.second_media, row.second_image_crop, 1200, DEFAULT_COMMUNITY_PHOTO),
    third: buildUrl(row.third_media, row.third_image_crop, 1200, DEFAULT_COMMUNITY_PHOTO),
  };
}

export async function getOpenHouseBySlug(slug: string): Promise<OpenHouse | null> {
  try {
    const supabase = client();
    if (!supabase) {
      console.error("[openHousesLoader] no supabase client");
      return null;
    }
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return null;
    const { data, error } = await supabase
      .from("open_houses")
      .select(SELECT)
      .eq("tenant_id", tenantId)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) {
      console.error("[openHousesLoader] query error:", error);
      return null;
    }
    if (!data) {
      console.error("[openHousesLoader] no row for slug:", slug);
      return null;
    }
    return rowToOpenHouse(data as unknown as DbRow);
  } catch (e) {
    console.error("[openHousesLoader] caught:", e);
    return null;
  }
}

export async function listOpenHouses(): Promise<OpenHouse[]> {
  try {
    const supabase = client();
    if (!supabase) return [];
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return [];
    const { data, error } = await supabase
      .from("open_houses")
      .select(SELECT)
      .eq("tenant_id", tenantId)
      .order("open_date", { ascending: false, nullsFirst: false });
    if (error || !data) return [];
    return (data as unknown as DbRow[]).map(rowToOpenHouse);
  } catch {
    return [];
  }
}
