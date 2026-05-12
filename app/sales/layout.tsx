import type { ReactNode } from "react";
import "../globals.css";
import "../admin/admin.css";
import "../master/master.css";

/**
 * /sales — sales rep dashboard. Reuses the admin design tokens so a
 * rep gets the same look as the platform team. Auth gate runs inside
 * the page route (requireSalesRep), so this layout is just chrome.
 */
export const metadata = {
  title: "Sales · BB Platform",
};

export default async function SalesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="admin-root master-root">{children}</div>;
}
