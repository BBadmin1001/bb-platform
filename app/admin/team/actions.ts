"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: me } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "owner") {
    return { ok: false as const, error: "Owner-only action." };
  }
  return { ok: true as const, supabase, userId: user.id };
}

/**
 * Invite a new team member by email. Uses Supabase auth.admin.inviteUserByEmail
 * which sends them a one-click magic link to sign in. Their team_members row
 * is auto-created by the on_auth_user_created trigger when they first sign in.
 *
 * The inviter chooses the initial role (owner | editor). After they sign in,
 * we re-apply that role on top of the trigger default.
 */
export async function inviteTeamMember(input: {
  email: string;
  role: "owner" | "editor";
}): Promise<Result> {
  const auth = await requireOwner();
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email);
  if (error) return { ok: false, error: error.message };

  // Pre-set their team_members role. The handle_new_user trigger inserts
  // the row on first auth, but we can also pre-insert it here so we control
  // the role from the start. The auth user already exists from the invite.
  if (data?.user) {
    await admin
      .from("team_members")
      .upsert(
        {
          id: data.user.id,
          email: input.email,
          role: input.role,
        },
        { onConflict: "id" },
      );
  }

  revalidatePath("/admin/team");
  return { ok: true };
}

export async function setMemberRole(
  memberId: string,
  role: "owner" | "editor",
): Promise<Result> {
  const auth = await requireOwner();
  if (!auth.ok) return { ok: false, error: auth.error };

  // Don't allow demoting the last owner
  if (role === "editor") {
    const { count } = await auth.supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("role", "owner");
    if ((count ?? 0) <= 1) {
      const { data: target } = await auth.supabase
        .from("team_members")
        .select("role")
        .eq("id", memberId)
        .single();
      if (target?.role === "owner") {
        return {
          ok: false,
          error: "Can't demote the last owner. Promote someone else first.",
        };
      }
    }
  }

  const { error } = await auth.supabase
    .from("team_members")
    .update({ role })
    .eq("id", memberId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/team");
  return { ok: true };
}

export async function removeMember(memberId: string): Promise<Result> {
  const auth = await requireOwner();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (memberId === auth.userId) {
    return { ok: false, error: "Can't remove yourself." };
  }

  const { count: ownerCount } = await auth.supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner");
  const { data: target } = await auth.supabase
    .from("team_members")
    .select("role")
    .eq("id", memberId)
    .single();
  if (target?.role === "owner" && (ownerCount ?? 0) <= 1) {
    return { ok: false, error: "Can't remove the last owner." };
  }

  // Delete from team_members + auth.users
  const admin = createServiceClient();
  const { error: authErr } = await admin.auth.admin.deleteUser(memberId);
  if (authErr) return { ok: false, error: authErr.message };

  // team_members row cascades via FK on auth.users delete

  revalidatePath("/admin/team");
  return { ok: true };
}
