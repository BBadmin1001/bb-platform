import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant/context";

/**
 * Server-only auth helpers used by every admin server action.
 *
 * The pattern: require both
 *   1. a signed-in auth.users row, AND
 *   2. a tenant_users membership on the active tenant (resolved by proxy.ts
 *      from the request hostname).
 *
 * This means user A signed in on samina.bbwebsite.com cannot mutate
 * tenant B's data even by guessing IDs — the active tenant comes from
 * the URL the proxy already pinned, and we cross-check membership.
 *
 * Super admins (rows in public.super_admins) bypass the membership check
 * so they can edit any tenant's data from the master dashboard or via
 * impersonation.
 */

export type RequireUserResult =
  | {
      ok: true;
      user: { id: string; email: string };
      tenantId: string;
      role: "owner" | "editor" | "super_admin";
      supabase: Awaited<ReturnType<typeof createClient>>;
    }
  | { ok: false; error: string };

/**
 * Use at the top of every admin server action that mutates tenant data.
 *
 *   const auth = await requireTenantUser();
 *   if (!auth.ok) return { ok: false, error: auth.error };
 *   const { supabase, tenantId } = auth;
 *   // …mutate scoped by tenantId
 */
export async function requireTenantUser(): Promise<RequireUserResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { ok: false, error: "No tenant in context." };
  }

  // Super admin bypass — can edit any tenant's data.
  const { data: superRow } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (superRow) {
    return {
      ok: true,
      user: { id: user.id, email: user.email ?? "" },
      tenantId,
      role: "super_admin",
      supabase,
    };
  }

  // Tenant member?
  const { data: membership } = await supabase
    .from("tenant_users")
    .select("role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!membership) {
    return {
      ok: false,
      error: "You don't have access to this tenant.",
    };
  }

  return {
    ok: true,
    user: { id: user.id, email: user.email ?? "" },
    tenantId,
    role: membership.role as "owner" | "editor",
    supabase,
  };
}

/**
 * Require the user belongs to the active tenant AND has the 'owner' role.
 * Used by destructive operations (delete tenant, manage members, etc.).
 */
export async function requireTenantOwner(): Promise<RequireUserResult> {
  const res = await requireTenantUser();
  if (!res.ok) return res;
  if (res.role === "editor") {
    return { ok: false, error: "Owner role required for this action." };
  }
  return res;
}
