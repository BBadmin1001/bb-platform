"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTenantUser } from "@/lib/auth";
import type { CropArea } from "@/components/admin/media/CropEditor";

type Result = { ok: true } | { ok: false; error: string };

export type CommunityInput = {
  slug: string;
  name: string;
  state: string;
  tagline: string;
  about: string;
  market_year_summary: string;
  samina_quote: string;
  median_price: string;
  yoy_change: string;
  yoy_direction: "up" | "down" | "flat";
  days_on_market: string;
  market_type: string;
  data_year: number;
  image_id: string | null;
  /** User-applied crop window for the community card photo (0–1 pcts). */
  image_crop: CropArea | null;
  /** Optional override — if set, the /communities/[slug] hero uses this
   *  photo instead of `image_id`. Lets you keep a tight square for the card
   *  grid and a wider hero shot for the detail page. */
  hero_image_id: string | null;
  /** User-applied crop window for the hero photo (0–1 pcts). */
  hero_image_crop: CropArea | null;
  is_visible: boolean;
  price_tiers: { tier: string; description: string }[];
  life: { schools: string; parks: string; dining: string; commute: string };
};

export async function upsertCommunity(
  input: CommunityInput,
  existingId?: string,
): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const payload = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  const query = existingId
    ? supabase
        .from("communities")
        .update(payload)
        .eq("id", existingId)
        .eq("tenant_id", tenantId)
    : supabase.from("communities").insert({ tenant_id: tenantId, ...payload });

  const { error } = await query;
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/communities");
  revalidatePath(`/communities/${input.slug}`);
  revalidatePath("/communities");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCommunity(id: string): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { error } = await supabase
    .from("communities")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/communities");
  revalidatePath("/communities");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function reorderCommunities(
  orderedIds: string[],
): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  // Apply each row's new display_order in parallel
  const updates = orderedIds.map((id, idx) =>
    supabase.from("communities").update({ display_order: idx }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const firstErr = results.find((r) => r.error);
  if (firstErr?.error) return { ok: false, error: firstErr.error.message };

  revalidatePath("/admin/communities");
  revalidatePath("/communities");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleCommunityVisibility(
  id: string,
  visible: boolean,
): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { error } = await supabase
    .from("communities")
    .update({ is_visible: visible })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/communities");
  revalidatePath("/communities");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * One-shot seed: upsert all 6 default communities from `lib/communities.ts`
 * into the DB so the admin has rows to edit. Idempotent — re-running is safe
 * and won't overwrite admin edits because we use ON CONFLICT (slug) DO NOTHING.
 *
 * Wired to a "Seed defaults" button on the empty list state.
 */
export async function seedDefaultCommunities(): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { communities: staticOnes } = await import("@/lib/communities");

  // Insert only those slugs not already present FOR THIS TENANT.
  // RLS already restricts to has_tenant_access(tenant_id) but explicit
  // is clearer.
  const { data: existing } = await supabase
    .from("communities")
    .select("slug")
    .eq("tenant_id", tenantId);
  const existingSlugs = new Set((existing ?? []).map((r) => r.slug));

  const toInsert = staticOnes
    .filter((c) => !existingSlugs.has(c.slug))
    .map((c, idx) => ({
      tenant_id: tenantId,
      slug: c.slug,
      name: c.name,
      state: c.state,
      tagline: c.tagline,
      about: c.about,
      market_year_summary: c.market2026,
      samina_quote: c.saminaQuote,
      median_price: c.median,
      yoy_change: c.yoy,
      yoy_direction: c.yoyDirection,
      days_on_market: c.dom,
      market_type: c.marketType,
      data_year: 2026,
      display_order: idx,
      is_visible: true,
      price_tiers: c.priceTiers,
      life: c.life,
      image_crop: null,
      hero_image_crop: null,
    }));

  if (toInsert.length === 0) {
    return { ok: false, error: "Defaults already seeded — nothing to add." };
  }

  const { error } = await supabase.from("communities").insert(toInsert);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/communities");
  revalidatePath("/communities");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function navigateToEditor(slug: string) {
  redirect(`/admin/communities/${slug}`);
}
