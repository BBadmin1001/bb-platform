import { redirect } from "next/navigation";

/**
 * /admin/login is now a redirect to /admin — the login form lives directly
 * at /admin (renders if unauthenticated, dashboard if signed in). This page
 * is kept only so old bookmarks and the `?from=` middleware redirects don't
 * 404. The `from` query param is preserved if present.
 */
export default async function AdminLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  if (from && from.startsWith("/admin")) {
    redirect(`/admin?from=${encodeURIComponent(from)}`);
  }
  redirect("/admin");
}
