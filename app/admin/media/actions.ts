"use server";

/**
 * Server actions for the Media Library.
 *
 *   saveImageRecord(...)       — after a successful Cloudinary upload, store
 *                                the row in `public.media`.
 *   saveYouTubeRecord(url)     — parse + store a YouTube background.
 *   updateMediaAlt(id, alt)    — edit alt text inline.
 *   deleteMedia(id)            — remove from `public.media` AND destroy the
 *                                underlying Cloudinary asset (frees storage).
 *   deleteMediaMany(ids[])     — bulk version, used by the library checkbox UI.
 */

import { revalidatePath } from "next/cache";
import { requireTenantUser } from "@/lib/auth";
import { parseYouTubeId, youTubeWatchUrl } from "@/lib/cloudinary";
import {
  destroyCloudinaryAsset,
  destroyCloudinaryAssets,
} from "@/lib/cloudinaryAdmin";

type Result = { ok: true; id: string } | { ok: false; error: string };
type SimpleResult = { ok: true } | { ok: false; error: string };

export async function saveImageRecord(input: {
  publicId: string;
  url: string;
  width: number;
  height: number;
  alt?: string;
}): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId, user } = auth;

  const { data, error } = await supabase
    .from("media")
    .insert({
      tenant_id: tenantId,
      kind: "image",
      cloudinary_public_id: input.publicId,
      url: input.url,
      width: input.width,
      height: input.height,
      alt: input.alt ?? null,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Save failed." };

  revalidatePath("/admin/media");
  return { ok: true, id: data.id };
}

export async function saveYouTubeRecord(input: {
  url: string;
  alt?: string;
}): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId, user } = auth;

  const id = parseYouTubeId(input.url);
  if (!id) return { ok: false, error: "Couldn't parse a YouTube video ID from that URL." };

  const { data, error } = await supabase
    .from("media")
    .insert({
      tenant_id: tenantId,
      kind: "youtube",
      cloudinary_public_id: id,
      url: youTubeWatchUrl(id),
      alt: input.alt ?? null,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Save failed." };

  revalidatePath("/admin/media");
  return { ok: true, id: data.id };
}

export async function updateMediaAlt(
  id: string,
  alt: string,
): Promise<SimpleResult> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { error } = await supabase
    .from("media")
    .update({ alt })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/media");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteMedia(id: string): Promise<SimpleResult> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  // Look up the public_id + kind so we can free the actual Cloudinary asset.
  const { data: row } = await supabase
    .from("media")
    .select("cloudinary_public_id, kind")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const { error } = await supabase
    .from("media")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, error: error.message };

  // YouTube rows have no Cloudinary asset to clean up.
  if (row?.cloudinary_public_id && row.kind === "image") {
    await destroyCloudinaryAsset(row.cloudinary_public_id, "image");
  }

  revalidatePath("/admin/media");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteMediaMany(
  ids: string[],
): Promise<{ ok: boolean; deleted: number; failed: number; error?: string }> {
  if (!ids || ids.length === 0) {
    return { ok: false, deleted: 0, failed: 0, error: "Nothing selected." };
  }
  const auth = await requireTenantUser();
  if (!auth.ok) {
    return { ok: false, deleted: 0, failed: ids.length, error: auth.error };
  }
  const { supabase, tenantId } = auth;

  // Fetch public_ids before delete so we can free Cloudinary storage after.
  const { data: rows } = await supabase
    .from("media")
    .select("id, cloudinary_public_id, kind")
    .in("id", ids)
    .eq("tenant_id", tenantId);

  const { error } = await supabase
    .from("media")
    .delete()
    .in("id", ids)
    .eq("tenant_id", tenantId);
  if (error) {
    return { ok: false, deleted: 0, failed: ids.length, error: error.message };
  }

  const cloudinaryIds = (rows ?? [])
    .filter((r) => r.kind === "image" && r.cloudinary_public_id)
    .map((r) => r.cloudinary_public_id as string);

  let cloudinaryFailed = 0;
  if (cloudinaryIds.length > 0) {
    const result = await destroyCloudinaryAssets(cloudinaryIds, "image");
    cloudinaryFailed = result.failed;
  }

  revalidatePath("/admin/media");
  revalidatePath("/", "layout");

  return {
    ok: true,
    deleted: ids.length,
    failed: cloudinaryFailed, // DB rows always succeeded; this counts orphaned Cloudinary files
  };
}
