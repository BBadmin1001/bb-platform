import type { ReactNode } from "react";
import { Source_Code_Pro } from "next/font/google";
import "../globals.css";
import "./admin.css";

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-code-pro",
  display: "swap",
});

export const metadata = {
  title: "Sign in · BB Platform",
};

/**
 * /admin layout — after the May-2026 lead-CRM pivot this route only
 * hosts the sign-in / sign-up / reset-password forms. There is no
 * longer a tenant admin. Master operators land at /master, sales
 * reps at /sales after a successful sign in (handled by the post-
 * login redirect in the login form).
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`admin-root ${sourceCodePro.variable}`}>{children}</div>
  );
}
