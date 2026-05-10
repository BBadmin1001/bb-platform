"use client";

/**
 * Form on /admin/pages/[slug] — realtor edits the title + markdown
 * body + SEO meta + visibility toggles for a custom page.
 *
 * Slug is intentionally NOT editable here. Once a slug is in the
 * wild (printed on a card, shared in an email), changing it would
 * 404 every existing link. If a realtor really needs a new URL,
 * they email us and we set up a new page + redirect the old one.
 */

import { useState, useTransition } from "react";
import {
  Save,
  Eye,
  EyeOff,
  Compass,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { updateCustomPage } from "@/app/admin/pages/actions";

export default function CustomPageEditor({
  pageId,
  initial,
}: {
  pageId: string;
  initial: {
    title: string;
    body_md: string;
    meta_description: string;
    is_published: boolean;
    show_in_nav: boolean;
  };
}) {
  const [title, setTitle] = useState(initial.title);
  const [bodyMd, setBodyMd] = useState(initial.body_md);
  const [metaDesc, setMetaDesc] = useState(initial.meta_description);
  const [isPublished, setIsPublished] = useState(initial.is_published);
  const [showInNav, setShowInNav] = useState(initial.show_in_nav);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateCustomPage(pageId, {
        title,
        body_md: bodyMd,
        meta_description: metaDesc,
        is_published: isPublished,
        show_in_nav: showInNav,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="admin-label">Page title</label>
        <input
          type="text"
          className="admin-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p
          className="mt-1 text-[11px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          Shown as the page heading and in the browser tab.
        </p>
      </div>

      <div>
        <label className="admin-label">Body (markdown)</label>
        <textarea
          className="admin-input admin-mono"
          rows={18}
          value={bodyMd}
          onChange={(e) => setBodyMd(e.target.value)}
          placeholder={`Write your page content here.

You can use markdown syntax:

# Heading
## Subheading

A paragraph with **bold**, *italic*, and a [link](https://example.com).

- A list item
- Another list item

> A blockquote for testimonials.`}
        />
        <p
          className="mt-1 text-[11px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          Supports markdown. <strong>**bold**</strong>,{" "}
          <em>*italic*</em>, # heading, lists with - dash, links with
          [text](url), images with ![alt](url). Single line breaks
          render as line breaks.
        </p>
      </div>

      <div>
        <label className="admin-label">SEO description (optional)</label>
        <textarea
          className="admin-input"
          rows={2}
          value={metaDesc}
          onChange={(e) => setMetaDesc(e.target.value)}
          placeholder="One sentence summary that shows up in Google results. ~150 characters."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label
          className="admin-card p-3 flex items-start gap-3 cursor-pointer"
          style={{
            borderColor: isPublished
              ? "color-mix(in srgb, var(--primary) 35%, var(--border))"
              : "var(--border)",
          }}
        >
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="mt-0.5"
          />
          <div>
            <p
              className="text-sm"
              style={{ fontWeight: 600, color: "var(--card-foreground)" }}
            >
              {isPublished ? (
                <span className="inline-flex items-center gap-1.5">
                  <Eye size={13} /> Published
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <EyeOff size={13} /> Draft
                </span>
              )}
            </p>
            <p
              className="text-[11px] mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              {isPublished
                ? "Visible to anyone with the URL."
                : "Hidden from the public — only you (and us) can preview."}
            </p>
          </div>
        </label>
        <label
          className="admin-card p-3 flex items-start gap-3 cursor-pointer"
          style={{
            borderColor: showInNav
              ? "color-mix(in srgb, var(--primary) 35%, var(--border))"
              : "var(--border)",
          }}
        >
          <input
            type="checkbox"
            checked={showInNav}
            onChange={(e) => setShowInNav(e.target.checked)}
            className="mt-0.5"
          />
          <div>
            <p
              className="text-sm"
              style={{ fontWeight: 600, color: "var(--card-foreground)" }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Compass size={13} />
                {showInNav ? "Surfaced in nav" : "Hidden from nav"}
              </span>
            </p>
            <p
              className="text-[11px] mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              {showInNav
                ? "Adds a top-level link to your menu."
                : "Page exists but isn't linked from the menu."}
            </p>
          </div>
        </label>
      </div>

      {error && (
        <div
          className="p-3 rounded-md text-sm flex items-start gap-2"
          style={{
            background: "color-mix(in srgb, var(--destructive) 6%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--destructive) 18%, transparent)",
            color: "var(--destructive)",
          }}
        >
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="admin-btn inline-flex items-center"
          style={pending ? { opacity: 0.6 } : undefined}
        >
          {pending ? (
            <>
              <Loader2 size={13} className="mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save size={13} className="mr-2" />
              Save changes
            </>
          )}
        </button>
        {savedAt && !pending && (
          <span
            className="inline-flex items-center gap-1 text-xs"
            style={{ color: "var(--primary)" }}
          >
            <Check size={12} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
