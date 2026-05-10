import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  MapPin,
  Plus,
  Pencil,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import { listAllCountyLandingRows } from "@/lib/countyLandingLoader";
import { tenantHasFeature } from "@/lib/features";
import { UpgradeBanner } from "@/components/admin/UpgradeBanner";

export default async function SeoCountiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Same gate as /admin/seo — hide the editor entirely for tenants
  // without the seo_county_pages feature unlocked.
  if (!(await tenantHasFeature("seo_county_pages"))) {
    return (
      <AdminShell user={{ email: user.email ?? "" }}>
        <div className="max-w-4xl mx-auto py-8">
          <Link
            href="/admin/seo"
            className="inline-flex items-center gap-1.5 text-xs mb-6"
            style={{ color: "var(--muted-foreground)" }}
          >
            <ArrowLeft size={14} /> Back to SEO
          </Link>
          <UpgradeBanner feature="seo_county_pages" />
        </div>
      </AdminShell>
    );
  }

  const rows = await listAllCountyLandingRows();
  const liveCount = rows.filter((r) => r.isPublished).length;

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-4xl mx-auto py-8">
        <Link
          href="/admin/seo"
          className="inline-flex items-center gap-1.5 text-xs mb-6"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ArrowLeft size={14} /> Back to SEO
        </Link>

        <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
          <div>
            <p
              className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
              style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
            >
              SEO · County landing pages
            </p>
            <div className="flex items-center gap-3 mb-2">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 16%, var(--card))",
                  color: "var(--primary)",
                  border:
                    "1px solid color-mix(in srgb, var(--primary) 28%, transparent)",
                }}
              >
                <MapPin size={18} strokeWidth={1.6} />
              </span>
              <h1
                className="text-2xl md:text-3xl"
                style={{
                  color: "var(--foreground)",
                  fontWeight: 600,
                  letterSpacing: "0.005em",
                }}
              >
                County landing pages
              </h1>
            </div>
          </div>
          <Link href="/admin/seo/counties/new" className="admin-btn">
            <Plus size={14} className="mr-2" /> New landing page
          </Link>
        </div>

        <p
          className="text-sm max-w-2xl mb-3"
          style={{ color: "var(--muted-foreground)" }}
        >
          Build a custom landing page for any county or service area.
          Each one gets its own URL{" "}
          <code className="admin-mono">/realtor-in/[slug]</code> and is
          optimized for searches like &ldquo;realtor in
          {" "}
          <em>your-county</em>&rdquo;.
        </p>
        <p
          className="text-xs mb-10"
          style={{ color: "var(--muted-foreground)" }}
        >
          {rows.length === 0
            ? "Nothing here yet — click New landing page to add the first."
            : `${rows.length} landing page${rows.length === 1 ? "" : "s"} · ${liveCount} live, ${rows.length - liveCount} draft`}
        </p>

        {rows.length === 0 ? (
          <div
            className="admin-card p-12 text-center"
            style={{ borderStyle: "dashed" }}
          >
            <span
              className="inline-flex h-14 w-14 items-center justify-center rounded-full mb-4"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 12%, var(--card))",
                color: "var(--primary)",
                border:
                  "1px solid color-mix(in srgb, var(--primary) 25%, transparent)",
              }}
            >
              <MapPin size={22} strokeWidth={1.5} />
            </span>
            <h3
              className="text-base mb-2"
              style={{ color: "var(--card-foreground)", fontWeight: 600 }}
            >
              No landing pages yet
            </h3>
            <p
              className="text-sm max-w-md mx-auto mb-6"
              style={{ color: "var(--muted-foreground)" }}
            >
              Pick a county where Samina works (Loudoun, Montgomery, Prince
              William …) and we&apos;ll build a fully-formed SEO landing
              page in a few clicks.
            </p>
            <Link href="/admin/seo/counties/new" className="admin-btn">
              <Plus size={14} className="mr-2" />
              Create the first one
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <Link
                key={row.id}
                href={`/admin/seo/counties/${row.slug}/edit`}
                className="admin-card group p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                {row.heroImageUrl ? (
                  <span
                    className="w-20 h-14 rounded-md overflow-hidden bg-black/5 shrink-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${row.heroImageUrl})` }}
                  />
                ) : (
                  <span
                    className="w-20 h-14 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary) 8%, var(--muted))",
                      color: "var(--primary)",
                    }}
                  >
                    <MapPin size={18} strokeWidth={1.5} />
                  </span>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3
                      className="text-sm"
                      style={{
                        color: "var(--card-foreground)",
                        fontWeight: 600,
                      }}
                    >
                      {row.countyName} County
                    </h3>
                    <span
                      className="text-[10px] uppercase tracking-[0.18em]"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {row.stateName}
                    </span>
                    {row.isPublished ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                        style={{
                          background:
                            "color-mix(in srgb, var(--primary) 14%, transparent)",
                          color: "var(--primary)",
                          fontWeight: 700,
                        }}
                      >
                        <Eye size={10} /> Live
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                        style={{
                          background:
                            "color-mix(in srgb, var(--foreground) 6%, transparent)",
                          color: "var(--muted-foreground)",
                          fontWeight: 700,
                        }}
                      >
                        <EyeOff size={10} /> Draft
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[11px] truncate"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    /realtor-in/{row.slug}
                    {row.serviceAreas.length > 0 && (
                      <span> · {row.serviceAreas.slice(0, 4).join(", ")}</span>
                    )}
                  </p>
                  {row.zipCodes.length > 0 && (
                    <p
                      className="text-[11px] mt-1"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {row.zipCodes.length} ZIP
                      {row.zipCodes.length === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
                <Pencil
                  size={15}
                  className="shrink-0 group-hover:opacity-100 opacity-50 transition-opacity"
                  style={{ color: "var(--primary)" }}
                />
              </Link>
            ))}
          </div>
        )}

        {liveCount > 0 && (
          <p
            className="text-xs mt-8"
            style={{ color: "var(--muted-foreground)" }}
          >
            <strong style={{ color: "var(--card-foreground)" }}>
              Pro tip:
            </strong>{" "}
            Once you publish a batch, submit your sitemap to Google Search
            Console — pages can take 24-72 hours to index.{" "}
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline"
              style={{ color: "var(--primary)" }}
            >
              View sitemap
              <ArrowUpRight size={11} />
            </a>
          </p>
        )}
      </div>
    </AdminShell>
  );
}
