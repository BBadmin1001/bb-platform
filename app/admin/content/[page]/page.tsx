import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import {
  PAGE_LABELS,
  PAGE_ORDER,
  sectionsForPage,
  type PageKey,
} from "@/lib/contentRegistry";

export default async function ContentPagePage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page: pageParam } = await params;
  if (!PAGE_ORDER.includes(pageParam as PageKey)) notFound();
  const page = pageParam as PageKey;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Fetch which rows have been edited (so we can show an "edited" tag)
  const { data: rows } = await supabase
    .from("content_blocks")
    .select("key,updated_at")
    .eq("page", page);
  const edited = new Map(
    (rows ?? []).map((r) => [r.key as string, r.updated_at as string]),
  );

  const sections = sectionsForPage(page);

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-8 md:py-12">
        <Link
          href="/admin/content"
          className="inline-flex items-center gap-1.5 text-xs text-ink/55 hover:text-ink mb-6"
        >
          <ArrowLeft size={14} /> All pages
        </Link>

        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3"
          style={{ fontWeight: 500 }}
        >
          Content · {page}
        </p>
        <h1
          className="text-2xl md:text-3xl text-ink mb-2"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          {PAGE_LABELS[page]}
        </h1>
        <p className="text-sm text-ink/65 mb-10">
          Pick a section to edit. Sections are listed in the order they appear
          on the page.
        </p>

        <div className="space-y-2">
          {sections.map((s) => {
            const ed = edited.get(s.key);
            return (
              <Link
                key={s.key}
                href={`/admin/content/${page}/${s.key}`}
                className="admin-card group p-5 flex items-center justify-between hover:border-navy/30 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h3
                      className="text-base text-ink truncate"
                      style={{ fontWeight: 500 }}
                    >
                      {s.label}
                    </h3>
                    {ed && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        <Pencil size={10} /> Edited
                      </span>
                    )}
                  </div>
                  {s.description && (
                    <p className="text-xs text-ink/55 mt-1 truncate">
                      {s.description}
                    </p>
                  )}
                </div>
                <ChevronRight
                  size={18}
                  className="text-ink/40 group-hover:text-navy shrink-0 ml-3"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
