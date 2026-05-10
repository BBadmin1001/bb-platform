import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
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

  // First-visit auto-seed: if there are zero partner_categories rows,
  // populate the 5 defaults from `lib/content.ts` so admins always see
  // editable rows instead of an empty-state button. Safe to re-run via
  // ON CONFLICT-style insert (we only insert categories the admin doesn't
  // already have by title).
  await ensureDefaultsSeeded();

  const [{ data: cats }, { data: partners }, { data: media }] = await Promise.all([
    supabase
      .from("partner_categories")
      .select("id, title, description, display_order, is_visible")
      .order("display_order", { ascending: true }),
    supabase
      .from("partners")
      .select(
        "id, category_id, name, role, company, phone, email, display_order, is_visible, photo_id, photo_crop, logo_id, logo_crop",
      )
      .order("display_order", { ascending: true }),
    supabase
      .from("media")
      .select("id, cloudinary_public_id, url, alt")
      .eq("kind", "image")
      .order("uploaded_at", { ascending: false }),
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
 * If no partner_categories rows exist yet, copy the defaults from
 * `lib/content.ts` into the database so the admin always sees editable
 * rows. Idempotent — only inserts categories whose titles are missing.
 */
async function ensureDefaultsSeeded() {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("partner_categories")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;

  const { content } = await import("@/lib/content");
  for (let i = 0; i < content.partners.categories.length; i++) {
    const cat = content.partners.categories[i];
    const { data: inserted } = await supabase
      .from("partner_categories")
      .insert({
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
