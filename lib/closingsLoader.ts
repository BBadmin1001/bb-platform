/**
 * Closings loader — reads `public.closings` (joined with media) and merges
 * with the static `lib/closings.ts` defaults if the DB is empty / unavailable.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { closings as staticClosings, type Closing } from "./closings";
import { cldUrl } from "./cloudinary";
import { DEFAULT_CLOSING_PHOTO } from "./imageDefaults";
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

type DbRow = {
  id: string;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  closed_year: number | null;
  display_order: number;
  image_crop?: unknown;
  media: { cloudinary_public_id: string | null; url: string } | null;
};

export async function getClosings(): Promise<Closing[]> {
  try {
    const supabase = client();
    // Never fall back to the static (Samina) closings set — leaks
    // her transaction history into other tenants' sites.
    if (!supabase) return [];
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return [];

    const { data, error } = await supabase
      .from("closings")
      .select(
        `id, neighborhood, city, state, closed_year, display_order, image_crop,
         media:image_id ( cloudinary_public_id, url )`,
      )
      .eq("tenant_id", tenantId)
      .eq("is_visible", true)
      .order("display_order", { ascending: true });

    if (error || !data || data.length === 0) return [];

    return (data as unknown as DbRow[]).map((r) => ({
      id: r.id,
      image: r.media?.cloudinary_public_id
        ? cldUrl(r.media.cloudinary_public_id, {
            crop: "landscape",
            width: 1200,
            cropArea: asCropArea(r.image_crop),
          })
        : (r.media?.url || DEFAULT_CLOSING_PHOTO),
      neighborhood: r.neighborhood ?? "",
      city: r.city ?? "",
      state: r.state ?? "VA",
      year: r.closed_year ?? new Date().getFullYear(),
    }));
  } catch {
    return [];
  }
}
