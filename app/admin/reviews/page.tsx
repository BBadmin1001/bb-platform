import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant/context";
import AdminShell from "@/components/admin/AdminShell";
import ReviewsManager, {
  type ReviewRow,
  type SubmissionRow,
} from "@/components/admin/reviews/ReviewsManager";

export const dynamic = "force-dynamic";

/**
 * Admin Reviews — manage published reviews + triage incoming
 * submissions (both public `/leave-review` posts and internal feedback
 * forms). The sidebar links here; without this page.tsx the route
 * 404'd (bug A3-005).
 *
 * All reads are explicitly tenant-scoped (A3-004): super-admins
 * bypass RLS, so without `.eq("tenant_id", ...)` a master operator
 * viewing as another tenant would see Samina's reviews instead.
 */
export default async function ReviewsAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const tenantId = await getCurrentTenantId();

  // Visible / featured / hidden reviews list — what shows on the
  // public site or in the homepage strip.
  let reviewsQ = supabase
    .from("reviews")
    .select(
      "id, source, external_id, author_name, author_short_label, rating, quote, is_featured_homepage, is_visible, status, display_order, written_at",
    )
    .order("display_order", { ascending: true });
  if (tenantId) reviewsQ = reviewsQ.eq("tenant_id", tenantId);
  const { data: reviewsData } = await reviewsQ;

  // Split pending Google reviews (status='pending') out of the main
  // list so they render in their own awaiting-approval bucket.
  const all = (reviewsData ?? []) as ReviewRow[];
  const initial = all.filter((r) => r.status !== "pending");
  const pendingGoogle = all.filter(
    (r) => r.status === "pending" && r.source === "google",
  );

  // Public submissions awaiting triage.
  let pubSubmissionsQ = supabase
    .from("review_submissions")
    .select(
      "id, author_name, author_email, author_phone, rating, quote, status, kind, submitted_at",
    )
    .eq("kind", "public")
    .order("submitted_at", { ascending: false })
    .limit(100);
  if (tenantId) pubSubmissionsQ = pubSubmissionsQ.eq("tenant_id", tenantId);
  const { data: pubSubs } = await pubSubmissionsQ;

  let intSubmissionsQ = supabase
    .from("review_submissions")
    .select(
      "id, author_name, author_email, author_phone, rating, quote, status, kind, submitted_at",
    )
    .eq("kind", "internal")
    .order("submitted_at", { ascending: false })
    .limit(100);
  if (tenantId) intSubmissionsQ = intSubmissionsQ.eq("tenant_id", tenantId);
  const { data: intSubs } = await intSubmissionsQ;

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12">
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
          Site Editor · Reviews
        </p>
        <h1
          className="text-2xl md:text-3xl text-ink mb-2"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          Client reviews.
        </h1>
        <p className="text-sm text-ink/65 max-w-2xl mb-8">
          Add reviews manually, triage incoming submissions, and decide
          which ones get the homepage spotlight. Public submissions land
          here for your approval before they show up anywhere.
        </p>

        <ReviewsManager
          initial={initial}
          pendingGoogle={pendingGoogle}
          submissions={(pubSubs ?? []) as SubmissionRow[]}
          internalFeedback={(intSubs ?? []) as SubmissionRow[]}
        />
      </div>
    </AdminShell>
  );
}
