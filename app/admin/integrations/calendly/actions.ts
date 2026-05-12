"use server";

import { revalidatePath } from "next/cache";
import { requireTenantUser } from "@/lib/auth";

type Result = { ok: true } | { ok: false; error: string };

const CALENDLY_RE = /^https?:\/\/(www\.)?calendly\.com\/.+/i;

export async function saveCalendlyIntegration(url: string): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId, user } = auth;

  const clean = url.trim();
  if (!clean) {
    return { ok: false, error: "Paste your Calendly link." };
  }
  if (!CALENDLY_RE.test(clean)) {
    return {
      ok: false,
      error: `That doesn't look like a Calendly link. It should start with https://calendly.com/... — copy yours from Calendly → Share.`,
    };
  }

  const { error } = await supabase.from("integrations").upsert(
    {
      tenant_id: tenantId,
      key: "calendly",
      config: { url: clean },
      enabled: true,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,key" },
  );
  if (error) return { ok: false, error: `Couldn't save: ${error.message}` };

  revalidatePath("/admin/integrations/calendly");
  revalidatePath("/admin/integrations");
  revalidatePath("/contact");
  return { ok: true };
}

export async function disconnectCalendly(): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId, user } = auth;

  const { error } = await supabase
    .from("integrations")
    .update({
      enabled: false,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("key", "calendly");
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/integrations/calendly");
  revalidatePath("/admin/integrations");
  return { ok: true };
}
