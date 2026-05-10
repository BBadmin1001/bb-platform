/**
 * Dynamic favicon route — Next.js auto-discovers this file and serves it
 * as `/icon` (referenced by `<link rel="icon">` injected into every page).
 *
 * Why a dynamic route instead of a static .ico file:
 *   • The favicon source is editable from /admin/brand → Favicon. We need
 *     to honor whatever the admin picks (Cloudinary upload OR fallback to
 *     the realtor portrait OR the static asset) on every request.
 *   • Browsers render favicons as-is. To get a *circular* favicon in the
 *     tab, the underlying PNG itself needs transparent corners. We do
 *     that here by piping the source image through ImageResponse with
 *     border-radius: 50% — the rendered PNG comes out round.
 *
 * Source resolution chain (handled inside getFavicon):
 *   1) brand.favicon section → Cloudinary r_max URL (already round)
 *   2) brand.portrait section → Cloudinary r_max URL
 *   3) Static /images/Samina Headshot.jpeg (square JPEG)
 *
 * For (3) we read the file from disk and embed it as a data URL since
 * ImageResponse runs in an isolated environment and can't fetch
 * `/images/...` relative paths directly.
 */

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getFavicon } from "@/lib/contentLoader";

export const runtime = "nodejs"; // need fs for static fallback
export const size = { width: 256, height: 256 };
export const contentType = "image/png";

export default async function Icon() {
  let src = await getFavicon();

  // Local /public/* paths can't be fetched by ImageResponse — embed as data URL.
  if (src.startsWith("/")) {
    try {
      const filePath = path.join(
        process.cwd(),
        "public",
        decodeURIComponent(src.replace(/^\//, "")),
      );
      const buf = await readFile(filePath);
      const ext = path.extname(filePath).slice(1).toLowerCase();
      const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
      src = `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      // If the static read fails, fall through with the original path —
      // ImageResponse will produce a transparent circle, which is still
      // better than a square JPEG.
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img
          src={src}
          width={256}
          height={256}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "50%",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
