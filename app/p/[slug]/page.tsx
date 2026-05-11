import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/contentLoader";
import { getCurrentTenantId } from "@/lib/tenant/context";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

/**
 * Public custom-page route.
 *
 * Resolves the active tenant via the request headers (proxy already
 * stamped them) and looks up a published `custom_pages` row for that
 * tenant + this slug. 404 when nothing matches.
 *
 * Markdown body is rendered server-side via `lib/markdown.ts` (which
 * sanitizes through DOMPurify) — no client JS needed.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getServiceClient();
  const tenantId = await getCurrentTenantId();
  if (!supabase || !tenantId) return { title: slug };

  const { data: page } = await supabase
    .from("custom_pages")
    .select("title, meta_description")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!page) return { title: slug };

  return {
    title: page.title,
    description: page.meta_description ?? page.title,
  };
}

export default async function CustomPagePublicView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = getServiceClient();
  const tenantId = await getCurrentTenantId();
  if (!supabase || !tenantId) notFound();

  type PageRow = { title: string; body_md: string; is_published: boolean };
  let pageRow: PageRow | null = null;
  try {
    const { data } = await supabase
      .from("custom_pages")
      .select("title, body_md, is_published")
      .eq("tenant_id", tenantId)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    pageRow = (data as unknown as PageRow | null) ?? null;
  } catch (err) {
    console.error("[p/[slug]] custom_pages lookup failed", err);
    notFound();
  }

  if (!pageRow) notFound();
  const page: PageRow = pageRow;

  let html = "";
  try {
    html = renderMarkdown(page.body_md);
  } catch (err) {
    console.error("[p/[slug]] markdown render failed", err);
    // Fall back to escaping the markdown as plain pre-wrapped text so
    // the page still renders something instead of 500'ing.
    const escaped = String(page.body_md ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    html = `<pre style="white-space: pre-wrap;">${escaped}</pre>`;
  }

  return (
    <main>
      {/* Hero */}
      <section
        className="section-y gutter-x"
        style={{ background: "#142840", color: "white" }}
      >
        <div className="max-w-4xl mx-auto pt-24 md:pt-32 pb-12 md:pb-16">
          <p
            className="text-[0.7rem] tracking-[0.32em] uppercase opacity-70 mb-4"
            style={{ fontWeight: 400 }}
          >
            On the site
          </p>
          <h1
            className="text-4xl md:text-6xl"
            style={{
              fontWeight: 200,
              letterSpacing: "0.005em",
              lineHeight: 1.1,
            }}
          >
            {page.title as string}
          </h1>
        </div>
      </section>

      {/* Body */}
      <section
        className="section-y gutter-x"
        style={{ background: "#F2EFEA" }}
      >
        <article
          className="prose-page max-w-3xl mx-auto"
          style={{
            color: "#142840",
            fontSize: "1rem",
            lineHeight: 1.8,
          }}
          // The HTML has been sanitized through DOMPurify in
          // lib/markdown.ts — safe for innerHTML insertion.
          dangerouslySetInnerHTML={{ __html: html || "<p><em>This page is being prepared.</em></p>" }}
        />
      </section>
    </main>
  );
}
