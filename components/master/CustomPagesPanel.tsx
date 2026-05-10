"use client";

/**
 * CustomPagesPanel — sits on /master/tenants/[slug] so the platform
 * team can stand up a custom page for a tenant on request.
 *
 * Master controls the slug (URL) — if a realtor wants /p/fix-and-flip
 * vs /p/flips, master picks the right one based on SEO + brand
 * judgement. After creation the realtor takes over body editing
 * from /admin/pages.
 *
 * Master can also delete a page entirely (in case the realtor changes
 * their mind or we set it up wrong). Realtors only get unpublish.
 */

import { useState, useTransition } from "react";
import {
  FileText,
  Plus,
  ExternalLink,
  Trash2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  createCustomPage,
  deleteCustomPage,
} from "@/app/master/tenants/actions";

type Page = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  show_in_nav: boolean;
};

export default function CustomPagesPanel({
  tenantSlug,
  tenantHost,
  initialPages,
}: {
  tenantSlug: string;
  /** Used to render preview links — typically the tenant's
   *  custom_domain when set, else `?tenant=<slug>` on master URL. */
  tenantHost: string;
  initialPages: Page[];
}) {
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ slug: "", title: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startAdd() {
    setAdding(true);
    setError(null);
    setDraft({ slug: "", title: "" });
  }

  function cancelAdd() {
    setAdding(false);
    setError(null);
  }

  function create() {
    setError(null);
    startTransition(async () => {
      const res = await createCustomPage(tenantSlug, {
        slug: draft.slug.trim().toLowerCase(),
        title: draft.title.trim(),
        body_md: "",
        is_published: true,
        show_in_nav: false,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Optimistic local update — master will see it immediately;
      // a server revalidate is already firing in the action.
      setPages([
        ...pages,
        {
          id: res.pageId!,
          slug: draft.slug.trim().toLowerCase(),
          title: draft.title.trim(),
          is_published: true,
          show_in_nav: false,
        },
      ]);
      setAdding(false);
      setDraft({ slug: "", title: "" });
    });
  }

  function remove(p: Page) {
    if (
      !confirm(
        `Delete /p/${p.slug}? This is permanent — any external link to this URL will 404.`,
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const res = await deleteCustomPage(tenantSlug, p.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPages(pages.filter((x) => x.id !== p.id));
    });
  }

  return (
    <section className="admin-card p-6 mb-10">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{
              background: "color-mix(in srgb, var(--primary) 14%, transparent)",
              color: "var(--primary)",
            }}
          >
            <FileText size={14} strokeWidth={1.6} />
          </span>
          <p
            className="text-xs uppercase tracking-[0.18em]"
            style={{ color: "var(--muted-foreground)", fontWeight: 700 }}
          >
            Custom pages
          </p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={startAdd}
            className="admin-btn admin-btn-secondary inline-flex items-center"
          >
            <Plus size={13} className="mr-1.5" />
            Add page
          </button>
        )}
      </div>

      <p
        className="text-xs mb-4"
        style={{ color: "var(--muted-foreground)" }}
      >
        Pages like <code>/p/fix-and-flip</code> or <code>/p/investors</code> —
        whatever this tenant has asked for. You set the slug + title; the
        realtor writes the body from their /admin/pages.
      </p>

      {adding && (
        <div
          className="p-4 rounded-md mb-4"
          style={{
            background: "color-mix(in srgb, var(--primary) 5%, var(--card))",
            border:
              "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="admin-label">URL slug</label>
              <input
                type="text"
                className="admin-input admin-mono"
                value={draft.slug}
                onChange={(e) =>
                  setDraft({ ...draft, slug: e.target.value.toLowerCase() })
                }
                placeholder="fix-and-flip"
              />
              <p
                className="mt-1 text-[10px]"
                style={{ color: "var(--muted-foreground)" }}
              >
                Lives at /p/&lt;slug&gt;. Lowercase + dashes only.
              </p>
            </div>
            <div>
              <label className="admin-label">Page title</label>
              <input
                type="text"
                className="admin-input"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Fix & Flip"
              />
            </div>
          </div>
          {error && (
            <p
              className="mt-2 text-xs flex items-center gap-1"
              style={{ color: "var(--destructive)" }}
            >
              <AlertCircle size={12} /> {error}
            </p>
          )}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={create}
              disabled={pending}
              className="admin-btn"
              style={pending ? { opacity: 0.6 } : undefined}
            >
              {pending ? (
                <>
                  <Loader2 size={13} className="mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create page"
              )}
            </button>
            <button
              type="button"
              onClick={cancelAdd}
              className="admin-btn admin-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {pages.length === 0 ? (
        <p
          className="text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          No custom pages yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {pages.map((p) => {
            const previewUrl = `https://${tenantHost}/p/${p.slug}`;
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-md"
                style={{
                  background:
                    "color-mix(in srgb, var(--foreground) 4%, var(--card))",
                  border: "1px solid var(--border)",
                }}
              >
                <FileText
                  size={14}
                  className="shrink-0"
                  style={{ color: "var(--muted-foreground)" }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm truncate"
                    style={{
                      color: "var(--card-foreground)",
                      fontWeight: 600,
                    }}
                  >
                    {p.title}
                  </p>
                  <p
                    className="text-[11px] admin-mono truncate"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    /p/{p.slug}
                    {!p.is_published && " · draft"}
                    {p.show_in_nav && " · in nav"}
                  </p>
                </div>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px]"
                  style={{ color: "var(--muted-foreground)" }}
                  title="Preview"
                >
                  <ExternalLink size={13} />
                </a>
                <button
                  type="button"
                  onClick={() => remove(p)}
                  className="text-[11px]"
                  style={{ color: "var(--destructive)" }}
                  aria-label="Delete"
                  title="Delete (permanent)"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
