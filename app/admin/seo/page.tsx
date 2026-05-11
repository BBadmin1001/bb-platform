import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  ImageIcon,
  Search,
  Map as MapIcon,
  Lock,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant/context";
import AdminShell from "@/components/admin/AdminShell";
import { tenantHasFeature } from "@/lib/features";
import { UpgradeBanner } from "@/components/admin/UpgradeBanner";

/**
 * SEO hub — overview of every SEO-related editor / report.
 *
 * Currently shipping:
 *   • County landing pages (full editor)
 *   • Sitemap + robots reference
 *
 * Tagged "Soon" but planned:
 *   • Per-page SEO metadata (titles + descriptions)
 *   • Image alt-text audit
 *   • Google Search Console verification + indexing status
 *   • Keyword tracker
 */
export default async function SeoHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Hard-gate on the SEO county pages feature. Tenants on the
  // Visibility plan get full access; everyone else sees the upgrade
  // card and we skip the DB stats query entirely (no point).
  const hasSeo = await tenantHasFeature("seo_county_pages");
  if (!hasSeo) {
    return (
      <AdminShell user={{ email: user.email ?? "" }}>
        <div className="max-w-5xl mx-auto py-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs mb-6"
            style={{ color: "var(--muted-foreground)" }}
          >
            <ArrowLeft size={14} /> Back to Site Editor
          </Link>
          <UpgradeBanner feature="seo_county_pages" />
        </div>
      </AdminShell>
    );
  }

  // Quick-stats pulled from the DB so the cards can show live numbers.
  // Explicit tenant scoping (A3-004) — super-admin reads bypass RLS
  // and would surface other tenants' rows otherwise.
  const tenantId = await getCurrentTenantId();
  const countyQ = supabase
    .from("county_landing_pages")
    .select("id, is_published");
  const altQ = supabase
    .from("media")
    .select("id")
    .eq("kind", "image")
    .or("alt.is.null,alt.eq.");
  const [{ data: countyRows }, { data: missingAlt }] = await Promise.all([
    tenantId ? countyQ.eq("tenant_id", tenantId) : countyQ,
    tenantId ? altQ.eq("tenant_id", tenantId) : altQ,
  ]);

  const countyTotal = (countyRows ?? []).length;
  const countyPublished = (countyRows ?? []).filter((r) => r.is_published).length;
  const altMissing = (missingAlt ?? []).length;

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-5xl mx-auto py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs mb-6"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ArrowLeft size={14} /> Back to Site Editor
        </Link>

        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
          style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
        >
          Site Editor · SEO
        </p>
        <h1
          className="text-2xl md:text-3xl mb-2"
          style={{
            color: "var(--foreground)",
            fontWeight: 600,
            letterSpacing: "0.005em",
          }}
        >
          Search visibility.
        </h1>
        <p
          className="text-sm max-w-2xl mb-10"
          style={{ color: "var(--muted-foreground)" }}
        >
          Help the right people find Samina on Google. Each tile below is a
          lever you can pull — county landing pages are the highest-impact
          one for local real estate searches.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* — County landing pages — */}
          <Link
            href="/admin/seo/counties"
            className="admin-card-elevated group/animated-card relative overflow-hidden rounded-xl p-6 hover:shadow-lg transition-shadow flex flex-col"
            style={{ color: "var(--card-foreground)" }}
          >
            <div className="flex items-start justify-between mb-4">
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
                <MapPin size={20} strokeWidth={1.6} />
              </span>
              <span
                className="text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 14%, transparent)",
                  color: "var(--primary)",
                  fontWeight: 700,
                }}
              >
                {countyPublished} live · {countyTotal} total
              </span>
            </div>
            <h3
              className="text-base mb-1"
              style={{ color: "var(--card-foreground)", fontWeight: 600 }}
            >
              County landing pages
            </h3>
            <p
              className="text-xs leading-relaxed mb-4 flex-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              Auto-generate <code className="admin-mono">/realtor-in/[county]</code>{" "}
              pages that rank for searches like &ldquo;realtor in Loudoun County
              Virginia&rdquo;. Pick which counties to publish — content is
              auto-built from your brand identity, communities, and reviews.
            </p>
            <span
              className="text-[11px] uppercase tracking-[0.22em] inline-flex items-center gap-1.5"
              style={{ color: "var(--primary)", fontWeight: 600 }}
            >
              Manage <ArrowUpRight size={12} />
            </span>
          </Link>

          {/* — Sitemap + robots — */}
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-card-elevated rounded-xl p-6 hover:shadow-lg transition-shadow flex flex-col"
            style={{ color: "var(--card-foreground)" }}
          >
            <div className="flex items-start justify-between mb-4">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 12%, var(--card))",
                  color: "var(--primary)",
                  border:
                    "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
                }}
              >
                <MapIcon size={20} strokeWidth={1.6} />
              </span>
            </div>
            <h3
              className="text-base mb-1"
              style={{ color: "var(--card-foreground)", fontWeight: 600 }}
            >
              Sitemap
            </h3>
            <p
              className="text-xs leading-relaxed mb-4 flex-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              Auto-generated index of every public page (including all
              published county landing pages). Submit this URL to Google
              Search Console once for instant indexing.
            </p>
            <span
              className="admin-mono text-[11px]"
              style={{ color: "var(--primary)" }}
            >
              /sitemap.xml <ArrowUpRight size={11} className="inline" />
            </span>
          </a>

          {/* — Image alt-text audit — */}
          <SoonCard
            icon={ImageIcon}
            title="Image alt-text audit"
            badge={`${altMissing} missing`}
            badgeVariant={altMissing > 0 ? "destructive" : "ok"}
            hint="Find images without descriptions — Google uses alt text to understand visual content. Missing alt text hurts accessibility and SEO scoring."
          />

          {/* — Search Console — */}
          <SoonCard
            icon={Search}
            title="Google Search Console"
            hint="Verify the site, submit sitemap, see indexing status + which queries bring visitors. Requires OAuth + Search Console API integration."
          />

          {/* — Keyword tracker — */}
          <SoonCard
            icon={Lightbulb}
            title="Keyword tracker"
            hint="Pick the search phrases you want to rank for, monitor where you appear in Google for each one over time."
          />

          {/* — Schema.org markup — */}
          <SoonCard
            icon={Sparkles}
            title="Schema.org markup"
            hint="Structured data for RealEstateAgent + LocalBusiness so Google shows rich snippets (rating stars, hours, photo) directly in search results."
          />
        </div>
      </div>
    </AdminShell>
  );
}

function SoonCard({
  icon: Icon,
  title,
  hint,
  badge,
  badgeVariant,
}: {
  icon: typeof MapPin;
  title: string;
  hint: string;
  badge?: string;
  badgeVariant?: "ok" | "destructive";
}) {
  const badgeStyle =
    badgeVariant === "destructive"
      ? {
          background:
            "color-mix(in srgb, var(--destructive) 14%, transparent)",
          color: "var(--destructive)",
        }
      : {
          background:
            "color-mix(in srgb, var(--primary) 12%, transparent)",
          color: "var(--primary)",
        };
  return (
    <div
      className="admin-card-elevated rounded-xl p-6 relative flex flex-col"
      style={{ opacity: 0.85, color: "var(--card-foreground)" }}
    >
      <div className="flex items-start justify-between mb-4">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{
            background: "color-mix(in srgb, var(--foreground) 6%, transparent)",
            color: "var(--muted-foreground)",
          }}
        >
          <Icon size={20} strokeWidth={1.5} />
        </span>
        {badge ? (
          <span
            className="text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full"
            style={{ ...badgeStyle, fontWeight: 700 }}
          >
            {badge}
          </span>
        ) : (
          <span
            className="text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full inline-flex items-center gap-1"
            style={{
              color: "var(--muted-foreground)",
              background:
                "color-mix(in srgb, var(--foreground) 6%, transparent)",
              fontWeight: 700,
            }}
          >
            <Lock size={9} /> Soon
          </span>
        )}
      </div>
      <h3
        className="text-base mb-1"
        style={{ color: "var(--card-foreground)", fontWeight: 600 }}
      >
        {title}
      </h3>
      <p
        className="text-xs leading-relaxed flex-1"
        style={{ color: "var(--muted-foreground)" }}
      >
        {hint}
      </p>
    </div>
  );
}
