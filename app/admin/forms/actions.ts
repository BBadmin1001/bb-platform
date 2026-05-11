"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { extractCommon, type FormField } from "@/lib/forms";
import { getCurrentTenantId } from "@/lib/tenant/context";
import { sendLeadNotification } from "@/lib/email";
import { siteOrigin } from "@/lib/qrcode";

type Result = { ok: true; id?: string; slug?: string } | { ok: false; error: string };

export type FormInput = {
  slug: string;
  title: string;
  description: string;
  fields: FormField[];
  submit_label: string;
  success_message: string;
  notify_email: string | null;
  is_published: boolean;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function upsertForm(
  input: FormInput,
  existingId?: string,
): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // A3-004: forms is a tenant-scoped table — explicitly pass
  // tenant_id on insert so super-admin writes don't NULL-violate.
  const tenantId = await getCurrentTenantId();
  if (!tenantId && !existingId) {
    return { ok: false, error: "Tenant context missing." };
  }

  const payload = existingId
    ? {
        ...input,
        fields: input.fields,
        updated_at: new Date().toISOString(),
      }
    : {
        ...input,
        tenant_id: tenantId,
        fields: input.fields,
        updated_at: new Date().toISOString(),
      };

  const query = existingId
    ? supabase.from("forms").update(payload).eq("id", existingId)
    : supabase.from("forms").insert(payload);

  const { error } = await query.select("id").single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/forms");
  revalidatePath(`/admin/forms/${input.slug}`);
  revalidatePath(`/form/${input.slug}`);
  return { ok: true, slug: input.slug };
}

export async function deleteForm(id: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("forms").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/forms");
  return { ok: true };
}

/**
 * Look up the tenant row for notification routing. Returns { email,
 * name } or null when we can't resolve it. Uses the service client so
 * the lookup works from anonymous public form submits.
 */
async function getTenantNotifyTarget(
  supabase: ReturnType<typeof createServiceClient>,
  tenantId: string,
): Promise<{ email: string; name: string } | null> {
  const { data } = await supabase
    .from("tenants")
    .select("contact_email, realtor_name")
    .eq("id", tenantId)
    .maybeSingle();
  if (!data?.contact_email) return null;
  return {
    email: data.contact_email as string,
    name: (data.realtor_name as string) || "",
  };
}

/**
 * Fire-and-forget lead notification. Wraps `sendLeadNotification` so
 * the submit path doesn't have to inline the lookup + error swallow.
 * Email failure NEVER blocks the form's success response — the lead
 * still landed in the inbox; we just couldn't ping the realtor's
 * inbox about it (logged on the server for debugging).
 */
async function notifyTenantOfLead(
  supabase: ReturnType<typeof createServiceClient>,
  tenantId: string,
  source: string,
  data: Record<string, unknown>,
  common: ReturnType<typeof extractCommon>,
  formNotifyEmail: string | null = null,
) {
  try {
    const target = await getTenantNotifyTarget(supabase, tenantId);
    // Per-form override email (set in the form builder) wins over the
    // tenant's default contact_email when present.
    const to = (formNotifyEmail?.trim() || target?.email || "").trim();
    if (!to) return; // nobody to notify — quietly skip
    const tenantName = target?.name || "your site";
    await sendLeadNotification({
      to,
      tenantName,
      source,
      leadName: common.name ?? undefined,
      leadEmail: common.email ?? undefined,
      leadPhone: common.phone ?? undefined,
      message:
        common.message ??
        (typeof data.message === "string" ? data.message : undefined),
      inboxUrl: `${siteOrigin().replace(/\/+$/, "")}/admin/inbox`,
    });
  } catch (e) {
    // Never throw — leads are too important to roll back over an
    // email-provider blip.
    console.error("[forms] notifyTenantOfLead failed", e);
  }
}

/**
 * Public submit handler — called from the /form/[slug] renderer.
 * Anon-allowed via RLS policy ("anyone can submit leads").
 */
export async function submitFormPublic(input: {
  formId: string;
  source: string;
  data: Record<string, unknown>;
}): Promise<Result> {
  // Use the service-role client so no auth session is required for the insert
  const supabase = createServiceClient();
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ok: false, error: "Tenant context missing." };
  const common = extractCommon(input.data);

  const { error } = await supabase.from("leads").insert({
    tenant_id: tenantId,
    source: input.source,
    form_id: input.formId,
    data: input.data,
    name: common.name,
    email: common.email,
    phone: common.phone,
    message: common.message,
    status: "new",
  });
  if (error) return { ok: false, error: error.message };

  // Look up the form's per-form notify_email override (if any) so we
  // honour the realtor's per-form preference. One small extra read;
  // skipped silently on error.
  let formNotifyEmail: string | null = null;
  try {
    const { data: form } = await supabase
      .from("forms")
      .select("notify_email")
      .eq("id", input.formId)
      .maybeSingle();
    formNotifyEmail = (form?.notify_email as string | null) ?? null;
  } catch {
    // ignore — fall through to tenant default
  }

  await notifyTenantOfLead(
    supabase,
    tenantId,
    input.source,
    input.data,
    common,
    formNotifyEmail,
  );

  revalidatePath("/admin/inbox");
  return { ok: true };
}

/**
 * Anonymous-public submit for the built-in (non-builder) forms like /contact
 * and the sellers valuation. Doesn't require a `forms` row — just a source
 * label and the raw payload.
 */
export async function submitBuiltInForm(input: {
  source: string;
  data: Record<string, unknown>;
}): Promise<Result> {
  const supabase = createServiceClient();
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ok: false, error: "Tenant context missing." };
  const common = extractCommon(input.data);
  const { error } = await supabase.from("leads").insert({
    tenant_id: tenantId,
    source: input.source,
    form_id: null,
    data: input.data,
    name: common.name,
    email: common.email,
    phone: common.phone,
    message: common.message,
    status: "new",
  });
  if (error) return { ok: false, error: error.message };

  await notifyTenantOfLead(
    supabase,
    tenantId,
    input.source,
    input.data,
    common,
  );

  revalidatePath("/admin/inbox");
  return { ok: true };
}

export async function setLeadStatus(
  id: string,
  status: "new" | "in-progress" | "closed",
): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/inbox");
  return { ok: true };
}
