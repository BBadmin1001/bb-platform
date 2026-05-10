import AdminResetPasswordForm from "@/components/admin/AdminResetPasswordForm";

export const metadata = { title: "Set New Password | Admin" };

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return <AdminResetPasswordForm />;
}
