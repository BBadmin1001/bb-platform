import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant/context";
import AdminShell from "@/components/admin/AdminShell";
import ClosingsManager, {
  type ClosingRow,
} from "@/components/admin/closings/ClosingsManager";
import type { LibraryItem } from "@/components/admin/media/ImagePicker";

export default async function ClosingsAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Explicit tenant scoping (A3-004).
  const tenantId = await getCurrentTenantId();

  let closingsQ = supabase
    .from("closings")
    .select(
      `id, image_id, image_crop, neighborhood, city, state, closed_year, display_order, is_visible,
       media:image_id ( cloudinary_public_id, url )`,
    )
    .order("display_order", { ascending: true });
  if (tenantId) closingsQ = closingsQ.eq("tenant_id", tenantId);
  const { data: closings } = await closingsQ;

  let mediaQ = supabase
    .from("media")
    .select("id, cloudinary_public_id, url, alt")
    .eq("kind", "image")
    .order("uploaded_at", { ascending: false });
  if (tenantId) mediaQ = mediaQ.eq("tenant_id", tenantId);
  const { data: media } = await mediaQ;

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-12">
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
          Site Editor · Recent Closings
        </p>
        <h1
          className="text-2xl md:text-3xl text-ink mb-2"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          Sold homes.
        </h1>
        <p className="text-sm text-ink/65 max-w-2xl mb-8">
          Add closed sales one at a time. Each shows on the public Closings
          page and the homepage gallery. Reorder with the arrows on each card.
        </p>

        <ClosingsManager
          initial={(closings ?? []) as unknown as ClosingRow[]}
          library={(media ?? []) as LibraryItem[]}
        />
      </div>
    </AdminShell>
  );
}
