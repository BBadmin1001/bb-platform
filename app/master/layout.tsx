import type { ReactNode } from "react";
import { Source_Code_Pro } from "next/font/google";
import "../globals.css";
import "../admin/admin.css";
import "./master.css";
import { requireSuperAdmin } from "@/lib/master";
import MasterShell from "@/components/master/MasterShell";

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-code-pro",
  display: "swap",
});

export const metadata = {
  title: "Master · BB Website Project",
};

/**
 * /master layout — gated by super_admin. Reuses the admin design
 * system but with a distinct accent (deep plum) so there's no visual
 * confusion between the master dashboard and any individual tenant's
 * admin.
 */
export default async function MasterLayout({ children }: { children: ReactNode }) {
  const { user } = await requireSuperAdmin();

  return (
    <div className={`admin-root master-root ${sourceCodePro.variable}`}>
      <MasterShell user={{ email: user.email ?? "" }}>{children}</MasterShell>
    </div>
  );
}
