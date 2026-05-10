"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantUser } from "@/lib/auth";
import type { CropArea } from "@/components/admin/media/CropEditor";

type Result = { ok: true } | { ok: false; error: string };

export type ClosingInput = {
  image_id: string | null;
  image_crop: CropArea | null;
  neighborhood: string;
  city: string;
  state: string;
  closed_year: number;
  is_visible: boolean;
};

export async function createClosing(input: ClosingInput): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  // Append at end of order
  const { data: existing } = await supabase
    .from("closings")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (existing?.display_order ?? -1) + 1;

  const { error } = await supabase
    .from("closings")
    .insert({ tenant_id: tenantId, ...input, display_order: nextOrder });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/closings");
  revalidatePath("/closings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateClosing(
  id: string,
  input: ClosingInput,
): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { error } = await supabase.from("closings").update(input).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/closings");
  revalidatePath("/closings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteClosing(id: string): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { error } = await supabase.from("closings").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/closings");
  revalidatePath("/closings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function reorderClosings(orderedIds: string[]): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const updates = orderedIds.map((id, idx) =>
    supabase.from("closings").update({ display_order: idx }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const firstErr = results.find((r) => r.error);
  if (firstErr?.error) return { ok: false, error: firstErr.error.message };

  revalidatePath("/admin/closings");
  revalidatePath("/closings");
  revalidatePath("/", "layout");
  return { ok: true };
}
