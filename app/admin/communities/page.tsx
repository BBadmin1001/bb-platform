import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Eye, EyeOff, Pencil, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant/context";
import AdminShell from "@/components/admin/AdminShell";
import { cldUrl } from "@/lib/cloudinary";
import SeedDefaultsButton from "@/components/admin/communities/SeedDefaultsButton";
import { communities as staticCommunities } from "@/lib/communities";
import { DEFAULT_COMMUNITY_PHOTO } from "@/lib/imageDefaults";

const STATIC_BY_SLUG = new Map(staticCommunities.map((c) => [c.slug, c]));

export default async function CommunitiesAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Explicit tenant scoping (A3-004): RLS is defense-in-depth, but
  // super-admins bypass RLS and would see every tenant's rows. Filter
  // by current tenant id so master-as-tenant always sees the correct
  // dataset.
  const tenantId = await getCurrentTenantId();

  let rowsQuery = supabase
    .from("communities")
    .select(
      `id, slug, name, state, tagline, median_price, yoy_change, yoy_direction,
       data_year, is_visible, display_order,
       media:image_id ( cloudinary_public_id, url )`,
    )
    .order("display_order", { ascending: true });
  if (tenantId) {
    rowsQuery = rowsQuery.eq("tenant_id", tenantId);
  }
  const { data: rows } = await rowsQuery;

  const items = rows ?? [];

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-ink/55 hover:text-ink mb-6"
        >
          <ArrowLeft size={14} /> Back to Site Editor
        </Link>

        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p
              className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3"
              style={{ fontWeight: 500 }}
            >
              Site Editor · Communities
            </p>
            <h1
              className="text-2xl md:text-3xl text-ink mb-2"
              style={{ fontWeight: 600, letterSpacing: "0.01em" }}
            >
              Neighborhoods.
            </h1>
            <p className="text-sm text-ink/65 max-w-2xl">
              Edit each community&rsquo;s editorial copy, market data, and
              photo. Update the numbers once a year (typically December or
              January).
            </p>
          </div>
          <Link href="/admin/communities/new" className="admin-btn">
            <Plus size={14} className="mr-2" /> New community
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="admin-card p-10 text-center space-y-4">
            <p className="text-sm text-ink/70">
              No communities in the database yet. Seed the 6 defaults from
              the existing site to start editing them, or add a brand-new
              community above.
            </p>
            <SeedDefaultsButton />
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((c) => {
              const media = (c as unknown as { media?: { cloudinary_public_id?: string | null; url?: string } | null }).media;
              const fallback =
                STATIC_BY_SLUG.get(c.slug as string)?.image ?? DEFAULT_COMMUNITY_PHOTO;
              const thumb = media?.cloudinary_public_id
                ? cldUrl(media.cloudinary_public_id, { crop: "wide", width: 280 })
                : media?.url || fallback;
              const usingFallback = !media;
              return (
                <Link
                  key={c.id as string}
                  href={`/admin/communities/${c.slug}`}
                  className="admin-card group p-4 flex items-center gap-4 hover:border-navy/30 transition-colors"
                >
                  <div className="relative w-24 h-16 rounded bg-black/5 overflow-hidden shrink-0">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={c.name as string}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink/30">
                        <ImageIcon size={18} strokeWidth={1.25} />
                      </div>
                    )}
                    {usingFallback && (
                      <span
                        className="absolute bottom-0 left-0 right-0 bg-amber-50/95 text-amber-800 text-[8px] uppercase tracking-[0.16em] py-0.5 text-center"
                        style={{ fontWeight: 600 }}
                        title="No photo picked yet — showing default"
                      >
                        default
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className="text-base text-ink truncate"
                        style={{ fontWeight: 500 }}
                      >
                        {c.name as string}
                      </h3>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-ink/45">
                        {c.state as string}
                      </span>
                      {c.is_visible ? (
                        <Eye size={12} className="text-emerald-700" />
                      ) : (
                        <EyeOff size={12} className="text-ink/40" />
                      )}
                    </div>
                    <p className="text-xs text-ink/55 truncate">
                      {(c.tagline as string) || (
                        <em className="text-ink/35">— no tagline</em>
                      )}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-ink/60">
                      <span>{c.median_price ?? "—"} median</span>
                      <span
                        className={
                          c.yoy_direction === "up"
                            ? "text-emerald-700"
                            : c.yoy_direction === "down"
                              ? "text-orange-700"
                              : ""
                        }
                      >
                        {(c.yoy_change as string) ?? "—"} YoY
                      </span>
                      <span className="text-ink/40">
                        Data {c.data_year as number}
                      </span>
                    </div>
                  </div>
                  <Pencil size={15} className="text-ink/35 group-hover:text-navy" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
