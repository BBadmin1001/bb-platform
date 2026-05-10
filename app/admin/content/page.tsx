import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import { PAGE_ORDER, PAGE_LABELS, sectionsForPage } from "@/lib/contentRegistry";

export default async function ContentIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3"
          style={{ fontWeight: 500 }}
        >
          Site Editor · Content
        </p>
        <h1
          className="text-2xl md:text-3xl text-ink mb-2"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          Edit a page.
        </h1>
        <p className="text-sm text-ink/65 max-w-xl mb-10">
          Pick a page to edit its headings, paragraphs, and CTAs. Every change
          is saved to history for 30 days — you can roll back from the section
          screen anytime.
        </p>

        <div className="space-y-2">
          {PAGE_ORDER.filter((p) => p !== "brand").map((p) => {
            const sections = sectionsForPage(p);
            return (
              <Link
                key={p}
                href={`/admin/content/${p}`}
                className="admin-card group p-5 flex items-center justify-between hover:border-navy/30 transition-colors"
              >
                <div>
                  <h3
                    className="text-base text-ink"
                    style={{ fontWeight: 500 }}
                  >
                    {PAGE_LABELS[p]}
                  </h3>
                  <p className="text-xs text-ink/55 mt-1">
                    {sections.length}{" "}
                    {sections.length === 1 ? "section" : "sections"}
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  className="text-ink/40 group-hover:text-navy"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
