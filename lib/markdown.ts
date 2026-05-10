import "server-only";

/**
 * Server-side Markdown → safe HTML for custom pages.
 *
 * The realtor types markdown in /admin/pages; we render it on the
 * public /p/<slug> route. Everything goes through DOMPurify so any
 * `<script>` or other risky tags get stripped — realtors can't
 * accidentally (or maliciously) inject XSS into their own site.
 */

import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

marked.setOptions({
  gfm: true,         // GitHub-flavoured: tables, fenced code, autolinks
  breaks: true,      // single newlines render as <br>
});

/**
 * Render a markdown string to sanitized HTML safe for innerHTML
 * insertion. Returns an empty string on null/empty input.
 */
export function renderMarkdown(md: string | null | undefined): string {
  if (!md || !md.trim()) return "";
  const rawHtml = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    // Generous tag allowlist for content pages — headings, lists,
    // links, blockquotes, images, code, tables.
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "strong", "em", "b", "i", "u", "s", "del", "ins",
      "a", "img",
      "ul", "ol", "li",
      "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "div", "span",
    ],
    ALLOWED_ATTR: ["href", "title", "alt", "src", "rel", "target", "class"],
    // Force external links to open safely.
    ADD_ATTR: ["target", "rel"],
  });
}
