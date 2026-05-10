/**
 * Cloudinary Admin API helpers — used server-side from /admin/media for
 * storage tracking and proper asset deletion.
 *
 * Requires CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET in .env.local
 * (free to grab from https://cloudinary.com/console/settings/api-keys).
 * If they're not set, the helpers fail soft so the rest of the page
 * keeps working.
 */

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const KEY = process.env.CLOUDINARY_API_KEY ?? "";
const SECRET = process.env.CLOUDINARY_API_SECRET ?? "";

function adminAuthHeader(): string | null {
  if (!CLOUD || !KEY || !SECRET) return null;
  const token = Buffer.from(`${KEY}:${SECRET}`).toString("base64");
  return `Basic ${token}`;
}

export type CloudinaryUsage = {
  configured: true;
  /** Cloudinary plan name ("Free", "Programmable Media", etc.) */
  plan: string;
  /** Storage used in bytes vs the plan's storage limit in bytes. */
  storage: { usedBytes: number; limitBytes: number; percent: number };
  /** Monthly bandwidth — caps how much your visitors can download. */
  bandwidth: { usedBytes: number; limitBytes: number; percent: number };
  /** Cloudinary "credits" — combined storage + bandwidth + transforms. */
  credits: { used: number; limit: number; percent: number };
  asOf: string;
};

export type CloudinaryUsageMissing = {
  configured: false;
  reason: string;
};

export type UsageResult = CloudinaryUsage | CloudinaryUsageMissing;

type UsageBlock = {
  usage?: number;
  limit?: number;
  used_percent?: number;
  credits_usage?: number;
};

function pct(used: number, limit: number): number {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, (used / limit) * 100);
}

/**
 * Fetches current Cloudinary plan usage (storage / bandwidth / credits).
 * Returns `{ configured: false, reason }` when credentials aren't set.
 */
export async function getCloudinaryUsage(): Promise<UsageResult> {
  const auth = adminAuthHeader();
  if (!auth) {
    return {
      configured: false,
      reason:
        "Add CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to .env.local — grab both from your Cloudinary console at Settings → API Keys.",
    };
  }
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/usage`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        configured: false,
        reason: `Cloudinary API responded ${res.status}. Double-check the API key + secret.`,
      };
    }
    const data = (await res.json()) as {
      plan?: string;
      last_updated?: string;
      storage?: UsageBlock;
      bandwidth?: UsageBlock;
      credits?: UsageBlock;
    };
    const storageUsed = data.storage?.usage ?? 0;
    const storageLimit = data.storage?.limit ?? 0;
    const bandwidthUsed = data.bandwidth?.usage ?? 0;
    const bandwidthLimit = data.bandwidth?.limit ?? 0;
    const creditsUsed = data.credits?.usage ?? 0;
    const creditsLimit = data.credits?.limit ?? 0;

    return {
      configured: true,
      plan: data.plan ?? "—",
      storage: {
        usedBytes: storageUsed,
        limitBytes: storageLimit,
        percent: pct(storageUsed, storageLimit),
      },
      bandwidth: {
        usedBytes: bandwidthUsed,
        limitBytes: bandwidthLimit,
        percent: pct(bandwidthUsed, bandwidthLimit),
      },
      credits: {
        used: creditsUsed,
        limit: creditsLimit,
        percent: pct(creditsUsed, creditsLimit),
      },
      asOf: data.last_updated ?? new Date().toISOString(),
    };
  } catch (e) {
    return {
      configured: false,
      reason: e instanceof Error ? e.message : "Unable to reach Cloudinary.",
    };
  }
}

/** Pretty-print a byte count as "1.2 GB" / "340 MB" / "12 KB". */
export function formatBytes(n: number): string {
  if (!n || n < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}

/**
 * Permanently delete an asset from Cloudinary (frees storage). Used after
 * removing the corresponding row from `public.media`. Best-effort — if
 * credentials aren't set or the API errors, the DB-side delete still
 * succeeds so the admin UI doesn't end up with orphan rows.
 */
export async function destroyCloudinaryAsset(
  publicId: string,
  resourceType: "image" | "video" = "image",
): Promise<{ ok: boolean; reason?: string }> {
  const auth = adminAuthHeader();
  if (!auth) return { ok: false, reason: "API keys not configured" };
  if (!publicId) return { ok: false, reason: "missing public_id" };
  try {
    const url =
      `https://api.cloudinary.com/v1_1/${CLOUD}/resources/${resourceType}/upload` +
      `?public_ids[]=${encodeURIComponent(publicId)}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: auth },
    });
    return { ok: res.ok, reason: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "Network error",
    };
  }
}

/** Bulk delete — loops through public_ids in batches of 100. */
export async function destroyCloudinaryAssets(
  publicIds: string[],
  resourceType: "image" | "video" = "image",
): Promise<{ ok: boolean; deleted: number; failed: number }> {
  const auth = adminAuthHeader();
  if (!auth || publicIds.length === 0)
    return { ok: false, deleted: 0, failed: publicIds.length };

  let deleted = 0;
  let failed = 0;
  // Cloudinary admin API caps `public_ids[]` at 100 per call
  for (let i = 0; i < publicIds.length; i += 100) {
    const batch = publicIds.slice(i, i + 100);
    const params = batch
      .map((id) => `public_ids[]=${encodeURIComponent(id)}`)
      .join("&");
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD}/resources/${resourceType}/upload?${params}`,
        { method: "DELETE", headers: { Authorization: auth } },
      );
      if (res.ok) {
        const json = (await res.json()) as { deleted?: Record<string, string> };
        const map = json.deleted ?? {};
        for (const id of batch) {
          if (map[id] === "deleted") deleted++;
          else failed++;
        }
      } else {
        failed += batch.length;
      }
    } catch {
      failed += batch.length;
    }
  }
  return { ok: failed === 0, deleted, failed };
}
