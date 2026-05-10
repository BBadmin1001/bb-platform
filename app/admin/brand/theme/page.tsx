import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import ThemeEditor from "@/components/admin/brand/ThemeEditor";
import { getBrandTheme } from "@/lib/brandTheme.server";

export default async function BrandThemePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const initial = await getBrandTheme();

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
        <Link
          href="/admin/brand"
          className="inline-flex items-center gap-1.5 text-xs text-ink/55 hover:text-ink mb-6"
        >
          <ArrowLeft size={14} /> Back to Brand Identity
        </Link>

        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3"
          style={{ fontWeight: 500 }}
        >
          Brand Identity · Theme
        </p>
        <h1
          className="text-2xl md:text-3xl text-ink mb-2"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          Site colors.
        </h1>
        <p className="text-sm text-ink/65 max-w-2xl mb-10">
          Re-skin the entire site by picking new primary and surface colors. Every
          place currently rendered in navy or cream — header, footer, menu,
          buttons, badges — updates the moment you save. Optional gradients let
          you replace flat colors with multi-stop backgrounds for header/footer.
        </p>

        <ThemeEditor initial={initial} />
      </div>
    </AdminShell>
  );
}
