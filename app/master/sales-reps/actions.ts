"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/master";
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
  | { ok: true; link_token: string; url: string }
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

  const { error } = await supabase.from("sales_rep_links").insert({
    rep_id: input.rep_id,
    link_token: token,
    client_label: label,
    client_email: input.client_email?.trim().toLowerCase() || null,
    notes: input.notes?.trim() || null,
    agreed_setup_cents: input.agreed_setup_cents,
    created_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

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
  return { ok: true, link_token: token, url };
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
