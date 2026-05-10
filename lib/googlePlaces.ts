/**
 * Google Places API client (Places API "New" / Place Details v1).
 *
 *   fetchPlaceWithReviews(placeId, apiKey)
 *     → { displayName, rating, userRatingCount, reviews: [...] }
 *
 * Uses the v1 "Place Details" endpoint with a tightly-scoped FieldMask.
 * We only ever request the fields we actually display, both because
 * Google's pricing is per-field and because it returns less data over
 * the wire.
 *
 * Why we use this instead of the legacy /maps/api/place/details/json:
 *   • The new v1 endpoint returns a stable, well-typed shape
 *   • Field masks let us cap call cost (free tier covers our usage easily)
 *   • Returns up to 5 most-recent reviews per call
 *
 * The API itself is read-only. Fetch is the entirety of the integration.
 *
 * Docs: https://developers.google.com/maps/documentation/places/web-service/place-details
 */

const PLACE_DETAILS_URL = "https://places.googleapis.com/v1/places";

// ─────────────────────────── Types ──────────────────────────────

interface GooglePlaceReviewAuthor {
  displayName?: string;
  uri?: string;
  photoUri?: string;
}

interface GooglePlaceReview {
  /**
   * Stable per-review identifier — not exposed by the legacy API but the
   * v1 endpoint includes it as `name` (full resource path). We dedupe
   * future syncs against this.
   */
  name: string;
  rating?: number;
  text?: { text?: string; languageCode?: string };
  originalText?: { text?: string; languageCode?: string };
  authorAttribution?: GooglePlaceReviewAuthor;
  publishTime?: string;
  relativePublishTimeDescription?: string;
}

interface GooglePlaceResponse {
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  reviews?: GooglePlaceReview[];
  googleMapsUri?: string;
}

export interface NormalizedGoogleReview {
  /** Stable Google id used for dedupe (`places/.../reviews/...`). */
  externalId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  rating: number;
  text: string;
  publishedAt: string; // ISO timestamp
  relativeTime: string;
}

export interface NormalizedPlace {
  displayName: string;
  formattedAddress: string;
  rating: number;
  userRatingCount: number;
  googleMapsUri: string;
  reviews: NormalizedGoogleReview[];
}

// ─────────────────────────── Errors ─────────────────────────────

export class GooglePlacesError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "GooglePlacesError";
  }
}

// ─────────────────────────── Fetch ──────────────────────────────

/**
 * Look up a place by ID and return the normalized result.
 *
 * Throws GooglePlacesError on any non-OK response so callers can show
 * a precise error in the wizard ("invalid API key", "place not found",
 * "billing not enabled", etc.) rather than a generic failure.
 */
export async function fetchPlaceWithReviews(
  placeId: string,
  apiKey: string,
): Promise<NormalizedPlace> {
  if (!placeId) throw new GooglePlacesError("Place ID is required.", 400);
  if (!apiKey) throw new GooglePlacesError("API key is required.", 400);

  const fieldMask = [
    "displayName",
    "formattedAddress",
    "rating",
    "userRatingCount",
    "googleMapsUri",
    "reviews.name",
    "reviews.rating",
    "reviews.text",
    "reviews.originalText",
    "reviews.authorAttribution",
    "reviews.publishTime",
    "reviews.relativePublishTimeDescription",
  ].join(",");

  const res = await fetch(`${PLACE_DETAILS_URL}/${encodeURIComponent(placeId)}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body?.error?.message || detail;
    } catch {
      // fall back to status text
    }
    throw new GooglePlacesError(
      mapErrorMessage(res.status, detail),
      res.status,
    );
  }

  const data = (await res.json()) as GooglePlaceResponse;
  return normalize(data);
}

function mapErrorMessage(status: number, detail: string): string {
  if (status === 400)
    return `Google rejected the request: ${detail}. Double-check the Place ID — it should look like "ChIJ..." (no spaces).`;
  if (status === 403) {
    if (/billing/i.test(detail))
      return `Google requires a billing account on the project before issuing data. Add a card in Google Cloud Console → Billing (you won't be charged unless you exceed the 1,000 calls/day free tier).`;
    if (/api[_ ]?not[_ ]?enabled/i.test(detail))
      return `Places API isn't enabled on the project linked to that key. Open Google Cloud Console → APIs & Services → Library, search "Places API", click Enable, then come back.`;
    return `Permission denied: ${detail}. Most often this is the API key restrictions — make sure it allows "Places API (New)".`;
  }
  if (status === 404) return `Place ID not found. Use Google's Place ID Finder to get the right one.`;
  if (status === 429)
    return `Hit Google's rate limit. Try again in a minute. (Daily quota: 1,000 calls — you won't normally come close.)`;
  return `Google Places error (${status}): ${detail}`;
}

function normalize(data: GooglePlaceResponse): NormalizedPlace {
  const reviews = (data.reviews ?? []).map((r): NormalizedGoogleReview => {
    const text =
      r.text?.text || r.originalText?.text || ""; // some reviews have only originalText
    return {
      externalId: r.name ?? `${data.displayName?.text ?? "place"}-${r.publishTime ?? ""}`,
      authorName: r.authorAttribution?.displayName ?? "Anonymous",
      authorPhotoUrl: r.authorAttribution?.photoUri ?? null,
      rating: r.rating ?? 5,
      text,
      publishedAt: r.publishTime ?? new Date().toISOString(),
      relativeTime: r.relativePublishTimeDescription ?? "",
    };
  });

  return {
    displayName: data.displayName?.text ?? "",
    formattedAddress: data.formattedAddress ?? "",
    rating: data.rating ?? 0,
    userRatingCount: data.userRatingCount ?? 0,
    googleMapsUri: data.googleMapsUri ?? "",
    reviews,
  };
}
