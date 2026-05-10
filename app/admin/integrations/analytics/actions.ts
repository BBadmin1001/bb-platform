"use server";

/**
 * Google Analytics integration — tiny set of server actions.
 *
 * The "integration" itself is just a Measurement ID (G-XXXXXXXXXX) — once
 * saved, the root layout reads it via getAnalyticsMeasurementId() and
 * conditionally injects the gtag.js script. No OAuth, no tokens.
 *
 * Showing analytics DATA inside our admin (vs just installing the tag)
 * needs the GA Data API — that's a separate, much larger build covered
 * elsewhere.
 */

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

const MEASUREMENT_ID_RE = /^G-[A-Z0-9]{6,}$/;

async function requireUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function saveAnalyticsIntegration(
  measurementId: string,
): Promise<ActionResult> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const id = measurementId?.trim() ?? "";
  if (!id) return { ok: false, error: "Paste your GA4 Measurement ID." };
  if (!MEASUREMENT_ID_RE.test(id)) {
    return {
      ok: false,
      error: `That doesn't look like a Measurement ID. They start with "G-" followed by letters and numbers — e.g. "G-XXXXXXXXXX". You can find yours in Google Analytics → Admin → Data Streams → Web → Measurement ID.`,
    };
  }

  const { error } = await supabase.from("integrations").upsert(
    {
      key: "google_analytics",
      config: { measurementId: id },
      enabled: true,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) return { ok: false, error: `Couldn't save: ${error.message}` };

  // Bust the layout cache so the gtag tag starts injecting immediately.
  revalidatePath("/", "layout");
  revalidatePath("/admin/integrations/analytics");
  revalidatePath("/admin/analytics");
  return { ok: true };
}

export async function disconnectAnalytics(): Promise<ActionResult> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId } = auth;

  const { error } = await supabase
    .from("integrations")
    .update({
      enabled: false,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("key", "google_analytics");
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/admin/integrations/analytics");
  return { ok: true };
}
