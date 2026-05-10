import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import CountyLandingForm from "@/components/admin/seo/CountyLandingForm";
import type { LibraryItem } from "@/components/admin/media/ImagePicker";
import { tenantHasFeature } from "@/lib/features";
import { UpgradeBanner } from "@/components/admin/UpgradeBanner";

export default async function EditCountyLandingPage({
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

  if (!(await tenantHasFeature("seo_county_pages"))) {
    return (
      <AdminShell user={{ email: user.email ?? "" }}>
        <div className="max-w-3xl mx-auto py-8">
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

  // Fetch the row + media library in parallel.
  const [{ data: row }, { data: media }] = await Promise.all([
    supabase
      .from("county_landing_pages")
      .select(
        "slug, county_name, state_abbr, state_name, is_published, custom_heading, custom_intro, custom_meta_description, hero_image_id, zip_codes, service_areas",
      )
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .from("media")
      .select("id, cloudinary_public_id, url, alt")
      .eq("kind", "image")
      .order("uploaded_at", { ascending: false }),
  ]);

  if (!row) notFound();

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-3xl mx-auto py-8">
        <Link
          href="/admin/seo/counties"
          className="inline-flex items-center gap-1.5 text-xs mb-6"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ArrowLeft size={14} /> All landing pages
        </Link>

        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
          style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
        >
          SEO · County landing pages · Edit
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
            {row.county_name} County
          </h1>
        </div>
        <p
          className="text-sm max-w-2xl mb-10 admin-mono"
          style={{ color: "var(--muted-foreground)" }}
        >
          /realtor-in/{row.slug}
        </p>

        <CountyLandingForm
          editingSlug={slug}
          initial={{
            slug: row.slug,
            county_name: row.county_name,
            state_abbr: row.state_abbr,
            zip_codes: Array.isArray(row.zip_codes) ? (row.zip_codes as string[]) : [],
            service_areas: Array.isArray(row.service_areas)
              ? (row.service_areas as string[])
              : [],
            hero_image_id: row.hero_image_id ?? null,
            custom_heading: row.custom_heading ?? null,
            custom_intro: row.custom_intro ?? null,
            custom_meta_description: row.custom_meta_description ?? null,
            is_published: row.is_published,
          }}
          library={(media ?? []) as LibraryItem[]}
        />
      </div>
    </AdminShell>
  );
}
