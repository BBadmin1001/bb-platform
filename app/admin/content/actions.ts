"use server";

/**
 * Server actions for content editing.
 *
 *   saveSection(page, key, value)  — upserts content_blocks row + writes history
 *   restoreFromHistory(historyId)  — rolls back to a prior version
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTenantUser } from "@/lib/auth";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveSection(
  page: string,
  key: string,
  valueJson: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Validate JSON shape — block obvious garbage
  try {
    JSON.parse(valueJson);
  } catch {
    return { ok: false, error: "Invalid JSON payload." };
  }

  // 1. Upsert the block
  const { data: block, error: upsertErr } = await supabase
    .from("content_blocks")
    .upsert(
      { page, key, value: valueJson, updated_by: user.id, updated_at: new Date().toISOString() },
      { onConflict: "page,key" },
    )
    .select("id")
    .single();

  if (upsertErr || !block) {
    return { ok: false, error: upsertErr?.message ?? "Save failed." };
  }

  // 2. Append to history (best-effort — don't fail the save if history fails)
  await supabase.from("content_history").insert({
    tenant_id: tenantId,
    block_id: block.id,
    page,
    key,
    value: valueJson,
    saved_by: user.id,
  });

  // 3. Bust caches so the marketing site picks up the new value
  revalidatePath("/", "layout");

  return { ok: true };
}

export async function restoreFromHistory(historyId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: hist, error: histErr } = await supabase
    .from("content_history")
    .select("page,key,value")
    .eq("id", historyId)
    .single();

  if (histErr || !hist) {
    return { ok: false, error: histErr?.message ?? "History entry not found." };
  }

  return saveSection(hist.page, hist.key, hist.value ?? "{}");
}

/**
 * Discard local edits — re-reads the section from DB. Used by the editor
 * after Save to bounce back to a fresh page.
 */
export async function refreshContentRoute(page: string, key: string) {
  revalidatePath(`/admin/content/${page}/${key}`);
  revalidatePath("/", "layout");
  redirect(`/admin/content/${page}`);
}
