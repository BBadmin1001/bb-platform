import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import CountyLandingForm from "@/components/admin/seo/CountyLandingForm";
import type { LibraryItem } from "@/components/admin/media/ImagePicker";

export default async function NewCountyLandingPage() {
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
          SEO · County landing pages · New
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
            New landing page
          </h1>
        </div>
        <p
          className="text-sm max-w-2xl mb-10"
          style={{ color: "var(--muted-foreground)" }}
        >
          Fill out the basics and click <em>Create landing page</em>. Most
          fields are optional — leave them blank and the page auto-builds
          from sensible defaults using your brand identity.
        </p>

        <CountyLandingForm library={(media ?? []) as LibraryItem[]} />
      </div>
    </AdminShell>
  );
}
