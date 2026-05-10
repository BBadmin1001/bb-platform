import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import { GlowCard } from "@/components/ui/spotlight-card";

/**
 * Preview-only route — drops three GlowCards on a dark canvas so the
 * cursor-tracking spotlight is unmistakably visible. Use this to confirm
 * the effect works before deciding where to deploy it for real.
 *
 * Not linked from the sidebar; navigate to /admin/preview/spotlight by
 * URL. Safe to delete when done.
 */
export default async function SpotlightPreviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <AdminShell user={{ email: user.email ?? "" }}>
      <div className="max-w-5xl mx-auto py-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs mb-6"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ArrowLeft size={14} /> Back to Site Editor
        </Link>

        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase mb-3"
          style={{ color: "var(--muted-foreground)", fontWeight: 500 }}
        >
          Component preview · Spotlight Card
        </p>
        <h1
          className="text-2xl md:text-3xl mb-2"
          style={{
            color: "var(--foreground)",
            fontWeight: 600,
            letterSpacing: "0.01em",
          }}
        >
          Hover anywhere on the canvas.
        </h1>
        <p
          className="text-sm max-w-2xl mb-10"
          style={{ color: "var(--muted-foreground)" }}
        >
          The glow tracks your cursor across the viewport — not just on hover.
          Each card&apos;s border lights up brightest when your pointer is over
          it. Borders dim as you move away. If you see no animation,
          something is wrong (most commonly: a parent has{" "}
          <code className="admin-mono">backdrop-filter</code> /{" "}
          <code className="admin-mono">filter</code> /{" "}
          <code className="admin-mono">transform</code> applied, which breaks
          the fixed-attachment background the spotlight relies on).
        </p>

        {/* Dark canvas — the glow is always more visible against dark. */}
        <div
          className="rounded-2xl p-10 flex flex-wrap items-center justify-center gap-8"
          style={{ background: "#0a1f0c", minHeight: "32rem" }}
        >
          <GlowCard glowColor="green" size="md">
            <div />
            <div className="text-white">
              <p className="text-[10px] tracking-[0.28em] uppercase opacity-70 mb-2">
                Forest
              </p>
              <h3 className="text-lg" style={{ fontWeight: 500 }}>
                Hover me
              </h3>
            </div>
          </GlowCard>

          <GlowCard glowColor="orange" size="md">
            <div />
            <div className="text-white">
              <p className="text-[10px] tracking-[0.28em] uppercase opacity-70 mb-2">
                Amber
              </p>
              <h3 className="text-lg" style={{ fontWeight: 500 }}>
                Or me
              </h3>
            </div>
          </GlowCard>

          <GlowCard glowColor="purple" size="md">
            <div />
            <div className="text-white">
              <p className="text-[10px] tracking-[0.28em] uppercase opacity-70 mb-2">
                Plum
              </p>
              <h3 className="text-lg" style={{ fontWeight: 500 }}>
                Or me
              </h3>
            </div>
          </GlowCard>
        </div>
      </div>
    </AdminShell>
  );
}
