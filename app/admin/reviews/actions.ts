"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant/context";

type Result = { ok: true } | { ok: false; error: string };

export type ReviewSource = "manual" | "google" | "zillow" | "realtor";

export type ReviewInput = {
  source: ReviewSource;
  external_id: string | null;
  author_name: string;
  author_short_label: string;
  rating: number;
  quote: string;
  is_featured_homepage: boolean;
  is_visible: boolean;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createReview(input: ReviewInput): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // A3-004: tenant_id is NOT NULL on `reviews`; without explicitly
  // passing the active tenant id the insert fails for super-admin
  // (who bypasses RLS and has no auto-inferred tenant context).
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ok: false, error: "Tenant context missing." };

  let existingQ = supabase
    .from("reviews")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);
  existingQ = existingQ.eq("tenant_id", tenantId);
  const { data: existing } = await existingQ.maybeSingle();
  const nextOrder = (existing?.display_order ?? -1) + 1;

  const { error } = await supabase
    .from("reviews")
    .insert({ ...input, tenant_id: tenantId, display_order: nextOrder });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateReview(
  id: string,
  input: ReviewInput,
): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("reviews").update(input).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteReview(id: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Approve a pending Google review → flip status='approved' + is_visible=true.
 * Used by the new pending queue tab. Idempotent.
 */
export async function approvePendingReview(id: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("reviews")
    .update({ status: "approved", is_visible: true })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Hide a review → status='rejected' + is_visible=false. Keeps the row
 * for audit purposes (so we don't re-import from Google's API on next sync).
 */
export async function hidePendingReview(id: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("reviews")
    .update({ status: "rejected", is_visible: false })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  return { ok: true };
}

export async function reorderReviews(orderedIds: string[]): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const updates = orderedIds.map((id, idx) =>
    supabase.from("reviews").update({ display_order: idx }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const firstErr = results.find((r) => r.error);
  if (firstErr?.error) return { ok: false, error: firstErr.error.message };

  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  revalidatePath("/", "layout");
  return { ok: true };
}

// =============================================================================
// Submissions (public-facing /leave-review form → review_submissions)
// =============================================================================

export async function approveSubmission(submissionId: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ok: false, error: "Tenant context missing." };

  const { data: sub, error: subErr } = await supabase
    .from("review_submissions")
    .select("id, author_name, rating, quote")
    .eq("id", submissionId)
    .single();
  if (subErr || !sub) return { ok: false, error: subErr?.message ?? "Not found." };

  const { error: insErr } = await supabase.from("reviews").insert({
    tenant_id: tenantId,
    source: "manual",
    author_name: sub.author_name,
    author_short_label: sub.author_name,
    rating: sub.rating ?? 5,
    quote: sub.quote,
    is_visible: true,
  });
  if (insErr) return { ok: false, error: insErr.message };

  await supabase
    .from("review_submissions")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", submissionId);

  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function rejectSubmission(submissionId: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("review_submissions")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", submissionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/reviews");
  return { ok: true };
}

// =============================================================================
// Public submission (called from /leave-review)
// =============================================================================

export async function submitPublicReview(input: {
  author_name: string;
  author_email: string;
  author_phone: string;
  rating: number;
  quote: string;
  consent_post_to_google: boolean;
}): Promise<Result> {
  const supabase = await createClient();
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ok: false, error: "Tenant context missing." };
  const { error } = await supabase.from("review_submissions").insert({
    tenant_id: tenantId,
    author_name: input.author_name || null,
    author_email: input.author_email || null,
    author_phone: input.author_phone || null,
    rating: input.rating,
    quote: input.quote,
    consent_post_to_google: input.consent_post_to_google,
    status: "pending",
    kind: "public",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/reviews");
  return { ok: true };
}

// =============================================================================
// Internal feedback (called from /leave-review-internal — private link the
// realtor sends directly to clients). NEVER auto-publishes anywhere — neither
// to Google nor to the public website. Lands as kind='internal' in
// review_submissions for the admin to read first.
// =============================================================================

export async function submitInternalReview(input: {
  author_name: string;
  author_email: string;
  author_phone: string;
  rating: number;
  quote: string;
}): Promise<Result> {
  const supabase = await createClient();
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ok: false, error: "Tenant context missing." };
  if (!input.quote?.trim()) {
    return { ok: false, error: "Please share your feedback before submitting." };
  }
  const { error } = await supabase.from("review_submissions").insert({
    tenant_id: tenantId,
    author_name: input.author_name || null,
    author_email: input.author_email || null,
    author_phone: input.author_phone || null,
    rating: input.rating,
    quote: input.quote,
    consent_post_to_google: false,
    status: "pending",
    kind: "internal",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/reviews");
  return { ok: true };
}
