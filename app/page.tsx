import {
  getRequestContext,
  getCurrentTenant,
  getCurrentTenantSlug,
} from "@/lib/tenant/context";
import { headers } from "next/headers";

/**
 * Phase 1.6 hello-world. Proves the proxy → resolver → server-component
 * loop works end-to-end. Will be replaced by the marketing home in
 * Phase 2 once we port the design system.
 */
export default async function Home() {
  const [ctx, tenant, slug, h] = await Promise.all([
    getRequestContext(),
    getCurrentTenant(),
    getCurrentTenantSlug(),
    headers(),
  ]);

  const host = h.get("host");

  return (
    <main
      style={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        padding: "3rem",
        maxWidth: "60rem",
        margin: "0 auto",
        color: "#111",
        background: "#fafafa",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "1.6rem", fontWeight: 600, marginBottom: "0.4rem" }}>
        BB Website Project — tenant probe
      </h1>
      <p style={{ color: "#666", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Proxy resolves the tenant on every request. The header values
        below are stamped by <code>proxy.ts</code> and read here via{" "}
        <code>next/headers</code>.
      </p>

      <table
        style={{
          width: "100%",
          fontSize: "0.85rem",
          borderCollapse: "collapse",
        }}
      >
        <tbody>
          <Row k="Host" v={host ?? "—"} />
          <Row k="Context" v={ctx} highlight={ctx === "tenant" ? "ok" : ctx === "master" ? "info" : "warn"} />
          <Row k="Tenant slug" v={slug ?? "—"} />
          <Row k="Tenant id" v={tenant?.id ?? "—"} />
          <Row k="Realtor name" v={tenant?.realtor_name ?? "—"} />
          <Row k="Brokerage" v={tenant?.brokerage ?? "—"} />
          <Row k="Status" v={tenant?.status ?? "—"} />
          <Row k="State" v={tenant?.state_abbr ?? "—"} />
          <Row k="Custom domain" v={tenant?.custom_domain ?? "—"} />
          <Row
            k="Features"
            v={
              tenant?.features
                ? JSON.stringify(tenant.features)
                : "—"
            }
          />
        </tbody>
      </table>

      <h2 style={{ fontSize: "1rem", fontWeight: 600, marginTop: "2rem" }}>
        How to test
      </h2>
      <ul style={{ fontSize: "0.85rem", lineHeight: 1.7, color: "#444" }}>
        <li>
          <code>localhost:3000</code> → <code>unknown</code> (no tenants seeded yet)
        </li>
        <li>
          <code>localhost:3000/?tenant=samina</code> → resolves once we
          insert a tenant with <code>slug=&apos;samina&apos;</code>
        </li>
        <li>
          <code>master.localhost:3000</code> → <code>master</code>
        </li>
      </ul>
    </main>
  );
}

function Row({
  k,
  v,
  highlight,
}: {
  k: string;
  v: string;
  highlight?: "ok" | "info" | "warn";
}) {
  const color =
    highlight === "ok"
      ? "#0a7"
      : highlight === "info"
        ? "#06c"
        : highlight === "warn"
          ? "#a60"
          : "#111";
  return (
    <tr style={{ borderTop: "1px solid #eee" }}>
      <th
        style={{
          textAlign: "left",
          padding: "0.55rem 0.5rem",
          width: "12rem",
          color: "#888",
          fontWeight: 500,
        }}
      >
        {k}
      </th>
      <td style={{ padding: "0.55rem 0.5rem", color, fontWeight: 600 }}>
        {v}
      </td>
    </tr>
  );
}
