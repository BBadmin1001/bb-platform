import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant/context";
import AdminShell from "@/components/admin/AdminShell";
import PartnersManager, {
  type CategoryRow,
  type PartnerRow,
} from "@/components/admin/partners/PartnersManager";
import type { LibraryItem } from "@/components/admin/media/ImagePicker";

export const dynamic = "force-dynamic";

export default async function PartnersAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const tenantId = await getCurrentTenantId();

  // First-visit auto-seed: if THIS TENANT has zero partner_categories
  // rows, seed the 5 defaults so admins see editable rows. Previously
  // this was global (super-admin saw other tenants' seeds and skipped
  // seeding the current tenant — A3-004 cross-tenant leak).
  if (tenantId) {
    await ensureDefaultsSeeded(tenantId);
  }

  // Explicit tenant scoping (A3-004): every list query is filtered by
  // current tenant id. Without this, super-admin reads would bypass
  // RLS and see other tenants' rows.
  const catsQ = supabase
    .from("partner_categories")
    .select("id, title, description, display_order, is_visible")
    .order("display_order", { ascending: true });
  const partnersQ = supabase
    .from("partners")
    .select(
      "id, category_id, name, role, company, phone, email, display_order, is_visible, photo_id, photo_crop, logo_id, logo_crop",
    )
    .order("display_order", { ascending: true });
  const mediaQ = supabase
    .from("media")
    .select("id, cloudinary_public_id, url, alt")
    .eq("kind", "image")
    .order("uploaded_at", { ascending: false });

  const [{ data: cats }, { data: partners }, { data: media }] = await Promise.all([
    tenantId ? catsQ.eq("tenant_id", tenantId) : catsQ,
    tenantId ? partnersQ.eq("tenant_id", tenantId) : partnersQ,
    tenantId ? mediaQ.eq("tenant_id", tenantId) : mediaQ,
  ]);

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-ink/55 hover:text-ink mb-6"
        >
          <ArrowLeft size={14} /> Back to Site Editor
        </Link>
        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3"
          style={{ fontWeight: 500 }}
        >
          Site Editor · Trusted Partners
        </p>
        <h1
          className="text-2xl md:text-3xl text-ink mb-2"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          Lenders, inspectors, trades.
        </h1>
        <p className="text-sm text-ink/65 max-w-2xl mb-8">
          Edit each category and the partners under it — name, role, company,
          phone, email, headshot photo, and company logo. Reorder, hide, add,
          delete. Defaults are pre-populated for you.
        </p>

        <PartnersManager
          categories={(cats ?? []) as CategoryRow[]}
          partners={(partners ?? []) as PartnerRow[]}
          library={(media ?? []) as LibraryItem[]}
        />
      </div>
    </AdminShell>
  );
}

/**
 * If THIS TENANT has no partner_categories rows, copy the defaults
 * from `lib/content.ts` into the database so the admin always sees
 * editable rows. Idempotent — bails when the tenant already has
 * categories. Tenant-scoped (A3-004) — never inserts cross-tenant
 * data.
 */
async function ensureDefaultsSeeded(tenantId: string) {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("partner_categories")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if ((count ?? 0) > 0) return;

  const { content } = await import("@/lib/content");
  for (let i = 0; i < content.partners.categories.length; i++) {
    const cat = content.partners.categories[i];
    const { data: inserted } = await supabase
      .from("partner_categories")
      .insert({
        tenant_id: tenantId,
        title: cat.title,
        description: cat.body,
        display_order: i,
        is_visible: true,
      })
      .select("id")
      .single();
    if (!inserted) continue;

    // Default contacts list is empty for new tenants in the
    // multi-tenant build. Cast through unknown so TS doesn't narrow
    // the empty literal to never[].
    type PartnerSeed = {
      name: string;
      role: string;
      company: string;
      phone: string;
      email: string;
    };
    const seedContacts = cat.contacts as unknown as PartnerSeed[];
    const partners = seedContacts.map((c, idx) => ({
      tenant_id: tenantId,
      category_id: inserted.id,
      name: c.name,
      role: c.role,
      company: c.company,
      phone: c.phone,
      email: c.email,
      display_order: idx,
      is_visible: true,
    }));
    if (partners.length > 0) {
      await supabase.from("partners").insert(partners);
    }
  }
}
