"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTenantUser } from "@/lib/auth";
import type { CropArea } from "@/components/admin/media/CropEditor";
import type { FormField } from "@/lib/forms";

type Result = { ok: true; slug?: string } | { ok: false; error: string };

export type OpenHouseInput = {
  slug: string;

  // Address — line 1 = street + #, line 2 = city / state (full) / postal
  heading: string;
  address: string; // legacy single-line, auto-assembled on save for compat
  city: string | null;
  state_full: string | null;
  postal_code: string | null;

  // Up to two days. Day 2 is optional.
  open_date: string | null; // YYYY-MM-DD
  open_time_label: string | null;
  open_date_2: string | null;
  open_time_label_2: string | null;

  // Structured listing fields — always shown on the flyer
  bedrooms: number | null;
  bathrooms: number | null;
  garage_spaces: number;
  mls_id: string | null;

  hero_image_id: string | null;
  hero_image_crop: CropArea | null;
  second_image_id: string | null;
  second_image_crop: CropArea | null;
  third_image_id: string | null;
  third_image_crop: CropArea | null;

  /** Optional extras — fill remaining feature pills after bed/bath/garage. */
  features: string[];
  description: string;

  is_published: boolean;
};

/** Derive a URL-safe slug from a street address heading. */
export async function slugifyAddress(addr: string): Promise<string> {
  return addr
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Pick a slug derived from the street address that doesn't collide. */
async function uniqueSlugForAddress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  heading: string,
  excludeId?: string,
): Promise<string> {
  const base =
    heading
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "open-house";
  let candidate = base;
  for (let n = 2; n < 50; n++) {
    const { data } = await supabase
      .from("open_houses")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data || (excludeId && data.id === excludeId)) return candidate;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

/** Compose a single-line address from the structured pieces. */
function composeAddress(input: OpenHouseInput): string {
  const cityState = [input.city, input.state_full]
    .filter(Boolean)
    .join(", ");
  const tail = [cityState, input.postal_code].filter(Boolean).join(" ");
  return [input.heading, tail].filter(Boolean).join(", ");
}

/** Fields that ship with every auto-generated open-house RSVP form. */
const RSVP_FIELDS: FormField[] = [
  { label: "Your name", name: "name", type: "text", required: true },
  { label: "Email", name: "email", type: "email", required: true },
  { label: "Phone", name: "phone", type: "phone" },
  {
    label: "How many people are coming?",
    name: "party_size",
    type: "number",
    placeholder: "1",
  },
];

export async function createOpenHouse(input: OpenHouseInput): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  // Auto-derive the slug from the street-address heading.
  const slug = await uniqueSlugForAddress(supabase, input.heading);
  const composedAddress = composeAddress(input);

  // Auto-create the matching RSVP form so the landing page has somewhere
  // to send sign-ups. Slug is `open-house-<slug>` to keep namespaces clean.
  const formSlug = `open-house-${slug}`;
  const { data: formRow, error: formErr } = await supabase
    .from("forms")
    .insert({
      tenant_id: tenantId,
      slug: formSlug,
      title: `RSVP — ${input.heading}`,
      description: `Sign up to attend the open house at ${composedAddress}.`,
      fields: RSVP_FIELDS,
      submit_label: "Save my spot",
      success_message:
        "Got it — we'll see you there. A reminder goes out the day before.",
      is_published: true,
    })
    .select("id")
    .single();
  if (formErr || !formRow) {
    return {
      ok: false,
      error: formErr?.message ?? "Could not create RSVP form.",
    };
  }

  const { error } = await supabase.from("open_houses").insert({
    ...input,
    tenant_id: tenantId,
    slug,
    address: composedAddress,
    form_id: formRow.id,
  });
  if (error) {
    // Roll back the form so we don't leave orphans
    await supabase.from("forms").delete().eq("id", formRow.id);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/open-houses");
  revalidatePath(`/open-house/${slug}`);
  return { ok: true, slug };
}

export async function updateOpenHouse(
  id: string,
  input: OpenHouseInput,
): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  // Re-derive slug from the (possibly edited) heading. Keeps slug in sync
  // with the address — no manual slug input.
  const slug = await uniqueSlugForAddress(supabase, input.heading, id);
  const composedAddress = composeAddress(input);

  // Keep the linked RSVP form in sync.
  const { data: existing } = await supabase
    .from("open_houses")
    .select("form_id, slug")
    .eq("id", id)
    .single();
  if (existing?.form_id) {
    await supabase
      .from("forms")
      .update({
        slug: `open-house-${slug}`,
        title: `RSVP — ${input.heading}`,
        description: `Sign up to attend the open house at ${composedAddress}.`,
      })
      .eq("id", existing.form_id);
  }

  const { error } = await supabase
    .from("open_houses")
    .update({
      ...input,
      slug,
      address: composedAddress,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/open-houses");
  if (existing?.slug && existing.slug !== slug)
    revalidatePath(`/open-house/${existing.slug}`);
  revalidatePath(`/open-house/${slug}`);
  return { ok: true, slug };
}

export async function deleteOpenHouse(id: string): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  // Drop the linked RSVP form too.
  const { data: row } = await supabase
    .from("open_houses")
    .select("form_id, slug")
    .eq("id", id)
    .single();
  if (row?.form_id) {
    await supabase.from("forms").delete().eq("id", row.form_id);
  }

  const { error } = await supabase.from("open_houses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/open-houses");
  if (row?.slug) revalidatePath(`/open-house/${row.slug}`);
  return { ok: true };
}

export async function navigateToEditor(slug: string) {
  redirect(`/admin/open-houses/${slug}`);
}
