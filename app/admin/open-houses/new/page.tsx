import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import OpenHouseForm from "@/components/admin/openhouse/OpenHouseForm";
import type { OpenHouseInput } from "@/app/admin/open-houses/actions";
import type { LibraryItem } from "@/components/admin/media/ImagePicker";

export const dynamic = "force-dynamic";

export default async function NewOpenHousePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

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
