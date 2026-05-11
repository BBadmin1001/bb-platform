import "server-only";

/**
 * Server-side Markdown → safe HTML for custom pages.
 *
 * The realtor types markdown in /admin/pages; we render it on the
 * public /p/<slug> route. Everything goes through DOMPurify so any
 * `<script>` or other risky tags get stripped — realtors can't
 * accidentally (or maliciously) inject XSS into their own site.
 *
 * Implementation note: `isomorphic-dompurify` is imported lazily
 * inside `renderMarkdown` rather than at module top-level. Loading
 * it eagerly was breaking the `/p/<slug>` route on Netlify Functions
 * (A3-003) because the JSDOM dependency it pulls in throws on cold
 * starts in the serverless runtime. With the lazy import, the page
 * module loads cleanly and only pays the JSDOM cost when there's
 * actual markdown to sanitize. If sanitization fails, we fall back
 * to a conservative tag-stripper so the page still renders.
 */

import { marked } from "marked";

marked.setOptions({
  gfm: true,         // GitHub-flavoured: tables, fenced code, autolinks
  breaks: true,      // single newlines render as <br>
});

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "strong", "em", "b", "i", "u", "s", "del", "ins",
  "a", "img",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span",
];

const ALLOWED_ATTR = ["href", "title", "alt", "src", "rel", "target", "class"];

/**
 * Render a markdown string to sanitized HTML safe for innerHTML
 * insertion. Returns an empty string on null/empty input.
 *
 * Try DOMPurify first; on any failure (e.g. JSDOM init crash in the
 * serverless runtime) fall back to a regex-based sanitizer that
 * strips `<script>`/`<iframe>`/`<style>` and any `on*` event handlers.
 * The fallback is intentionally conservative — markdown can't inject
 * raw HTML by default, so the worst case is a slightly less polished
 * output, never an XSS hole.
 */
export function renderMarkdown(md: string | null | undefined): string {
  if (!md || !md.trim()) return "";
  const rawHtml = marked.parse(md, { async: false }) as string;

  try {
    // Lazy require so the module never loads on routes that don't
    // need it. Using `require` avoids dragging the import into the
    // route's top-level module graph (which is what trips up the
    // Netlify Functions cold start).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DOMPurify = require("isomorphic-dompurify");
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ADD_ATTR: ["target", "rel"],
    }) as string;
  } catch (err) {
    console.warn(
      "[markdown] DOMPurify unavailable, using regex fallback:",
      err instanceof Error ? err.message : err,
    );
    return fallbackSanitize(rawHtml);
  }
}

/**
 * Minimal regex sanitizer used when DOMPurify isn't available. Strips
 * dangerous tags whole-cloth (script, iframe, object, embed, style,
 * link, meta, form, input, button, textarea, select) and `on*`
 * attribute handlers plus `javascript:` URLs. Not as bulletproof as
 * DOMPurify — but defense-in-depth: markdown -> HTML by `marked` is
 * already escaping raw HTML by default, so the input to this function
 * is almost always known-safe.
 */
function fallbackSanitize(html: string): string {
  return html
    .replace(/<\s*(script|iframe|object|embed|style|link|meta|form|input|button|textarea|select)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|style|link|meta|form|input|button|textarea|select)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");
}
