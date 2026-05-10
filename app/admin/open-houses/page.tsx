import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, ExternalLink, Pencil, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import { tenantHasFeature } from "@/lib/features";
import { UpgradeBanner } from "@/components/admin/UpgradeBanner";

export const dynamic = "force-dynamic";

export default async function OpenHousesAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Open-house landing pages + printable flyers ship with the
  // Marketing plan. Without `flyers` unlocked, hide the listing and
  // funnel customers to the upgrade banner.
  if (!(await tenantHasFeature("flyers"))) {
    return (
      <AdminShell user={{ email: user.email ?? "" }}>
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-ink/55 hover:text-ink mb-6"
          >
            <ArrowLeft size={14} /> Back to Site Editor
          </Link>
          <UpgradeBanner feature="flyers" />
        </div>
      </AdminShell>
    );
  }

  const { data: rows } = await supabase
    .from("open_houses")
    .select("id, slug, heading, address, open_date, open_time_label, is_published, updated_at")
    .order("open_date", { ascending: false, nullsFirst: false });

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-ink/55 hover:text-ink mb-6"
        >
          <ArrowLeft size={14} /> Back to Site Editor
        </Link>

        <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
          <div>
            <p
              className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3"
              style={{ fontWeight: 500 }}
            >
              Site Editor · Open Houses
            </p>
            <h1
              className="text-2xl md:text-3xl text-ink mb-2"
              style={{ fontWeight: 600, letterSpacing: "0.01em" }}
            >
              Open House landing pages.
            </h1>
            <p className="text-sm text-ink/65 max-w-2xl">
              Create a one-page landing site for each open house. Visitors RSVP
              via an auto-generated form; submissions land in your Inbox. Print
              the page as a polished one-sheet flyer for handouts.
            </p>
          </div>
          <Link href="/admin/open-houses/new" className="admin-btn">
            <Plus size={14} className="mr-2" /> New open house
          </Link>
        </div>

        {!rows || rows.length === 0 ? (
          <div className="admin-card p-10 text-center">
            <p className="text-sm text-ink/65 mb-5">
              No open houses yet. Create your first to get a landing page +
              printable flyer.
            </p>
            <Link href="/admin/open-houses/new" className="admin-btn">
              <Plus size={14} className="mr-2" /> Create
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id as string}
                className="admin-card p-4 flex items-center gap-4"
              >
                <Link
                  href={`/admin/open-houses/${r.slug}`}
                  className="flex-1 min-w-0 group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className="text-base text-ink truncate group-hover:text-navy"
                      style={{ fontWeight: 500 }}
                    >
                      {r.heading as string}
                    </h3>
                    {!r.is_published && (
                      <span className="text-[10px] uppercase tracking-[0.18em] text-ink/45 bg-black/5 px-2 py-0.5 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink/55 truncate">
                    {(r.address as string) || (
                      <em className="text-ink/35">— address unset</em>
                    )}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-ink/55 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} />{" "}
                      {r.open_date
                        ? formatDate(r.open_date as string)
                        : "Date TBD"}
                    </span>
                    {r.open_time_label && <span>{r.open_time_label as string}</span>}
                    <code className="text-[10px]">/open-house/{r.slug as string}</code>
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  {r.is_published && (
                    <a
                      href={`/open-house/${r.slug}`}
                      target="_blank"
                      className="text-ink/55 hover:text-navy"
                      title="Open landing page"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <Link
                    href={`/admin/open-houses/${r.slug}`}
                    className="text-ink/55 hover:text-navy"
                  >
                    <Pencil size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function formatDate(s: string): string {
  // YYYY-MM-DD → "Sat, May 9"
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return s;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
