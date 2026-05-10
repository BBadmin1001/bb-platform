/**
 * Reviews loader — reads from `public.reviews` (visible only) and falls back
 * to the static `lib/reviews.ts` set if DB unavailable.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { reviews as staticReviews, ratingsLine, type Review } from "./reviews";
import { getCurrentTenantId } from "./tenant/context";

let cached: SupabaseClient | null = null;
function client(): SupabaseClient | null {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    return null;
  if (!cached) {
    cached = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );
  }
  return cached;
}

type DbRow = {
  id: string;
  source: string;
  author_name: string | null;
  author_short_label: string | null;
  rating: number | null;
  quote: string;
  is_featured_homepage: boolean;
  display_order: number;
};

function toReview(r: DbRow): Review {
  const sourceMap: Record<string, Review["source"]> = {
    google: "Google",
    zillow: "Zillow",
    realtor: "Realtor.com",
    manual: "Google", // unknown manual entries default to Google for the chip
  };
  return {
    quote: r.quote,
    source: sourceMap[r.source] ?? "Google",
    short: r.author_short_label ?? r.author_name ?? undefined,
  };
}

export async function getReviews(opts: { onlyHomepage?: boolean } = {}): Promise<Review[]> {
  try {
    const supabase = client();
    if (!supabase) return staticReviews;
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return staticReviews;

    let query = supabase
      .from("reviews")
      .select(
        "id, source, author_name, author_short_label, rating, quote, is_featured_homepage, display_order",
      )
      .eq("tenant_id", tenantId)
      .eq("is_visible", true)
      // Only approved rows ever go public — pending Google reviews stay
      // private until the admin approves; rejected ones never leak.
      .eq("status", "approved")
      // Internal feedback is private by design — never surface even if a
      // row was accidentally promoted to source='internal'.
      .neq("source", "internal")
      .order("display_order", { ascending: true });

    if (opts.onlyHomepage) {
      query = query.eq("is_featured_homepage", true);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return staticReviews;
    return (data as DbRow[]).map(toReview);
  } catch {
    return staticReviews;
  }
}

export { ratingsLine };
