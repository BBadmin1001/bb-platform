import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import CommunityForm from "@/components/admin/communities/CommunityForm";
import type { CommunityInput } from "@/app/admin/communities/actions";
import type { LibraryItem } from "@/components/admin/media/ImagePicker";

export default async function NewCommunityPage() {
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

  const initial: CommunityInput = {
    slug: "",
    name: "",
    state: "Virginia",
    tagline: "",
    about: "",
    market_year_summary: "",
    samina_quote: "",
    median_price: "",
    yoy_change: "",
    yoy_direction: "flat",
    days_on_market: "",
    market_type: "Balanced",
    data_year: new Date().getFullYear(),
    image_id: null,
    image_crop: null,
    hero_image_id: null,
    hero_image_crop: null,
    is_visible: true,
    price_tiers: [],
    life: { schools: "", parks: "", dining: "", commute: "" },
  };

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <CommunityForm initial={initial} library={(media ?? []) as LibraryItem[]} />
    </AdminShell>
  );
}
