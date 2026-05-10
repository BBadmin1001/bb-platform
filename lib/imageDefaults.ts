/**
 * Stock fallback URLs used wherever an admin hasn't yet picked or uploaded
 * an image. The public site renders these defaults so visitors NEVER see a
 * blank image slot, and the admin picker shows the same image as a preview
 * (with the yellow "Default — pick or upload to replace" badge) so admins
 * always know what's currently rendering.
 *
 * Replace any of these with branded photos by:
 *   1) uploading your preferred image at /admin/media
 *   2) opening the relevant editor (community, closing, partner)
 *   3) picking the new photo
 *
 * — or — by editing the URL strings below if you want to change the
 * baseline default for everyone.
 */

export const DEFAULT_COMMUNITY_PHOTO =
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&auto=format&fit=crop&q=80";

export const DEFAULT_COMMUNITY_HERO_PHOTO =
  "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=1920&auto=format&fit=crop&q=80";

export const DEFAULT_CLOSING_PHOTO =
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&auto=format&fit=crop&q=80";

/** Generic professional headshot — used when a partner row has no photo_id. */
export const DEFAULT_PARTNER_PHOTO =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80";

/** Generic "company logo" placeholder. Plain text on a neutral background —
 *  signals "logo goes here" without misleading visitors. */
export const DEFAULT_PARTNER_LOGO =
  "https://placehold.co/240x80/142840/ffffff?text=Company+Logo&font=montserrat";
