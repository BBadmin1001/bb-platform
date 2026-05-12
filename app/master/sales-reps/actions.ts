"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/master";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { SETUP_FEE_MIN_CENTS } from "@/lib/salesRepConstants";

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

/**
 * One-click "Invite rep" — uses Supabase auth.admin.inviteUserByEmail
 * to send the rep an invite email. They click the link, set a
 * password, and on first /sales visit the requireSalesRep helper
 * auto-links their auth user to the sales_reps row by email match.
 *
 * Idempotent for the auth user side — if Supabase rejects with
 * "user already exists" we surface a friendly message but still
 * write the user_id linkback if we can find the user. The
 * sales_reps row must already exist (created via the manager UI).
 */
export async function inviteSalesRep(
  repId: string,
): Promise<
  | { ok: true; message: string }
  | { ok: false; error: string }
> {
  await requireSuperAdmin(); // gate: super admins only

  const svc = createServiceClient();
  const { data: rep, error: repErr } = await svc
    .from("sales_reps")
    .select("id, email, full_name, user_id")
    .eq("id", repId)
    .maybeSingle();
  if (repErr || !rep) return { ok: false, error: "Rep not found." };
  if (!rep.email) {
    return {
      ok: false,
      error: "Rep has no email on file — add one first, then invite.",
    };
  }
  if (rep.user_id) {
    return {
      ok: true,
      message:
        "This rep is already linked to a Supabase user. They can sign in at /admin/login.",
    };
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    (process.env.NEXT_PUBLIC_MASTER_HOSTNAME
      ? `https://${process.env.NEXT_PUBLIC_MASTER_HOSTNAME}`
      : "https://bb-platform-387.netlify.app");

  // Supabase auth admin API — sends an invite email with a magic
  // link the rep clicks to set their password.
  const { data, error } = await svc.auth.admin.inviteUserByEmail(
    rep.email as string,
    {
      redirectTo: `${origin}/sales`,
      data: { full_name: rep.full_name, role: "sales_rep" },
    },
  );
  if (error) {
    // Existing-user case — pretend success, just remind master.
    if (
      /already.*registered|already.*exists/i.test(error.message ?? "")
    ) {
      // Try to find the existing user and link them by email match.
      const { data: listed } = await svc.auth.admin.listUsers();
      const existing = listed?.users.find(
        (u) => u.email?.toLowerCase() === (rep.email as string).toLowerCase(),
      );
      if (existing) {
        await svc
          .from("sales_reps")
          .update({ user_id: existing.id })
          .eq("id", rep.id);
      }
      return {
        ok: true,
        message:
          "This email already has an account. Linked it to the rep — they can sign in at /admin/login.",
      };
    }
    return { ok: false, error: `Couldn't send invite: ${error.message}` };
  }
  // Pre-link if we got the new user id back so the rep skips the
  // email-match fallback on first sign-in.
  if (data?.user?.id) {
    await svc
      .from("sales_reps")
      .update({ user_id: data.user.id })
      .eq("id", rep.id);
  }

  revalidatePath("/master/sales-reps");
  return {
    ok: true,
    message: `Invite sent to ${rep.email}. They'll get an email to set their password.`,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Per-client onboarding links (Phase 18)
// ─────────────────────────────────────────────────────────────────────

/**
 * Generate a short URL-safe token. ~16 chars of base36 randomness =
 * ~83 bits of entropy. Good enough for a non-secret-rotating link
 * given the master kill-switch (is_active=false) is available.
 */
function generateLinkToken(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

/**
 * Generate a tracked per-client onboarding link for a given rep.
 * Server-side enforces the $600 minimum so a client-side bypass can't
 * undercut the platform floor.
 */
export async function createSalesRepLink(input: {
  rep_id: string;
  client_label: string;
  client_email?: string;
  agreed_setup_cents: number;
  notes?: string;
}): Promise<
  | { ok: true; link_id: string; link_token: string; url: string }
  | { ok: false; error: string }
> {
  const { supabase, user } = await requireSuperAdmin();

  if (!input.rep_id) {
    return { ok: false, error: "Pick a sales rep." };
  }
  const label = input.client_label.trim();
  if (!label) {
    return { ok: false, error: "Client label is required so you can track this link later." };
  }
  if (
    !Number.isFinite(input.agreed_setup_cents) ||
    input.agreed_setup_cents < SETUP_FEE_MIN_CENTS
  ) {
    return {
      ok: false,
      error: `Agreed price must be at least $${(SETUP_FEE_MIN_CENTS / 100).toFixed(0)}.`,
    };
  }

  // Verify the rep exists + is active before generating a link for them.
  const { data: rep, error: repErr } = await supabase
    .from("sales_reps")
    .select("id, is_active")
    .eq("id", input.rep_id)
    .maybeSingle();
  if (repErr || !rep) return { ok: false, error: "Sales rep not found." };
  if (!rep.is_active) {
    return { ok: false, error: "This rep is deactivated. Reactivate them first." };
  }

  // Generate a unique token (retry once on collision — astronomically rare).
  let token = generateLinkToken();
  const { data: existing } = await supabase
    .from("sales_rep_links")
    .select("id")
    .eq("link_token", token)
    .maybeSingle();
  if (existing) token = generateLinkToken();

  const { data: created, error } = await supabase
    .from("sales_rep_links")
    .insert({
      rep_id: input.rep_id,
      link_token: token,
      client_label: label,
      client_email: input.client_email?.trim().toLowerCase() || null,
      notes: input.notes?.trim() || null,
      agreed_setup_cents: input.agreed_setup_cents,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !created) {
    return { ok: false, error: error?.message ?? "Insert failed." };
  }

  // Build the public URL the rep will send the client. Use the
  // platform's configured master hostname; fall back to the Netlify
  // subdomain in dev / when unset.
  const origin =
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    (process.env.NEXT_PUBLIC_MASTER_HOSTNAME
      ? `https://${process.env.NEXT_PUBLIC_MASTER_HOSTNAME}`
      : "https://bb-platform-387.netlify.app");
  const url = `${origin}/get-started?link=${token}`;

  revalidatePath("/master/sales-reps");
  return { ok: true, link_id: created.id, link_token: token, url };
}

/**
 * Deactivate (or reactivate) a generated link. We never hard-delete
 * because we want the conversion trail. Toggle keeps the row but
 * stops the wizard from accepting new submissions through it.
 */
export async function setLinkActive(
  linkId: string,
  isActive: boolean,
): Promise<Result> {
  const { supabase } = await requireSuperAdmin();
  const { error } = await supabase
    .from("sales_rep_links")
    .update({ is_active: isActive })
    .eq("id", linkId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/master/sales-reps");
  return { ok: true };
}

/**
 * Rep-scoped variant of createSalesRepLink. Used by /sales when a
 * rep generates a link from their own dashboard. The rep_id is
 * authoritative: the rep cannot create a link for any rep other
 * than themselves. Master uses the original createSalesRepLink
 * (which can target any rep_id).
 */
export async function createMyClientLink(input: {
  realtor_name: string;
  client_email?: string;
  agreed_setup_cents: number;
  notes?: string;
}): Promise<
  | { ok: true; link_id: string; link_token: string; url: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Resolve the rep row for this user.
  const { data: rep } = await supabase
    .from("sales_reps")
    .select("id, is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!rep) {
    return {
      ok: false,
      error:
        "Your account isn't linked to a sales rep yet. Ask the platform team.",
    };
  }
  if (!rep.is_active) {
    return { ok: false, error: "Your rep account is deactivated." };
  }

  // Reuse the master action's validation + token generation by
  // calling it with the resolved rep_id. (Doing it inline so we can
  // keep this server action call-stack clean.)
  const realtor_name = input.realtor_name.trim();
  if (!realtor_name) {
    return { ok: false, error: "Realtor name is required." };
  }
  if (
    !Number.isFinite(input.agreed_setup_cents) ||
    input.agreed_setup_cents < SETUP_FEE_MIN_CENTS
  ) {
    return {
      ok: false,
      error: `Agreed price must be at least $${(SETUP_FEE_MIN_CENTS / 100).toFixed(0)}.`,
    };
  }

  let token =
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10);
  const { data: existing } = await supabase
    .from("sales_rep_links")
    .select("id")
    .eq("link_token", token)
    .maybeSingle();
  if (existing)
    token =
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10);

  const { data: created, error } = await supabase
    .from("sales_rep_links")
    .insert({
      rep_id: rep.id,
      link_token: token,
      client_label: realtor_name,
      client_email: input.client_email?.trim().toLowerCase() || null,
      notes: input.notes?.trim() || null,
      agreed_setup_cents: input.agreed_setup_cents,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !created) {
    return { ok: false, error: error?.message ?? "Insert failed." };
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    (process.env.NEXT_PUBLIC_MASTER_HOSTNAME
      ? `https://${process.env.NEXT_PUBLIC_MASTER_HOSTNAME}`
      : "https://bb-platform-387.netlify.app");

  revalidatePath("/sales");
  return {
    ok: true,
    link_id: created.id,
    link_token: token,
    url: `${origin}/get-started?link=${token}`,
  };
}

/**
 * Rep-scoped deactivate. Same as setLinkActive but only allows the
 * rep to toggle their own links.
 */
export async function setMyLinkActive(
  linkId: string,
  isActive: boolean,
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Verify the link belongs to a rep this user owns.
  const { data: link } = await supabase
    .from("sales_rep_links")
    .select("id, rep_id, sales_reps!inner(user_id)")
    .eq("id", linkId)
    .maybeSingle();
  if (!link) return { ok: false, error: "Link not found." };
  const rep = link.sales_reps as
    | { user_id: string }
    | { user_id: string }[]
    | null;
  const owner = Array.isArray(rep) ? rep[0]?.user_id : rep?.user_id;
  if (owner !== user.id) {
    return { ok: false, error: "This link isn't yours to change." };
  }

  const { error } = await supabase
    .from("sales_rep_links")
    .update({ is_active: isActive })
    .eq("id", linkId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/sales");
  return { ok: true };
}
