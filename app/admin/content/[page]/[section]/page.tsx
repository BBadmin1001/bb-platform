import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import SectionEditor from "@/components/admin/content/SectionEditor";
import {
  findSection,
  defaultValueFor,
  PAGE_ORDER,
  type PageKey,
} from "@/lib/contentRegistry";
import type { VideoLibraryItem } from "@/components/admin/media/VideoPicker";

export default async function ContentSectionEditorPage({
  params,
}: {
  params: Promise<{ page: string; section: string }>;
}) {
  const { page: pageParam, section: sectionKey } = await params;
  if (!PAGE_ORDER.includes(pageParam as PageKey)) notFound();
  const page = pageParam as PageKey;

  const def = findSection(page, sectionKey);
  if (!def) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // A3-004: tenant-scope every read so the editor never loads
  // another tenant's saved values on this section. With more than
  // one tenant in the DB and a super-admin viewing-as, the join from
  // RLS alone would have allowed all rows through.
  const { getCurrentTenantId } = await import("@/lib/tenant/context");
  const tenantId = await getCurrentTenantId();

  // Read current saved value (if any)
  let rowQ = supabase
    .from("content_blocks")
    .select("value")
    .eq("page", page)
    .eq("key", sectionKey);
  if (tenantId) rowQ = rowQ.eq("tenant_id", tenantId);
  const { data: row } = await rowQ.maybeSingle();

  const fallback = defaultValueFor(def) as Record<string, unknown>;
  let initial: Record<string, unknown> = fallback;
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        initial = parsed;
      }
    } catch {
      // keep fallback
    }
  }

  // Pull the full media library — image and youtube rows. Pickers filter
  // by `kind` themselves. Tenant-scoped (A3-004).
  let mediaQ = supabase
    .from("media")
    .select("id, kind, cloudinary_public_id, url, alt")
    .order("uploaded_at", { ascending: false });
  if (tenantId) mediaQ = mediaQ.eq("tenant_id", tenantId);
  const { data: media } = await mediaQ;

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <SectionEditor
        section={def}
        initialValue={initial}
        defaultValue={fallback}
        pageHref={`/admin/content/${page}`}
        library={(media ?? []) as VideoLibraryItem[]}
      />
    </AdminShell>
  );
}
