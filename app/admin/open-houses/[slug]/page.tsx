import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import OpenHouseForm from "@/components/admin/openhouse/OpenHouseForm";
import type { OpenHouseInput } from "@/app/admin/open-houses/actions";
import type { LibraryItem } from "@/components/admin/media/ImagePicker";
import type { CropArea } from "@/components/admin/media/CropEditor";
import { tenantHasFeature } from "@/lib/features";
import { UpgradeBanner } from "@/components/admin/UpgradeBanner";

export const dynamic = "force-dynamic";

function asCropArea(v: unknown): CropArea | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  if (
    typeof r.x === "number" &&
    typeof r.y === "number" &&
    typeof r.width === "number" &&
    typeof r.height === "number"
  ) {
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }
  return null;
}

export default async function EditOpenHousePage({
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

  if (!(await tenantHasFeature("flyers"))) {
    return (
      <AdminShell user={{ email: user.email ?? "" }}>
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
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

  const { data: row } = await supabase
    .from("open_houses")
    .select(
      `id, slug, heading, address, city, state_full, postal_code,
       open_date, open_time_label, open_date_2, open_time_label_2,
       bedrooms, bathrooms, garage_spaces, mls_id,
       hero_image_id, hero_image_crop, second_image_id, second_image_crop,
       third_image_id, third_image_crop, features, description, is_published`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!row) notFound();

  const { data: media } = await supabase
    .from("media")
    .select("id, cloudinary_public_id, url, alt")
    .eq("kind", "image")
    .order("uploaded_at", { ascending: false });

  const initial: OpenHouseInput = {
    slug: row.slug,
    heading: row.heading,
    address: row.address,
    city: row.city ?? null,
    state_full: row.state_full ?? null,
    postal_code: row.postal_code ?? null,
    open_date: row.open_date ?? null,
    open_time_label: row.open_time_label ?? "",
    open_date_2: row.open_date_2 ?? null,
    open_time_label_2: row.open_time_label_2 ?? null,
    bedrooms: row.bedrooms ?? null,
    bathrooms: row.bathrooms == null ? null : Number(row.bathrooms),
    garage_spaces: row.garage_spaces ?? 0,
    mls_id: row.mls_id ?? null,
    hero_image_id: row.hero_image_id ?? null,
    hero_image_crop: asCropArea(row.hero_image_crop),
    second_image_id: row.second_image_id ?? null,
    second_image_crop: asCropArea(row.second_image_crop),
    third_image_id: row.third_image_id ?? null,
    third_image_crop: asCropArea(row.third_image_crop),
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
    description: row.description ?? "",
    is_published: row.is_published ?? true,
  };

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <OpenHouseForm
        existingId={row.id as string}
        initial={initial}
        library={(media ?? []) as LibraryItem[]}
      />
    </AdminShell>
  );
}
