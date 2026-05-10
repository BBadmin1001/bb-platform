/**
 * Content Loader — server-side helper for marketing pages.
 *
 *   const hero = await getSection("home", "hero");
 *
 * Tries Supabase first; falls back to the static defaults from `content.ts`
 * if (a) Supabase isn't configured, (b) the row doesn't exist yet, or
 * (c) the read fails. Always returns SOMETHING — pages never crash.
 *
 * The result is typed loosely as `T` (caller's expectation). The shape of
 * what's actually in the row is governed by `lib/contentRegistry.ts`.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { findSection, defaultValueFor } from "./contentRegistry";
import type { PageKey } from "./contentRegistry";
import { getCurrentTenantId } from "./tenant/context";

let cached: SupabaseClient | null = null;

/**
 * Lazy service-role client. Used to bypass RLS for public marketing reads.
 * (Equivalent to "everyone can read content" — but cleaner than a public RLS
 * policy that would also need write protection.)
 */
export function getServiceClient(): SupabaseClient | null {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }
  if (!cached) {
    cached = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );
  }
  return cached;
}

/**
 * Read one content section. Returns DB value if present, otherwise defaults.
 */
export async function getSection<T = unknown>(
  page: PageKey,
  key: string,
): Promise<T> {
  const def = findSection(page, key);
  const fallback = def ? (defaultValueFor(def) as T) : ({} as T);

  try {
    const supabase = getServiceClient();
    if (!supabase) return fallback;
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return fallback;

    const { data, error } = await supabase
      .from("content_blocks")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("page", page)
      .eq("key", key)
      .maybeSingle();

    if (error || !data?.value) return fallback;

    try {
      return JSON.parse(data.value) as T;
    } catch {
      return fallback;
    }
  } catch {
    return fallback;
  }
}

/**
 * Convenience: merge DB-overridden values back into the full nested
 * `content` shape for a page. Useful when a page has many sections and
 * you'd rather call `getPageContent("home")` once than 8 separate sections.
 *
 * Returns the same shape as `content[page]` from `lib/content.ts`.
 */
export async function getPageContent<T = Record<string, unknown>>(
  page: PageKey,
): Promise<T> {
  const { content: defaults } = await import("./content");
  const baseDefaults = (defaults as Record<string, unknown>)[page] ?? {};
  const result: Record<string, unknown> = JSON.parse(JSON.stringify(baseDefaults));

  try {
    const supabase = getServiceClient();
    if (!supabase) return result as T;
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return result as T;

    const { data, error } = await supabase
      .from("content_blocks")
      .select("key,value")
      .eq("tenant_id", tenantId)
      .eq("page", page);

    if (error || !data) return result as T;

    for (const row of data as Array<{ key: string; value: string | null }>) {
      if (!row.value) continue;
      try {
        const parsed = JSON.parse(row.value);
        // Special unwraps for primitive-wrapper sections (kept in sync with
        // contentRegistry.defaultValueFor)
        if (page === "home" && row.key === "signOff" && parsed?.text != null) {
          result["signOff"] = parsed.text;
        } else if (
          (page === "partners" && row.key === "disclaimer") ||
          (page === "contact" && row.key === "consent")
        ) {
          if (parsed?.text != null)
            (result as Record<string, unknown>)[row.key] = parsed.text;
        } else if (
          page === "contact" &&
          row.key === "submit" &&
          parsed?.label != null
        ) {
          result["submit"] = parsed.label;
        } else if (
          page === "path" &&
          (row.key === "steps" || row.key === "stats" || row.key === "faqs")
        ) {
          if (Array.isArray(parsed?.items))
            (result as Record<string, unknown>)[row.key] = parsed.items;
        } else {
          (result as Record<string, unknown>)[row.key] = parsed;
        }
      } catch {
        // skip unparseable rows — fall back to defaults already in result
      }
    }
    return result as T;
  } catch {
    return result as T;
  }
}

/**
 * Resolve an `image` content field to a delivery URL.
 *
 * The stored shape is `{ image_id: <uuid> }`. When set, look up the media
 * row and build a Cloudinary URL with the desired crop/width. When NOT set
 * (or any error along the way), return the supplied fallback URL.
 *
 * Used by every page that has an editable image — hero backgrounds, card
 * photos, dark-break backdrops, etc.
 */
export async function resolveImageUrl(
  imageField: unknown,
  options: {
    fallback: string;
    crop?: "square" | "portrait" | "landscape" | "wide" | "free";
    width?: number;
  },
): Promise<string> {
  const record =
    imageField &&
    typeof imageField === "object" &&
    !Array.isArray(imageField)
      ? (imageField as Record<string, unknown>)
      : null;

  const id =
    record && typeof record.image_id === "string"
      ? (record.image_id as string)
      : null;
  if (!id) return options.fallback;

  // Read the user-applied crop window if present (set via the in-admin
  // Crop Editor). Format: { x, y, width, height }, all 0–1 percentages of
  // the source image dimensions.
  let cropArea:
    | { x: number; y: number; width: number; height: number }
    | undefined;
  const ca = record?.cropArea;
  if (
    ca &&
    typeof ca === "object" &&
    !Array.isArray(ca) &&
    typeof (ca as Record<string, unknown>).x === "number" &&
    typeof (ca as Record<string, unknown>).y === "number" &&
    typeof (ca as Record<string, unknown>).width === "number" &&
    typeof (ca as Record<string, unknown>).height === "number"
  ) {
    cropArea = ca as {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }

  try {
    const supabase = getServiceClient();
    if (!supabase) return options.fallback;
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return options.fallback;

    const { data: media } = await supabase
      .from("media")
      .select("cloudinary_public_id, url")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();
    if (!media) return options.fallback;

    if (media.cloudinary_public_id) {
      const { cldUrl } = await import("./cloudinary");
      const crop = options.crop && options.crop !== "free" ? options.crop : undefined;
      return cldUrl(media.cloudinary_public_id, {
        crop,
        width: options.width ?? 1920,
        cropArea,
      });
    }
    return media.url || options.fallback;
  } catch {
    return options.fallback;
  }
}

/**
 * Resolve a `video` content field to a playable URL.
 *
 * Returns:
 *   { kind: "youtube", embedUrl, watchUrl, thumbnail, id }  if a YouTube
 *     row was picked, or a fallback YouTube ID was provided
 *   { kind: "fallback" }  if neither — caller renders its own default
 */
export async function resolveVideoUrl(
  videoField: unknown,
  options: { fallbackYouTubeId?: string } = {},
): Promise<
  | { kind: "youtube"; id: string; embedUrl: string; watchUrl: string; thumbnail: string }
  | { kind: "fallback" }
> {
  const id =
    videoField &&
    typeof videoField === "object" &&
    !Array.isArray(videoField) &&
    typeof (videoField as Record<string, unknown>).media_id === "string"
      ? ((videoField as Record<string, unknown>).media_id as string)
      : null;

  let youTubeId: string | null = null;

  if (id) {
    try {
      const supabase = getServiceClient();
      const tenantId = await getCurrentTenantId();
      if (supabase && tenantId) {
        const { data: media } = await supabase
          .from("media")
          .select("kind, cloudinary_public_id")
          .eq("tenant_id", tenantId)
          .eq("id", id)
          .maybeSingle();
        if (
          media?.kind === "youtube" &&
          typeof media.cloudinary_public_id === "string"
        ) {
          youTubeId = media.cloudinary_public_id;
        }
      }
    } catch {
      // fall through to fallback
    }
  }

  if (!youTubeId && options.fallbackYouTubeId) {
    youTubeId = options.fallbackYouTubeId;
  }

  if (!youTubeId) return { kind: "fallback" };

  const { youTubeBackgroundEmbed, youTubeWatchUrl, youTubeThumbnail } =
    await import("./cloudinary");
  return {
    kind: "youtube",
    id: youTubeId,
    embedUrl: youTubeBackgroundEmbed(youTubeId),
    watchUrl: youTubeWatchUrl(youTubeId),
    thumbnail: youTubeThumbnail(youTubeId),
  };
}

/**
 * Brand identity is special — it lives at `content.brand` in the static
 * defaults. Cleanest accessor for site-wide use.
 */
export async function getBrand() {
  return getSection<{
    name: string;
    role: string;
    brokerage: string;
    tagline: string;
    serviceArea: string;
    languages: string[];
  }>("brand", "identity");
}

/**
 * Resolve the brand portrait image. Returns Cloudinary URLs at the two
 * sizes used site-wide:
 *   - `full`    — high-res for hero backgrounds + bio (3:4 portrait crop)
 *   - `avatar`  — small square for header / footer / menu (1:1 square)
 *
 * Falls back to the static portrait paths from `lib/site.ts` when:
 *   • No portrait has been picked in admin yet
 *   • Supabase isn't configured
 *   • The picked media row has been deleted
 */
export async function getPortrait(): Promise<{ full: string; avatar: string }> {
  const { site } = await import("./site");
  const fallback = { full: site.portrait.full, avatar: site.portrait.avatar };

  try {
    const supabase = getServiceClient();
    if (!supabase) return fallback;
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return fallback;

    // 1. Read the brand.portrait row from content_blocks
    const { data: row } = await supabase
      .from("content_blocks")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("page", "brand")
      .eq("key", "portrait")
      .maybeSingle();
    if (!row?.value) return fallback;

    let imageId: string | null = null;
    try {
      const parsed = JSON.parse(row.value) as { portrait?: { image_id?: string } };
      imageId = parsed?.portrait?.image_id ?? null;
    } catch {
      return fallback;
    }
    if (!imageId) return fallback;

    // 2. Look up the media row to get the Cloudinary public_id
    const { data: media } = await supabase
      .from("media")
      .select("cloudinary_public_id, url")
      .eq("tenant_id", tenantId)
      .eq("id", imageId)
      .maybeSingle();
    if (!media) return fallback;

    const { cldUrl } = await import("./cloudinary");
    if (media.cloudinary_public_id) {
      return {
        full: cldUrl(media.cloudinary_public_id, { crop: "portrait", width: 1600 }),
        avatar: cldUrl(media.cloudinary_public_id, { crop: "square", width: 240 }),
      };
    }
    // Fallback: non-Cloudinary URL — same URL for both
    return { full: media.url, avatar: media.url };
  } catch {
    return fallback;
  }
}

/**
 * Generic "look up a single image picked in admin under a given brand
 * section" helper. Each new brand section (brokerLogo, favicon,
 * featuredImage) adds one image — this resolves the picked media row to
 * a Cloudinary URL with the desired delivery options, falling back to
 * the supplied URL when nothing has been picked yet.
 */
async function resolveBrandImage(
  sectionKey: string,
  fieldName: string,
  fallbackUrl: string,
  delivery: {
    crop?: "square" | "portrait" | "landscape" | "wide" | "free";
    width?: number;
  } = {},
): Promise<string> {
  try {
    const supabase = getServiceClient();
    if (!supabase) return fallbackUrl;
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return fallbackUrl;
    const { data: row } = await supabase
      .from("content_blocks")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("page", "brand")
      .eq("key", sectionKey)
      .maybeSingle();
    if (!row?.value) return fallbackUrl;

    let imageId: string | null = null;
    try {
      const parsed = JSON.parse(row.value) as Record<
        string,
        { image_id?: string }
      >;
      imageId = parsed?.[fieldName]?.image_id ?? null;
    } catch {
      return fallbackUrl;
    }
    if (!imageId) return fallbackUrl;

    const { data: media } = await supabase
      .from("media")
      .select("cloudinary_public_id, url")
      .eq("tenant_id", tenantId)
      .eq("id", imageId)
      .maybeSingle();
    if (!media) return fallbackUrl;

    if (media.cloudinary_public_id) {
      const { cldUrl } = await import("./cloudinary");
      return cldUrl(media.cloudinary_public_id, {
        crop: delivery.crop && delivery.crop !== "free" ? delivery.crop : undefined,
        width: delivery.width ?? 1200,
      });
    }
    return media.url || fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

/** Brokerage logo — used on the open-house flyer header band etc. */
export async function getBrokerLogo(): Promise<string> {
  return resolveBrandImage(
    "brokerLogo",
    "logo",
    "/images/Remax%20Galaxy.png",
    { width: 480 },
  );
}

/**
 * Resolve the Cloudinary public_id of a picked brand image (without building
 * the URL). Used when callers need to layer custom transforms on top —
 * e.g. the favicon needs `r_max` (circular mask) which has to be chained
 * inside cldUrl(), not bolted onto a finished URL.
 */
async function resolveBrandImagePublicId(
  sectionKey: string,
  fieldName: string,
): Promise<{ publicId: string; url: string } | null> {
  try {
    const supabase = getServiceClient();
    if (!supabase) return null;
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return null;
    const { data: row } = await supabase
      .from("content_blocks")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("page", "brand")
      .eq("key", sectionKey)
      .maybeSingle();
    if (!row?.value) return null;

    let imageId: string | null = null;
    try {
      const parsed = JSON.parse(row.value) as Record<
        string,
        { image_id?: string }
      >;
      imageId = parsed?.[fieldName]?.image_id ?? null;
    } catch {
      return null;
    }
    if (!imageId) return null;

    const { data: media } = await supabase
      .from("media")
      .select("cloudinary_public_id, url")
      .eq("tenant_id", tenantId)
      .eq("id", imageId)
      .maybeSingle();
    if (!media?.cloudinary_public_id) return null;
    return { publicId: media.cloudinary_public_id, url: media.url ?? "" };
  } catch {
    return null;
  }
}

/**
 * Favicon — delivered as a circular PNG with transparent corners so it
 * actually renders round on the browser tab (not just inside the admin
 * picker preview). Falls back to the realtor portrait when no favicon
 * has been picked, then to the static portrait path as a last resort.
 */
export async function getFavicon(): Promise<string> {
  const { cldUrl } = await import("./cloudinary");

  // 1) Explicit favicon section
  const favicon = await resolveBrandImagePublicId("favicon", "icon");
  if (favicon) {
    return cldUrl(favicon.publicId, {
      crop: "square",
      width: 256,
      circle: true,
    });
  }

  // 2) Fall through to the realtor portrait
  const portrait = await resolveBrandImagePublicId("portrait", "portrait");
  if (portrait) {
    return cldUrl(portrait.publicId, {
      crop: "square",
      width: 256,
      circle: true,
    });
  }

  // 3) No Cloudinary asset → fall back to the static path. Will render
  // square in the tab until the admin uploads a real favicon.
  const staticPortrait = await getPortrait();
  return staticPortrait.avatar;
}

/** Site-wide social-share image (default OG image). */
export async function getFeaturedImage(): Promise<string> {
  return resolveBrandImage(
    "featuredImage",
    "image",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=85",
    { crop: "wide", width: 1200 },
  );
}
