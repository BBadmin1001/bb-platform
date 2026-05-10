import {
  getRequestContext,
  getCurrentTenant,
} from "@/lib/tenant/context";

/**
 * Phase 1.5 placeholder home — exercises the design system end to
 * end: Montserrat font, per-tenant brand colours, frosted-glass
 * card, .btn-solid / .btn-outline-dark, .eyebrow tracking.
 *
 * Replaced in Phase 2 with the full ported Hero + sections.
 */
export default async function Home() {
  const [ctx, tenant] = await Promise.all([
    getRequestContext(),
    getCurrentTenant(),
  ]);

  if (ctx === "master") return <MasterStub />;
  if (ctx === "unknown" || !tenant) return <UnknownStub />;

  // tenant context — render the branded hero
  const tagline =
    (tenant.features as { tagline?: string })?.tagline ??
    [tenant.brokerage, tenant.state_abbr ? `${tenant.state_abbr}` : null]
      .filter(Boolean)
      .join(" · ");

  return (
    <main className="flex-1">
      {/* HERO ─────────────────────────────────────────────── */}
      <section
        className="relative section-y-lg gutter-x bg-navy text-white overflow-hidden"
        style={{
          background: "rgb(var(--brand-primary-rgb))",
        }}
      >
        <div className="max-w-5xl mx-auto text-center relative">
          <p className="eyebrow-light mb-6">{tagline || "Realtor"}</p>
          <h1
            className="heading-display text-4xl sm:text-5xl md:text-6xl mb-8"
            style={{ color: "white" }}
          >
            {tenant.realtor_name}
          </h1>
          <p
            className="max-w-2xl mx-auto text-base md:text-lg leading-relaxed mb-12"
            style={{ color: "rgba(255,255,255,0.78)" }}
          >
            Buying or selling a home is a story you tell once. Let&apos;s make
            it the right one — with an agent who knows the streets, the
            schools, and the rhythms of every neighborhood.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#contact" className="btn-glass">
              Schedule a call
            </a>
            <a href="#valuation" className="btn-outline-light">
              Get a home valuation
            </a>
          </div>
        </div>
      </section>

      {/* GLASS CARD STRIP ─────────────────────────────────── */}
      <section className="section-y gutter-x">
        <div className="max-w-5xl mx-auto">
          <p className="eyebrow text-center mb-4">Phase 1 demo</p>
          <h2 className="heading-section text-2xl md:text-3xl text-center mb-12 text-ink">
            Design system live
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card
              eyebrow="Multi-tenancy"
              title="Hostname routing"
              body="Every request resolves a tenant via subdomain, custom domain, or ?tenant=. Headers stamped by proxy.ts."
            />
            <Card
              eyebrow="Brand theme"
              title="Per-tenant colour"
              body="The navy you see is loaded from tenant.features.brand. Other tenants get their own palette without a redeploy."
            />
            <Card
              eyebrow="Database"
              title="RLS by default"
              body="tenants, plans, tenant_subscriptions, tenant_users — every row scoped through has_tenant_access()."
            />
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-4">
            <a href="#" className="btn-solid">
              Primary action
            </a>
            <a href="#" className="btn-outline-dark">
              Secondary
            </a>
          </div>
        </div>
      </section>

      {/* DEBUG STRIP ──────────────────────────────────────── */}
      <section className="section-y gutter-x bg-cream-soft">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow mb-4">Active tenant</p>
          <dl
            className="grid grid-cols-[max-content_1fr] gap-x-8 gap-y-2 text-sm font-mono"
            style={{ color: "rgba(0,0,0,0.7)" }}
          >
            <DRow k="slug"          v={tenant.slug} />
            <DRow k="id"            v={tenant.id} />
            <DRow k="status"        v={tenant.status} />
            <DRow k="state"         v={tenant.state_abbr ?? "—"} />
            <DRow k="custom_domain" v={tenant.custom_domain ?? "—"} />
          </dl>
        </div>
      </section>
    </main>
  );
}

function Card({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="glass-light rounded-2xl p-7">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h3
        className="text-lg mb-3"
        style={{ color: "rgb(var(--brand-primary-rgb))", fontWeight: 500 }}
      >
        {title}
      </h3>
      <p className="text-sm" style={{ color: "rgba(0,0,0,0.66)" }}>
        {body}
      </p>
    </div>
  );
}

function DRow({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt style={{ color: "rgba(0,0,0,0.4)" }}>{k}</dt>
      <dd>{v}</dd>
    </>
  );
}

function MasterStub() {
  return (
    <main className="flex-1 flex items-center justify-center bg-navy text-white section-y gutter-x">
      <div className="max-w-md text-center">
        <p className="eyebrow-light mb-3">Platform</p>
        <h1 className="heading-display text-3xl md:text-4xl mb-4">
          Master dashboard
        </h1>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
          Coming in Phase 3. Sign-in + super-admin gate go here.
        </p>
      </div>
    </main>
  );
}

function UnknownStub() {
  return (
    <main className="flex-1 flex items-center justify-center section-y gutter-x">
      <div className="max-w-md text-center">
        <p className="eyebrow mb-3">404</p>
        <h1 className="text-2xl text-ink mb-4" style={{ fontWeight: 500 }}>
          No site here yet.
        </h1>
        <p className="text-sm" style={{ color: "rgba(0,0,0,0.55)" }}>
          This hostname doesn&apos;t match any active tenant. If you expect a
          site at this address, contact the platform owner.
        </p>
      </div>
    </main>
  );
}
