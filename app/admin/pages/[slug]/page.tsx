import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import CustomPageEditor from "@/components/admin/CustomPageEditor";

export const dynamic = "force-dynamic";

export default async function CustomPageEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: page } = await supabase
    .from("custom_pages")
    .select(
      "id, slug, title, body_md, meta_description, is_published, show_in_nav, display_order, updated_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!page) notFound();

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-3xl mx-auto py-8">
        <Link
          href="/admin/pages"
          className="inline-flex items-center gap-1.5 text-xs mb-6"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ArrowLeft size={14} /> All custom pages
        </Link>

        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <p
              className="text-[0.65rem] tracking-[0.32em] uppercase mb-2"
              style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
            >
              Custom Page · /p/{page.slug as string}
            </p>
            <h1
              className="text-2xl md:text-3xl"
              style={{
                color: "var(--foreground)",
                fontWeight: 600,
                letterSpacing: "0.005em",
              }}
            >
              {page.title as string}
            </h1>
          </div>
          <a
            href={`/p/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-secondary inline-flex items-center"
          >
            <ExternalLink size={13} className="mr-2" />
            View page
          </a>
        </div>

        <CustomPageEditor
          pageId={page.id as string}
          initial={{
            title: page.title as string,
            body_md: (page.body_md as string) ?? "",
            meta_description: (page.meta_description as string | null) ?? "",
            is_published: page.is_published as boolean,
            show_in_nav: page.show_in_nav as boolean,
          }}
        />
      </div>
    </AdminShell>
  );
}
