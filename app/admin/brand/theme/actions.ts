"use server";

/**
 * Server action — saves the brand theme to content_blocks(brand, theme).
 * The same shape <BrandThemeStyle> reads from on every page render.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantUser } from "@/lib/auth";
import type { BrandTheme } from "@/lib/brandTheme";

type Result = { ok: true } | { ok: false; error: string };

export async function saveBrandTheme(theme: BrandTheme): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Light validation — primary/surface must look like hex.
  const hexRe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  if (!hexRe.test(theme.primary)) {
    return { ok: false, error: "Primary color must be a hex value like #142840." };
  }
  if (!hexRe.test(theme.surface)) {
    return { ok: false, error: "Surface color must be a hex value like #F2EFEA." };
  }

  const value = JSON.stringify({
    primary: theme.primary,
    surface: theme.surface,
    primaryGradient: theme.primaryGradient ?? "",
    surfaceGradient: theme.surfaceGradient ?? "",
  });

  const { error } = await supabase
    .from("content_blocks")
    .upsert(
      {
        page: "brand",
        key: "theme",
        value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "page,key" },
    );
  if (error) return { ok: false, error: error.message };

  // Bust caches so every page re-renders with the new theme on next request.
  revalidatePath("/", "layout");
  return { ok: true };
}
