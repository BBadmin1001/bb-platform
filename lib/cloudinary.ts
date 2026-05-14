/**
 * Minimal Cloudinary unsigned-upload helper.
 *
 * Used only by the public intake wizard (`components/IntakeWizard.tsx`)
 * to let realtors attach a headshot, hero shot, and brokerage logo
 * to their submission. We no longer build sites from this data, but
 * master operators still want to see what photos the realtor sent.
 *
 * Configuration (both must be set, both NEXT_PUBLIC_*):
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET   ← must be an "unsigned" preset
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

export function cloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

export async function uploadToCloudinary(file: File): Promise<{
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
}> {
  if (!cloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured. Check .env.local.");
  }

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
    { method: "POST", body: fd },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
  return res.json();
}
