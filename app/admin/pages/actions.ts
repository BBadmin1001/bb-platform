"use server";

/**
 * Tenant-side actions for editing custom pages.
 *
 *   updateCustomPage(pageId, patch)  — body, title, metaDescription,
 *                                      is_published, show_in_nav, order
 *
 * Realtors CANNOT create or delete pages — those are super-admin
 * operations behind the /master dashboard. Realtors can:
 *   • edit the title (rename freely)
 *   • write / rewrite the body (markdown)
 *   • set the meta description (SEO)
 *   • publish / unpublish
 *   • surface in nav or hide it
 *   • reorder (when there's more than one)
 */

import { revalidatePath } from "next/cache";
import { requireTenantUser } from "@/lib/auth";

type Result = { ok: true } | { ok: false; error: string };

export type CustomPagePatch = {
  title?: string;
  body_md?: string;
  meta_description?: string | null;
  is_published?: boolean;
  show_in_nav?: boolean;
  display_order?: number;
};

export async function updateCustomPage(
  pageId: string,
  patch: CustomPagePatch,
): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  // Build the update — strip undefined keys so we don't blank fields
  // the realtor didn't touch.
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.body_md !== undefined) updates.body_md = patch.body_md;
  if (patch.meta_description !== undefined) {
    updates.meta_description = patch.meta_description?.trim() || null;
  }
  if (patch.is_published !== undefined) updates.is_published = patch.is_published;
  if (patch.show_in_nav !== undefined) updates.show_in_nav = patch.show_in_nav;
  if (patch.display_order !== undefined) updates.display_order = patch.display_order;

  if (typeof updates.title === "string" && !updates.title) {
    return { ok: false, error: "Title can't be blank." };
  }

  // Tenant-scope guard: the RLS policy already enforces this, but
  // belt-and-suspenders — we filter the update by tenant_id too.
  const { error } = await supabase
    .from("custom_pages")
    .update(updates)
    .eq("id", pageId)
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/pages");
  // Bust the public-facing route too so the next visitor sees the new
  // content immediately.
  revalidatePath("/p", "layout");
  return { ok: true };
}
