/**
 * Partners loader — reads partner_categories + partners (joined by category)
 * and falls back to the static `content.partners.categories` if DB unavailable.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { content } from "./content";
import { cldUrl } from "./cloudinary";
import {
  DEFAULT_PARTNER_PHOTO,
  DEFAULT_PARTNER_LOGO,
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

export type PartnerContact = {
  name: string;
  role: string;
  company: string;
  phone: string;
  email: string;
  /** Square headshot URL (empty string if none) */
  photo?: string;
  /** Logo URL — usually a transparent PNG (empty string if none) */
  logo?: string;
};

export type PartnerCategory = {
  title: string;
  body: string;
  contacts: PartnerContact[];
};

type CatRow = {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
};

type PartnerRow = {
  id: string;
  category_id: string | null;
  name: string;
  role: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  display_order: number;
  photo_id?: string | null;
  photo_crop?: unknown;
  logo_id?: string | null;
  logo_crop?: unknown;
  photo_media?: { cloudinary_public_id: string | null; url: string } | null;
  logo_media?: { cloudinary_public_id: string | null; url: string } | null;
};

export async function getPartnerCategories(): Promise<PartnerCategory[]> {
  try {
    const supabase = client();
    if (!supabase) return content.partners.categories;
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return content.partners.categories;

    const [{ data: cats }, { data: partners }] = await Promise.all([
      supabase
        .from("partner_categories")
        .select("id, title, description, display_order")
        .eq("tenant_id", tenantId)
        .eq("is_visible", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("partners")
        .select(
          `id, category_id, name, role, company, phone, email, display_order,
           photo_id, photo_crop, logo_id, logo_crop,
           photo_media:photo_id ( cloudinary_public_id, url ),
           logo_media:logo_id ( cloudinary_public_id, url )`,
        )
        .eq("tenant_id", tenantId)
        .eq("is_visible", true)
        .order("display_order", { ascending: true }),
    ]);

    if (!cats || cats.length === 0) return content.partners.categories;

    const byCategory = new Map<string, PartnerRow[]>();
    for (const p of (partners ?? []) as unknown as PartnerRow[]) {
      if (!p.category_id) continue;
      const arr = byCategory.get(p.category_id) ?? [];
      arr.push(p);
      byCategory.set(p.category_id, arr);
    }

    return (cats as CatRow[]).map((cat) => ({
      title: cat.title,
      body: cat.description ?? "",
      contacts: (byCategory.get(cat.id) ?? []).map((p) => {
        const photoUrl = p.photo_media?.cloudinary_public_id
          ? cldUrl(p.photo_media.cloudinary_public_id, {
              crop: "square",
              width: 320,
              cropArea: asCropArea(p.photo_crop),
            })
          : (p.photo_media?.url || DEFAULT_PARTNER_PHOTO);
        const logoUrl = p.logo_media?.cloudinary_public_id
          ? cldUrl(p.logo_media.cloudinary_public_id, {
              width: 240,
              cropArea: asCropArea(p.logo_crop),
            })
          : (p.logo_media?.url || DEFAULT_PARTNER_LOGO);
        return {
          name: p.name,
          role: p.role ?? "",
          company: p.company ?? "",
          phone: p.phone ?? "",
          email: p.email ?? "",
          photo: photoUrl,
          logo: logoUrl,
        };
      }),
    }));
  } catch {
    return content.partners.categories;
  }
}
