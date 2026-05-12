"use server";

import { revalidatePath } from "next/cache";
import { requireTenantUser } from "@/lib/auth";

type Result = { ok: true } | { ok: false; error: string };

export async function saveLeadWebhook(input: {
  url: string;
  apiKey: string;
  label: string;
}): Promise<Result> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, tenantId, user } = auth;

  const url = input.url.trim();
  if (!url) return { ok: false, error: "Paste the webhook URL." };
  if (!/^https:\/\//.test(url)) {
    return {
      ok: false,
      error:
        "URL must start with https:// — plain http isn't allowed (your CRM secrets would travel unencrypted).",
    };
  }

  const { error } = await supabase.from("integrations").upsert(
    {
      tenant_id: tenantId,
      key: "lead_webhook",
      config: {
        url,
        apiKey: input.apiKey.trim() || undefined,
        label: input.label.trim() || "CRM",
      },
      enabled: true,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,key" },
  );
  if (error) return { ok: false, error: `Couldn't save: ${error.message}` };

  revalidatePath("/admin/integrations/lead-webhook");
  revalidatePath("/admin/integrations");
  return { ok: true };
}

export async function disconnectLeadWebhook(): Promise<Result> {
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
    .eq("key", "lead_webhook");
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/integrations/lead-webhook");
  revalidatePath("/admin/integrations");
  return { ok: true };
}

/**
 * Send a one-shot test POST to verify the webhook before going live.
 * Surfaces the HTTP status to the admin UI so they can debug.
 */
type TestResult =
  | { ok: true; status: number }
  | { ok: false; error: string; status?: number };

export async function testLeadWebhook(input: {
  url: string;
  apiKey: string;
}): Promise<TestResult> {
  const auth = await requireTenantUser();
  if (!auth.ok) return { ok: false, error: auth.error };

  const url = input.url.trim();
  if (!url || !/^https:\/\//.test(url)) {
    return { ok: false, error: "URL is invalid." };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (input.apiKey.trim()) {
    headers["X-API-Key"] = input.apiKey.trim();
    headers["Authorization"] = `Bearer ${input.apiKey.trim()}`;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        source: "test",
        received_at: new Date().toISOString(),
        name: "Test Lead",
        email: "test@example.com",
        phone: "+15555550100",
        message: "This is a test lead from BB Platform.",
      }),
    });
    if (res.ok) return { ok: true, status: res.status };
    return {
      ok: false,
      status: res.status,
      error: `Webhook returned HTTP ${res.status}.`,
    };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? `Couldn't reach the URL: ${e.message}` : "Network error.",
    };
  }
}
