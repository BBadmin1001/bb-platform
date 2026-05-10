/**
 * Cloudinary URL builder + upload helpers.
 *
 * We don't pull in the cloudinary SDK on the client — image transformations
 * are pure URL composition. This keeps the bundle thin and the API keys
 * server-side only (the API key/secret are never used for reads).
 *
 * Transform vocabulary (just what we need):
 *   - crop variants: 1:1 (square), 3:4 (portrait), 4:3 (landscape), 16:9 (wide)
 *   - background removal (Cloudinary AI add-on)
 *   - max-width sizing for responsive delivery
 *   - quality auto, format auto
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
export const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

export type CropPreset = "square" | "portrait" | "landscape" | "wide" | "free";

const ASPECT_FOR: Record<CropPreset, string | null> = {
  square: "1:1",
  portrait: "3:4",
  landscape: "4:3",
  wide: "16:9",
  free: null,
};

export type CldOptions = {
  /** Force an aspect-ratio crop (auto-gravity selects best subject) */
  crop?: CropPreset;
  /** Apply Cloudinary AI background removal. Returns transparent PNG. */
  removeBackground?: boolean;
  /** Max delivered width in pixels (DPR is layered on top automatically). */
  width?: number;
  /** Max delivered height in pixels. */
  height?: number;
  /** Override the gravity used by aspect-ratio crops. Default 'auto'. */
  gravity?: "auto" | "face" | "faces" | "center";
  /**
   * User-defined crop window from the admin Crop Editor. All values 0–1,
   * percentages of the source image. When set, applied as `c_crop,...`
   * BEFORE the aspect-ratio fill, so the user's framing wins over auto.
   */
  cropArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /**
   * Bake a circular mask into the delivered image (transparent corners).
   * Forces f_png since alpha transparency is required. Used by getFavicon()
   * so the browser-tab favicon actually renders round, not square.
   * Pair with `crop: "square"` for a perfect circle.
   */
  circle?: boolean;
};

/**
 * Build a Cloudinary delivery URL from a public_id + options.
 *
 *   cldUrl("hero/woodbridge", { crop: "wide", width: 1920 })
 *   → https://res.cloudinary.com/<cloud>/image/upload/c_fill,ar_16:9,g_auto,w_1920,q_auto,f_auto/hero/woodbridge
 */
export function cldUrl(publicId: string, opts: CldOptions = {}): string {
  if (!CLOUD_NAME) return ""; // Fail soft — caller should fall back
  if (!publicId) return "";

  // We use Cloudinary's "chained transformations" — each "/"-separated
  // segment runs in sequence. With a user-defined crop window, we put it
  // FIRST so the explicit framing wins, then chain a fill-by-aspect-ratio
  // resize for delivery.
  const segments: string[][] = [];

  // 1) User-defined crop (if any) — applied first against the original
  if (
    opts.cropArea &&
    opts.cropArea.width > 0 &&
    opts.cropArea.height > 0
  ) {
    const c = opts.cropArea;
    // Cloudinary accepts decimals 0–1 as percentages of the source dimensions
    segments.push([
      "c_crop",
      `x_${roundDec(c.x)}`,
      `y_${roundDec(c.y)}`,
      `w_${roundDec(c.width)}`,
      `h_${roundDec(c.height)}`,
    ]);
  }

  // 2) Aspect-ratio fill / format / size for final delivery
  const finalSegment: string[] = [];
  if (opts.removeBackground) {
    finalSegment.push("e_background_removal", "f_png");
  } else if (opts.circle) {
    // Circular mask requires alpha transparency; PNG is the safest target.
    finalSegment.push("f_png");
  } else {
    finalSegment.push("f_auto");
  }
  if (opts.crop && opts.crop !== "free") {
    const ar = ASPECT_FOR[opts.crop];
    if (ar) {
      finalSegment.push("c_fill", `ar_${ar}`, `g_${opts.gravity ?? "auto"}`);
    }
  }
  if (opts.width) finalSegment.push(`w_${opts.width}`);
  if (opts.height) finalSegment.push(`h_${opts.height}`);
  // r_max + transparent corners → circular delivery. Applied AFTER the
  // aspect-ratio fill so the mask sits on the final framed pixel rect.
  if (opts.circle) finalSegment.push("r_max");
  // Quality + retina:
  //  q_90      — explicit 90% quality (visually indistinguishable from
  //              original on photos, ~2-3× smaller than uncompressed).
  //              Higher than Cloudinary's default q_auto:best.
  //  dpr_auto  — when the browser sends Sec-CH-DPR (Chrome / Edge / Safari
  //              do, with the Accept-CH header set in next.config), Cloudinary
  //              serves 2× / 3× variants on retina screens. Falls back to 1×
  //              gracefully when the hint isn't sent.
  finalSegment.push("q_90", "dpr_auto");
  segments.push(finalSegment);

  const transform = segments.map((s) => s.join(",")).join("/");
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transform}/${publicId}`;
}

function roundDec(n: number): string {
  // 4 decimals is plenty for crop coords; keep URLs readable
  return Number(n.toFixed(4)).toString();
}

/**
 * Are we configured to upload? Used to gate UI that depends on Cloudinary.
 */
export function cloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

/**
 * Direct unsigned upload to Cloudinary from the browser. Returns the parsed
 * Cloudinary response. The /admin route is auth-protected, so unsigned is
 * acceptable here — we still recommend a tightly-scoped upload preset
 * (folder restriction, max file size, allowed formats).
 */
export async function uploadToCloudinary(file: File): Promise<{
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
}> {
  if (!cloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured. Check .env.local.");
  }

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
    { method: "POST", body: fd },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Extract a YouTube video ID from a URL or raw ID. Returns null if invalid.
 *   "https://www.youtube.com/watch?v=dQw4w9WgXcQ" → "dQw4w9WgXcQ"
 *   "https://youtu.be/dQw4w9WgXcQ" → "dQw4w9WgXcQ"
 *   "dQw4w9WgXcQ" → "dQw4w9WgXcQ"
 */
export function parseYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // 11-char ID format
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "");
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      // /embed/<id> or /shorts/<id>
      const m = u.pathname.match(/\/(embed|shorts)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {
    // not a URL — fall through
  }
  return null;
}

export function youTubeThumbnail(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export function youTubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/**
 * Embed URL for muted autoplay loop (the hero/background video pattern).
 */
export function youTubeBackgroundEmbed(id: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: id, // required for loop=1 to work on YouTube embeds
    controls: "0",
    showinfo: "0",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
