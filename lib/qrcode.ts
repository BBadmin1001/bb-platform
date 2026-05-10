/**
 * Server-side QR code generation. Returns a data:image/png URL the
 * page can drop directly into an `<img src="...">`. Cached per call so
 * repeated renders during a single request are free.
 */

import QRCode from "qrcode";

export async function qrDataUrl(
  text: string,
  options: { size?: number; color?: string } = {},
): Promise<string> {
  const size = options.size ?? 240;
  const color = options.color ?? "#142840"; // brand navy
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: {
        dark: color,
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  } catch {
    return "";
  }
}

/** Resolve the absolute URL of the deployed site (for embedding in QR codes). */
export function siteOrigin(): string {
  // Honour an explicit override, then Netlify's URL var, then localhost.
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    "http://localhost:3008"
  );
}
