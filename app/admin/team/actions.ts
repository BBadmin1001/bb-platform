"use server";

/**
 * Tenant team management (Phase 25, rewritten for multi-tenant).
 *
 * The realtor (owner role on `tenant_users`) can invite their
 * assistant or partner by email. Roles are owner | editor:
 *   - owner: can invite + remove other members + change roles
 *   - editor: can edit content but not manage members
 *
 * Implementation:
 *   - Supabase auth.admin.inviteUserByEmail sends the magic-link email
 *   - On the same call, we insert a tenant_users row binding that
 *     auth user to THIS tenant with the requested role
 *   - When the user already exists (e.g. an assistant who already has
 *     an account from another tenant), we just add the tenant_users
 *     row and skip the auth invite
 */

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireTenantUser } from "@/lib/auth";

type Result = { ok: true } | { ok: false; error: string };

async function requireTenantOwner() {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  if (auth.role !== "owner" && auth.role !== "super_admin") {
    return {
      ok: false as const,
      error: "Only the owner can manage team members.",
    };
  }
  return {
    ok: true as const,
    tenantId: auth.tenantId,
    userId: auth.user.id,
  };
}

export async function inviteTeamMember(input: {
  email: string;
  role: "owner" | "editor";
}): Promise<Result> {
  const auth = await requireTenantOwner();
  if (!auth.ok) return { ok: false, error: auth.error };

  const email = input.email.trim().toLowerCase();
  if (!/.+@.+\..+/.test(email)) {
    return { ok: false, error: "Enter a valid email." };
  }
  if (input.role !== "owner" && input.role !== "editor") {
    return { ok: false, error: "Role must be owner or editor." };
  }

  const svc = createServiceClient();

  // Check whether a user with this email already exists. If so, skip
  // the invite email and just bind them to this tenant.
  const { data: listed } = await svc.auth.admin.listUsers();
  const existing = listed?.users.find(
    (u) => u.email?.toLowerCase() === email,
  );

  let userId: string | null = existing?.id ?? null;

  if (!userId) {
    const { data, error } = await svc.auth.admin.inviteUserByEmail(email, {
      // After they accept the invite, send them straight to their
      // tenant admin so they can start editing.
      redirectTo: "/admin",
      data: { invited_via: "tenant_team", tenant_id: auth.tenantId },
    });
    if (error) {
      return { ok: false, error: `Couldn't send invite: ${error.message}` };
    }
    userId = data?.user?.id ?? null;
    if (!userId) {
      return {
        ok: false,
        error:
          "Invite sent but no user id returned. Ask them to sign in, then re-add them here.",
      };
    }
  }

  // Bind to tenant_users with the chosen role.
  const { error: insErr } = await svc.from("tenant_users").upsert(
    {
      tenant_id: auth.tenantId,
      user_id: userId,
      role: input.role,
    },
    { onConflict: "tenant_id,user_id" },
  );
  if (insErr) {
    return {
      ok: false,
      error: `Couldn't add to team: ${insErr.message}`,
    };
  }

  revalidatePath("/admin/team");
  return { ok: true };
}

export async function setMemberRole(
  memberUserId: string,
  role: "owner" | "editor",
): Promise<Result> {
  const auth = await requireTenantOwner();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (role !== "owner" && role !== "editor") {
    return { ok: false, error: "Role must be owner or editor." };
  }

  const svc = createServiceClient();

  // Guardrail — don't demote the last owner on this tenant.
  if (role === "editor") {
    const { count } = await svc
      .from("tenant_users")
      .select("user_id", { count: "exact", head: true })
      .eq("tenant_id", auth.tenantId)
      .eq("role", "owner");
    if ((count ?? 0) <= 1) {
      const { data: target } = await svc
        .from("tenant_users")
        .select("role")
        .eq("tenant_id", auth.tenantId)
        .eq("user_id", memberUserId)
        .maybeSingle();
      if (target?.role === "owner") {
        return {
          ok: false,
          error:
            "Can't demote the last owner. Promote someone else first.",
        };
      }
    }
  }

  const { error } = await svc
    .from("tenant_users")
    .update({ role })
    .eq("tenant_id", auth.tenantId)
    .eq("user_id", memberUserId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/team");
  return { ok: true };
}

export async function removeMember(memberUserId: string): Promise<Result> {
  const auth = await requireTenantOwner();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (memberUserId === auth.userId) {
    return { ok: false, error: "Can't remove yourself." };
  }

  const svc = createServiceClient();

  const { count: ownerCount } = await svc
    .from("tenant_users")
    .select("user_id", { count: "exact", head: true })
    .eq("tenant_id", auth.tenantId)
    .eq("role", "owner");
  const { data: target } = await svc
    .from("tenant_users")
    .select("role")
    .eq("tenant_id", auth.tenantId)
    .eq("user_id", memberUserId)
    .maybeSingle();
  if (target?.role === "owner" && (ownerCount ?? 0) <= 1) {
    return { ok: false, error: "Can't remove the last owner." };
  }

  // Remove ONLY the tenant_users binding — never delete the auth.users
  // record (the user may belong to other tenants).
  const { error } = await svc
    .from("tenant_users")
    .delete()
    .eq("tenant_id", auth.tenantId)
    .eq("user_id", memberUserId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/team");
  return { ok: true };
}
