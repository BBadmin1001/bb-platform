/**
 * Communities loader — reads neighborhoods from Supabase and merges with the
 * static `lib/communities.ts` defaults. The DB is authoritative; defaults
 * fill any gaps (and act as a fallback when Supabase isn't configured).
 *
 * Returns the same `Community[]` shape the public marketing components expect.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { communities as staticCommunities, type Community } from "./communities";
import { cldUrl } from "./cloudinary";
import {
  DEFAULT_COMMUNITY_PHOTO,
  DEFAULT_COMMUNITY_HERO_PHOTO,
} from "./imageDefaults";
import { getCurrentTenantId } from "./tenant/context";

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

let cached: SupabaseClient | null = null;
function getServiceClient(): SupabaseClient | null {
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

type DbRow = {
  id: string;
  slug: string;
  name: string;
  state: string;
  tagline: string | null;
  about: string | null;
  market_year_summary: string | null;
  samina_quote: string | null;
  median_price: string | null;
  yoy_change: string | null;
  yoy_direction: "up" | "down" | "flat" | null;
  days_on_market: string | null;
  market_type: string | null;
  data_year: number;
  image_id: string | null;
  image_crop?: unknown;
  hero_image_id?: string | null;
  hero_image_crop?: unknown;
  display_order: number;
  is_visible: boolean;
  price_tiers?: unknown;
  life?: unknown;
  media?: { cloudinary_public_id: string | null; url: string } | null;
  hero_media?: { cloudinary_public_id: string | null; url: string } | null;
};

function rowToCommunity(row: DbRow, fallback?: Community): Community {
  // image: prefer Cloudinary-derived URL with wide crop for cards/hero
  const imageCrop = asCropArea(row.image_crop);
  const heroImageCrop = asCropArea(row.hero_image_crop);
  const imageFromDb = row.media?.cloudinary_public_id
    ? cldUrl(row.media.cloudinary_public_id, {
        crop: "wide",
        width: 1600,
        cropArea: imageCrop,
      })
    : row.media?.url || null;
  const heroImageFromDb = row.hero_media?.cloudinary_public_id
    ? cldUrl(row.hero_media.cloudinary_public_id, {
        crop: "wide",
        width: 1920,
        cropArea: heroImageCrop,
      })
    : row.hero_media?.url || null;

  const priceTiers = Array.isArray(row.price_tiers)
    ? (row.price_tiers as Community["priceTiers"])
    : (fallback?.priceTiers ?? []);

  const lifeObj =
    row.life && typeof row.life === "object" && !Array.isArray(row.life)
      ? (row.life as Community["life"])
      : (fallback?.life ?? {
          schools: "",
          parks: "",
          dining: "",
          commute: "",
        });

  return {
    slug: row.slug,
    name: row.name,
    state: row.state,
    tagline: row.tagline ?? fallback?.tagline ?? "",
    median: row.median_price ?? fallback?.median ?? "",
    yoy: row.yoy_change ?? fallback?.yoy ?? "",
    yoyDirection: (row.yoy_direction ?? fallback?.yoyDirection ?? "flat") as Community["yoyDirection"],
    dom: row.days_on_market ?? fallback?.dom ?? "",
    marketType: (row.market_type ?? fallback?.marketType ?? "Balanced") as Community["marketType"],
    about: row.about ?? fallback?.about ?? "",
    market2026: row.market_year_summary ?? fallback?.market2026 ?? "",
    priceTiers,
    life: lifeObj,
    saminaQuote: row.samina_quote ?? fallback?.saminaQuote ?? "",
    // Always render *something* — picked photo → static slug fallback → generic stock
    image: imageFromDb ?? fallback?.image ?? DEFAULT_COMMUNITY_PHOTO,
    heroImage: heroImageFromDb ?? undefined,
  };
}

/**
 * Get the list of visible communities (display_order ascending).
 * Falls back to static defaults when DB unavailable or empty.
 */
export async function getCommunities(): Promise<Community[]> {
  const fallbackBySlug = new Map(staticCommunities.map((c) => [c.slug, c]));

  try {
    const supabase = getServiceClient();
    if (!supabase) return staticCommunities;
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return staticCommunities;

    const { data, error } = await supabase
      .from("communities")
      .select(
        `id, slug, name, state, tagline, about, market_year_summary, samina_quote,
         median_price, yoy_change, yoy_direction, days_on_market, market_type, data_year,
         image_id, image_crop, hero_image_id, hero_image_crop,
         display_order, is_visible, price_tiers, life,
         media:image_id ( cloudinary_public_id, url ),
         hero_media:hero_image_id ( cloudinary_public_id, url )`,
      )
      .eq("tenant_id", tenantId)
      .eq("is_visible", true)
      .order("display_order", { ascending: true });

    if (error || !data || data.length === 0) return staticCommunities;

    const rows = data as unknown as DbRow[];
    return rows.map((r) => rowToCommunity(r, fallbackBySlug.get(r.slug)));
  } catch {
    return staticCommunities;
  }
}

export async function getCommunityBySlug(slug: string): Promise<Community | null> {
  const fallback = staticCommunities.find((c) => c.slug === slug) ?? null;
  try {
    const supabase = getServiceClient();
    if (!supabase) return fallback;
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return fallback;

    const { data, error } = await supabase
      .from("communities")
      .select(
        `id, slug, name, state, tagline, about, market_year_summary, samina_quote,
         median_price, yoy_change, yoy_direction, days_on_market, market_type, data_year,
         image_id, image_crop, hero_image_id, hero_image_crop,
         display_order, is_visible, price_tiers, life,
         media:image_id ( cloudinary_public_id, url ),
         hero_media:hero_image_id ( cloudinary_public_id, url )`,
      )
      .eq("tenant_id", tenantId)
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return fallback;
    return rowToCommunity(data as unknown as DbRow, fallback ?? undefined);
  } catch {
    return fallback;
  }
}
