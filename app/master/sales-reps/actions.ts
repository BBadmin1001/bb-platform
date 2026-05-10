"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/master";

type Result = { ok: true; slug?: string } | { ok: false; error: string };

/**
 * Create or update a sales rep. Slug is required and unique — it's
 * what appears in their tracked link (?ref=<slug>).
 */
export async function upsertSalesRep(input: {
  id?: string; // present on edits
  slug: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  notes: string | null;
}): Promise<Result> {
  const { supabase } = await requireSuperAdmin();

  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
    return {
      ok: false,
      error:
        "Slug must be lowercase letters, numbers, or dashes (no leading or trailing dash).",
    };
  }
  if (!input.full_name.trim()) {
    return { ok: false, error: "Full name is required." };
  }

  if (input.id) {
    const { error } = await supabase
      .from("sales_reps")
      .update({
        slug,
        full_name: input.full_name.trim(),
        email: input.email?.trim().toLowerCase() || null,
        is_active: input.is_active,
        notes: input.notes?.trim() || null,
      })
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("sales_reps").insert({
      slug,
      full_name: input.full_name.trim(),
      email: input.email?.trim().toLowerCase() || null,
      is_active: input.is_active,
      notes: input.notes?.trim() || null,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/master/sales-reps");
  return { ok: true, slug };
}

export async function deleteSalesRep(id: string): Promise<Result> {
  const { supabase } = await requireSuperAdmin();
  const { error } = await supabase.from("sales_reps").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/master/sales-reps");
  return { ok: true };
}
