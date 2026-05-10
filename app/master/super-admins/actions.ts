"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/master";

type Result = { ok: true } | { ok: false; error: string };

export async function addSuperAdmin(
  email: string,
  notes: string | null,
): Promise<Result> {
  const { supabase, user: actor } = await requireSuperAdmin();

  // Look up user by email via a join on auth.users — Supabase exposes
  // it via the listUsers admin API in JS. Without service-role we use
  // the database directly through a view or a function. For now we
  // require the target user to already have an auth row, and we look
  // them up via an RPC on auth.users (allowed for service-role only).
  // Since we don't have service-role available, we fall back to
  // requiring the caller paste the user's UID directly.
  return { ok: false, error: "Email lookup requires service-role. Paste the auth user UID instead via /master/super-admins?uid=…" };
}

export async function addSuperAdminByUid(
  userId: string,
  notes: string | null,
): Promise<Result> {
  const { supabase, user: actor } = await requireSuperAdmin();

  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return { ok: false, error: "Invalid UID format." };
  }

  const { error } = await supabase
    .from("super_admins")
    .insert({
      user_id: userId,
      granted_by: actor.id,
      notes: notes?.trim() || null,
    });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/master/super-admins");
  return { ok: true };
}

export async function removeSuperAdmin(userId: string): Promise<Result> {
  const { supabase, user: actor } = await requireSuperAdmin();
  if (userId === actor.id) {
    return { ok: false, error: "You can't revoke your own super-admin role." };
  }
  const { error } = await supabase
    .from("super_admins")
    .delete()
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/master/super-admins");
  return { ok: true };
}
