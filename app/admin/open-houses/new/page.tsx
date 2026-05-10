import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import OpenHouseForm from "@/components/admin/openhouse/OpenHouseForm";
import type { OpenHouseInput } from "@/app/admin/open-houses/actions";
import type { LibraryItem } from "@/components/admin/media/ImagePicker";
import { tenantHasFeature } from "@/lib/features";
import { UpgradeBanner } from "@/components/admin/UpgradeBanner";

export const dynamic = "force-dynamic";

export default async function NewOpenHousePage() {
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

  const { data: media } = await supabase
    .from("media")
    .select("id, cloudinary_public_id, url, alt")
    .eq("kind", "image")
    .order("uploaded_at", { ascending: false });

  const initial: OpenHouseInput = {
    slug: "",
    heading: "",
    address: "",
    city: null,
    state_full: null,
    postal_code: null,
    open_date: null,
    open_time_label: "",
    open_date_2: null,
    open_time_label_2: null,
    bedrooms: null,
    bathrooms: null,
    garage_spaces: 0,
    mls_id: null,
    hero_image_id: null,
    hero_image_crop: null,
    second_image_id: null,
    second_image_crop: null,
    third_image_id: null,
    third_image_crop: null,
    features: [],
    description: "",
    is_published: true,
  };

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <OpenHouseForm initial={initial} library={(media ?? []) as LibraryItem[]} />
    </AdminShell>
  );
}
