import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { resolveTenant } from "@/lib/tenant/resolver";

export const dynamic = "force-dynamic";

/**
 * Phase 24 — pageview ingestion beacon.
 *
 * The public site fires `POST /api/pv` from every page render (see
 * `<TrackPageview>` in components/TrackPageview.tsx). We resolve the
 * active tenant from the proxy-stamped headers, derive a coarse
 * visitor hash (no IP/cookie/PII persisted), and insert one row into
 * tenant_pageviews. Errors are swallowed silently — analytics should
 * never break a page.
 */

async function hashHex(input: string): Promise<string> {
  // SHA-256 via Web Crypto — runs in the Edge runtime too.
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      path?: string;
      referrer?: string;
    };
    const path = (body.path ?? "/").slice(0, 512);
    const referrer = (body.referrer ?? "").slice(0, 512) || null;

    // Proxy doesn't run on /api/* so x-bb-tenant-id isn't stamped.
    // Re-resolve the tenant from the Referer (the page that fired
    // the beacon). Falls back to the Host header for edge cases.
    const refererUrl = (() => {
      const r = req.headers.get("referer");
      if (!r) return null;
      try {
        return new URL(r);
      } catch {
        return null;
      }
    })();
    const host =
      refererUrl?.host ?? req.headers.get("host") ?? "";
    const searchParams = refererUrl
      ? refererUrl.searchParams
      : new URLSearchParams();
    const ctx = await resolveTenant(host, searchParams);
    if (ctx.kind !== "tenant") {
      // Master / unknown context — nothing to record.
      return new NextResponse(null, { status: 204 });
    }
    const tenantId = ctx.tenant.id;

    // Coarse visitor hash — IP + UA + UTC day. Rolls over every 24h
    // so a returning visitor counts once per day. Never written to
    // the DB in raw form.
    const ip =
      req.headers.get("x-nf-client-connection-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "";
    const ua = req.headers.get("user-agent") ?? "";
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const visitorHash = await hashHex(`${ip}|${ua}|${day}|${tenantId}`);

    const svc = createServiceClient();
    await svc.from("tenant_pageviews").insert({
      tenant_id: tenantId,
      path,
      referrer,
      visitor_hash: visitorHash,
    });

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("[pv] beacon failed", e);
    return new NextResponse(null, { status: 204 });
  }
}
