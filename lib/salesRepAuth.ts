import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side guard for the `/sales/*` dashboard.
 *
 * Resolution order:
 *   1. Not signed in → redirect to /admin (the platform's login form).
 *   2. Signed in + linked to a sales_reps row (via user_id OR by
 *      email match) → return that rep.
 *   3. Signed in as a super admin → return a synthetic "acting as
 *      master" rep wrapper so master can view the dashboard for any
 *      rep via `?rep=<slug>`.
 *   4. Signed in but neither a rep nor a super admin → redirect to
 *      /admin (their tenant editor — if any).
 *
 * Returns the rep row plus the supabase client + the auth user so
 * callers don't have to refetch.
 */
export type SalesRepRow = {
  id: string;
  slug: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  user_id: string | null;
};

export type RequireSalesRepResult =
  | {
      role: "rep";
      rep: SalesRepRow;
      user: { id: string; email: string };
      isSuperAdmin: false;
    }
  | {
      role: "super_admin";
      rep: SalesRepRow;
      user: { id: string; email: string };
      isSuperAdmin: true;
    };

export async function requireSalesRep(
  /** When set, super-admins view that specific rep's dashboard. */
  actingAsSlug?: string | null,
): Promise<RequireSalesRepResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin?from=/sales");
  }

  // Are they a super admin?
  const { data: superRow } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const isSuper = !!superRow;

  // Super admins viewing /sales — pick the rep they're impersonating
  // via ?rep=<slug>, else the first active rep, else the first rep
  // row at all.
  if (isSuper) {
    let query = supabase
      .from("sales_reps")
      .select("id, slug, full_name, email, is_active, user_id")
      .limit(1);
    if (actingAsSlug) {
      query = query.eq("slug", actingAsSlug);
    } else {
      query = query.order("is_active", { ascending: false }).order(
        "created_at",
        { ascending: true },
      );
    }
    const { data: repRow } = await query.maybeSingle();
    if (!repRow) {
      // Super admin but no reps yet — bounce to master where they can
      // create one.
      redirect("/master/sales-reps");
    }
    return {
      role: "super_admin",
      rep: repRow as SalesRepRow,
      user: { id: user.id, email: user.email ?? "" },
      isSuperAdmin: true,
    };
  }

  // Real rep — try user_id first, fall back to email match (covers
  // the case where master created the rep before the rep had an
  // account, then the rep signed up with that email).
  const { data: repByUser } = await supabase
    .from("sales_reps")
    .select("id, slug, full_name, email, is_active, user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let rep = repByUser as SalesRepRow | null;
  if (!rep && user.email) {
    const { data: repByEmail } = await supabase
      .from("sales_reps")
      .select("id, slug, full_name, email, is_active, user_id")
      .eq("email", user.email.toLowerCase())
      .maybeSingle();
    if (repByEmail) {
      // Auto-link the user_id on first match.
      await supabase
        .from("sales_reps")
        .update({ user_id: user.id })
        .eq("id", repByEmail.id);
      rep = { ...(repByEmail as SalesRepRow), user_id: user.id };
    }
  }

  if (!rep) {
    // Signed-in user that isn't a rep or super admin. Send them to
    // their tenant admin if they have access, otherwise to /admin
    // (which will dead-end on the login form).
    redirect("/admin");
  }

  if (!rep.is_active) {
    redirect("/admin?from=/sales&rep=inactive");
  }

  return {
    role: "rep",
    rep,
    user: { id: user.id, email: user.email ?? "" },
    isSuperAdmin: false,
  };
}
