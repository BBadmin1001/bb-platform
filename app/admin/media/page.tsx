import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant/context";
import AdminShell from "@/components/admin/AdminShell";
import MediaUploader from "@/components/admin/media/MediaUploader";
import YouTubeAdder from "@/components/admin/media/YouTubeAdder";
import MediaUsageBar from "@/components/admin/media/MediaUsageBar";
import MediaUpgradeBanner from "@/components/admin/media/MediaUpgradeBanner";
import MediaLibraryClient from "@/components/admin/media/MediaLibraryClient";
import { type MediaRow } from "@/components/admin/media/MediaCard";
import { getCloudinaryUsage } from "@/lib/cloudinaryAdmin";

export default async function MediaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Explicit tenant scoping (A3-004).
  const tenantId = await getCurrentTenantId();
  let mediaQ = supabase
    .from("media")
    .select(
      "id,kind,cloudinary_public_id,url,alt,width,height,uploaded_at",
    )
    .order("uploaded_at", { ascending: false });
  if (tenantId) mediaQ = mediaQ.eq("tenant_id", tenantId);
  const [{ data: media }, usage] = await Promise.all([
    mediaQ,
    getCloudinaryUsage(),
  ]);

  const items = (media ?? []) as MediaRow[];

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-12">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-ink/55 hover:text-ink mb-6"
        >
          <ArrowLeft size={14} /> Back to Site Editor
        </Link>

        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3"
          style={{ fontWeight: 500 }}
        >
          Site Editor · Media Library
        </p>
        <h1
          className="text-2xl md:text-3xl text-ink mb-2"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          Images & video.
        </h1>
        <p className="text-sm text-ink/65 max-w-2xl mb-8">
          Upload photos for portraits, hero backgrounds, communities, and
          closings. Crops and background removal apply via URL — the original
          file is always kept intact. YouTube clips can be added as muted,
          looping background videos.
        </p>

        {/* Storage tracker */}
        <MediaUsageBar usage={usage} />

        {/* Upgrade prompt — appears at 70%+ of plan capacity */}
        <MediaUpgradeBanner usage={usage} />

        {/* Upload + YouTube adder */}
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          <MediaUploader />
          <YouTubeAdder />
        </div>

        {/* Library */}
        {items.length === 0 ? (
          <div className="admin-card p-10 text-center">
            <p className="text-sm text-ink/60">
              Nothing in the library yet. Upload your first image above.
            </p>
          </div>
        ) : (
          <MediaLibraryClient items={items} />
        )}
      </div>
    </AdminShell>
  );
}
