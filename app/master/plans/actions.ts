"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/master";

export type PlanInput = {
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  interval: "monthly" | "yearly";
  features: string[];
  is_active: boolean;
  display_order: number;
};

type Result = { ok: true; slug?: string } | { ok: false; error: string };

export async function createPlan(input: PlanInput): Promise<Result> {
  const { supabase } = await requireSuperAdmin();
  const slug = (input.slug || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]+[a-z0-9]$/.test(slug)) {
    return { ok: false, error: "Slug must be lowercase letters/digits/dashes." };
  }
  const { error } = await supabase.from("plans").insert({
    slug,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    price_cents: Math.max(0, Math.round(input.price_cents)),
    interval: input.interval,
    features: input.features,
    is_active: input.is_active,
    display_order: input.display_order,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/master/plans");
  revalidatePath("/master");
  return { ok: true, slug };
}

export async function updatePlan(id: string, input: PlanInput): Promise<Result> {
  const { supabase } = await requireSuperAdmin();
  const { error } = await supabase
    .from("plans")
    .update({
      slug: input.slug.trim().toLowerCase(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price_cents: Math.max(0, Math.round(input.price_cents)),
      interval: input.interval,
      features: input.features,
      is_active: input.is_active,
      display_order: input.display_order,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/master/plans");
  return { ok: true, slug: input.slug.trim().toLowerCase() };
}

export async function deletePlan(id: string): Promise<Result> {
  const { supabase } = await requireSuperAdmin();
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/master/plans");
  return { ok: true };
}
