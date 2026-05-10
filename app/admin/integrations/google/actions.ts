"use server";

/**
 * Google Places integration — server actions.
 *
 *   testGoogleConnection(apiKey, placeId)  — preview-only, doesn't persist.
 *                                            Used by the wizard's "Test"
 *                                            button to validate creds.
 *   saveGoogleIntegration(apiKey, placeId) — persists creds + runs first sync.
 *   disconnectGoogle()                     — clears creds + disables.
 *   syncGoogleReviewsNow()                 — runs the sync immediately.
 *                                            Tenant-scoped — pulls + writes
 *                                            against the current tenant only.
 */

import { revalidatePath } from "next/cache";
import { requireTenantUser } from "@/lib/auth";
import {
  fetchPlaceWithReviews,
  GooglePlacesError,
  type NormalizedGoogleReview,
} from "@/lib/googlePlaces";
import { getGoogleIntegration } from "@/lib/integrationStore";

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ─────────────────────── 1. Test connection ─────────────────────

export async function testGoogleConnection(
  apiKey: string,
  placeId: string,
): Promise<
  ActionResult<{
    placeName: string;
    rating: number;
    reviewCount: number;
    sample: { author: string; rating: number; text: string }[];
  }>
> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!apiKey?.trim()) return { ok: false, error: "Paste your Google API key." };
  if (!placeId?.trim()) return { ok: false, error: "Paste your Place ID." };

  try {
    const place = await fetchPlaceWithReviews(placeId.trim(), apiKey.trim());
    return {
      ok: true,
      data: {
        placeName: place.displayName,
        rating: place.rating,
        reviewCount: place.userRatingCount,
        sample: place.reviews.slice(0, 3).map((r) => ({
          author: r.authorName,
          rating: r.rating,
          text: r.text.slice(0, 120),
        })),
      },
    };
  } catch (e) {
    if (e instanceof GooglePlacesError) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: "Couldn't reach Google. Check your network and try again." };
  }
}

// ─────────────────────── 2. Save + first sync ───────────────────

export async function saveGoogleIntegration(
  apiKey: string,
  placeId: string,
): Promise<ActionResult<{ syncedCount: number }>> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId, user } = auth;
  if (!apiKey?.trim()) return { ok: false, error: "API key is required." };
  if (!placeId?.trim()) return { ok: false, error: "Place ID is required." };

  // Validate before saving so we don't store junk credentials
  const test = await testGoogleConnection(apiKey, placeId);
  if (!test.ok) return test;

  const { error } = await supabase.from("integrations").upsert(
    {
      tenant_id: tenantId,
      key: "google_places",
      config: {
        apiKey: apiKey.trim(),
        placeId: placeId.trim(),
        requireApproval: true,
      },
      enabled: true,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,key" },
  );
  if (error) return { ok: false, error: `Couldn't save: ${error.message}` };

  // Kick off the first sync immediately so the wizard can show "Synced N reviews"
  const sync = await syncGoogleReviewsNow();
  if (!sync.ok) {
    return {
      ok: true,
      data: { syncedCount: 0 },
    };
  }

  revalidatePath("/admin/integrations/google");
  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  return { ok: true, data: { syncedCount: sync.data?.synced ?? 0 } };
}

// ─────────────────────── 3. Disconnect ──────────────────────────

export async function disconnectGoogle(): Promise<ActionResult> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId, user } = auth;

  const { error } = await supabase
    .from("integrations")
    .update({
      enabled: false,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("key", "google_places");
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/integrations/google");
  return { ok: true };
}

// ─────────────────────── 4. Sync now ────────────────────────────

/**
 * Pull current Google reviews and dedupe-insert any new ones into
 * `public.reviews` with status='pending' so the admin can approve.
 *
 * Designed to be safely re-run: existing reviews (matched by external_id)
 * are skipped, never updated. That preserves the admin's approval state
 * even if Google later edits an entry.
 *
 * Returns { synced: <newly-inserted count>, total: <reviews seen> } so the
 * wizard + manual "Sync now" button can show feedback.
 *
 * NOTE: tenant-scoped via the cookie session. The cron handler (when
 * we add one) will need a separate service-role variant that takes
 * tenantId as a parameter.
 */
export async function syncGoogleReviewsNow(): Promise<
  ActionResult<{ synced: number; total: number }>
> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const integration = await getGoogleIntegration();
  if (!integration?.enabled || !integration.config?.apiKey || !integration.config?.placeId) {
    return { ok: false, error: "Google is not connected." };
  }

  let place;
  try {
    place = await fetchPlaceWithReviews(
      integration.config.placeId,
      integration.config.apiKey,
    );
  } catch (e) {
    const msg =
      e instanceof GooglePlacesError ? e.message : "Couldn't reach Google.";
    await supabase
      .from("integrations")
      .update({
        last_sync_status: "error",
        last_sync_error: msg,
        last_synced_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("key", "google_places");
    return { ok: false, error: msg };
  }

  const newReviews: NormalizedGoogleReview[] = place.reviews;

  // Dedupe — pull existing external_ids for THIS tenant in one query
  const { data: existing } = await supabase
    .from("reviews")
    .select("external_id")
    .eq("tenant_id", tenantId)
    .eq("source", "google");
  const seen = new Set((existing ?? []).map((r) => r.external_id).filter(Boolean));

  const toInsert = newReviews
    .filter((r) => !seen.has(r.externalId))
    .map((r) => ({
      tenant_id: tenantId,
      source: "google" as const,
      external_id: r.externalId,
      author_name: r.authorName,
      author_short_label: r.relativeTime || "Google review",
      rating: r.rating,
      quote: r.text,
      status: integration.config.requireApproval !== false ? "pending" : "approved",
      is_visible: integration.config.requireApproval === false, // auto-publish iff approval disabled
      written_at: r.publishedAt,
    }));

  let insertedCount = 0;
  if (toInsert.length > 0) {
    const { error } = await supabase.from("reviews").insert(toInsert);
    if (error) {
      await supabase
        .from("integrations")
        .update({
          last_sync_status: "error",
          last_sync_error: error.message,
          last_synced_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId)
        .eq("key", "google_places");
      return { ok: false, error: `DB insert failed: ${error.message}` };
    }
    insertedCount = toInsert.length;
  }

  // Mark sync success
  await supabase
    .from("integrations")
    .update({
      last_sync_status: "success",
      last_sync_error: null,
      last_synced_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("key", "google_places");

  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  revalidatePath("/", "layout");

  return { ok: true, data: { synced: insertedCount, total: newReviews.length } };
}
