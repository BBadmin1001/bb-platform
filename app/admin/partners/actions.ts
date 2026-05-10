"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantUser } from "@/lib/auth";
import type { CropArea } from "@/components/admin/media/CropEditor";

type Result = { ok: true; id?: string } | { ok: false; error: string };

// =============================================================================
// CATEGORIES
// =============================================================================

export async function createCategory(input: {
  title: string;
  description: string;
}): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { data: existing } = await supabase
    .from("partner_categories")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (existing?.display_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("partner_categories")
    .insert({ tenant_id: tenantId, ...input, display_order: nextOrder, is_visible: true })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };

  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  return { ok: true, id: data.id };
}

export async function updateCategory(
  id: string,
  input: { title: string; description: string; is_visible: boolean },
): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { error } = await supabase
    .from("partner_categories")
    .update(input)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { error } = await supabase
    .from("partner_categories")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  return { ok: true };
}

export async function reorderCategories(orderedIds: string[]): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const updates = orderedIds.map((id, idx) =>
    supabase
      .from("partner_categories")
      .update({ display_order: idx })
      .eq("id", id),
  );
  const results = await Promise.all(updates);
  const firstErr = results.find((r) => r.error);
  if (firstErr?.error) return { ok: false, error: firstErr.error.message };

  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  return { ok: true };
}

// =============================================================================
// PARTNERS
// =============================================================================

export type PartnerFormInput = {
  category_id: string | null;
  name: string;
  role: string;
  company: string;
  phone: string;
  email: string;
  is_visible: boolean;
  photo_id: string | null;
  photo_crop: CropArea | null;
  logo_id: string | null;
  logo_crop: CropArea | null;
};

export async function createPartner(input: PartnerFormInput): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { data: existing } = await supabase
    .from("partners")
    .select("display_order")
    .eq("category_id", input.category_id ?? "")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (existing?.display_order ?? -1) + 1;

  const { error } = await supabase
    .from("partners")
    .insert({ tenant_id: tenantId, ...input, display_order: nextOrder });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  return { ok: true };
}

export async function updatePartner(
  id: string,
  input: PartnerFormInput,
): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { error } = await supabase.from("partners").update(input).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  return { ok: true };
}

export async function deletePartner(id: string): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  return { ok: true };
}

/**
 * One-shot seed: copies the default categories + partner placeholders from
 * lib/content.ts into the DB so admin has rows to edit.
 */
export async function seedDefaultPartners(): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { content } = await import("@/lib/content");

  const { data: existingCats } = await supabase
    .from("partner_categories")
    .select("title");
  const existingTitles = new Set(
    (existingCats ?? []).map((c) => (c.title as string).toLowerCase()),
  );

  let inserted = 0;
  for (let i = 0; i < content.partners.categories.length; i++) {
    const cat = content.partners.categories[i];
    if (existingTitles.has(cat.title.toLowerCase())) continue;

    const { data, error } = await supabase
      .from("partner_categories")
      .insert({
        tenant_id: tenantId,
        title: cat.title,
        description: cat.body,
        display_order: i,
        is_visible: true,
      })
      .select("id")
      .single();
    if (error || !data) continue;
    inserted++;

    const partners = cat.contacts.map((c, idx) => ({
      category_id: data.id,
      name: c.name,
      role: c.role,
      company: c.company,
      phone: c.phone,
      email: c.email,
      display_order: idx,
      is_visible: true,
    }));
    if (partners.length > 0) {
      await supabase.from("partners").insert(partners);
    }
  }

  revalidatePath("/admin/partners");
  revalidatePath("/partners");

  if (inserted === 0) {
    return { ok: false, error: "Defaults already seeded — nothing to add." };
  }
  return { ok: true };
}
