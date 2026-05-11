import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Mail, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant/context";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

/**
 * Tenant admin: list of custom pages on this tenant's site.
 *
 * Realtor reads + edits existing pages. Creating + deleting is
 * reserved for master — there's a clear "ask us" footer that
 * surfaces a mailto link.
 */
export default async function CustomPagesAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Explicit tenant scoping (A3-004).
  const tenantId = await getCurrentTenantId();
  let pagesQ = supabase
    .from("custom_pages")
    .select("id, slug, title, is_published, show_in_nav, display_order, updated_at")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (tenantId) pagesQ = pagesQ.eq("tenant_id", tenantId);
  const { data: pages } = await pagesQ;

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-4xl mx-auto py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs mb-6"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ArrowLeft size={14} /> Back to Site Editor
        </Link>

        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
          style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
        >
          Site Editor · Custom Pages
        </p>
        <h1
          className="text-2xl md:text-3xl mb-2"
          style={{
            color: "var(--foreground)",
            fontWeight: 600,
            letterSpacing: "0.005em",
          }}
        >
          Custom pages.
        </h1>
        <p
          className="text-sm mb-10 max-w-2xl"
          style={{ color: "var(--muted-foreground)" }}
        >
          Custom one-off pages on your site — like a Fix & Flip page or an
          Investor Welcome page. Edit content here; you can rename, edit,
          publish, hide from nav, or unpublish at any time.
        </p>

        {!pages || pages.length === 0 ? (
          <div className="admin-card p-10 text-center">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-full mb-4"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 14%, transparent)",
                color: "var(--primary)",
              }}
            >
              <FileText size={18} strokeWidth={1.5} />
            </span>
            <p
              className="text-sm mb-2"
              style={{ color: "var(--card-foreground)", fontWeight: 600 }}
            >
              No custom pages yet.
            </p>
            <p
              className="text-xs mb-5 max-w-md mx-auto"
              style={{ color: "var(--muted-foreground)" }}
            >
              Need a custom page (Fix & Flip, Investors, FAQ, etc.)? Email
              us with the topic and rough idea — we&apos;ll set it up and
              you can take it from there.
            </p>
            <a
              href="mailto:support@brandbonjour.com?subject=New%20custom%20page%20request"
              className="admin-btn"
            >
              <Mail size={13} className="mr-2" />
              Email support
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map((p) => (
              <Link
                key={p.id}
                href={`/admin/pages/${p.slug}`}
                className="admin-card p-4 flex items-center gap-4 group"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-md shrink-0"
                  style={{
                    background:
                      "color-mix(in srgb, var(--primary) 8%, var(--card))",
                    color: "var(--primary)",
                  }}
                >
                  <FileText size={16} strokeWidth={1.5} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p
                      className="text-base truncate"
                      style={{
                        color: "var(--card-foreground)",
                        fontWeight: 600,
                      }}
                    >
                      {p.title as string}
                    </p>
                    {!p.is_published && (
                      <span
                        className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded"
                        style={{
                          color: "var(--muted-foreground)",
                          background: "rgba(0,0,0,0.05)",
                        }}
                      >
                        Draft
                      </span>
                    )}
                    {p.show_in_nav && (
                      <span
                        className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded"
                        style={{
                          color: "var(--primary)",
                          background:
                            "color-mix(in srgb, var(--primary) 12%, transparent)",
                        }}
                      >
                        In nav
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs admin-mono truncate"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    /p/{p.slug as string}
                  </p>
                </div>
                <span
                  className="text-xs uppercase tracking-[0.18em]"
                  style={{ color: "var(--muted-foreground)", fontWeight: 600 }}
                >
                  Edit →
                </span>
              </Link>
            ))}

            <div
              className="admin-card p-4 flex items-center gap-3 mt-6"
              style={{ borderStyle: "dashed" }}
            >
              <Mail
                size={16}
                style={{ color: "var(--muted-foreground)" }}
              />
              <div className="flex-1">
                <p
                  className="text-sm"
                  style={{ color: "var(--card-foreground)", fontWeight: 500 }}
                >
                  Need another page?
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Adding new pages goes through us so we can pick a clean URL
                  + brief structure. Email{" "}
                  <a
                    href="mailto:support@brandbonjour.com?subject=New%20custom%20page%20request"
                    style={{ color: "var(--primary)" }}
                  >
                    support@brandbonjour.com
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
