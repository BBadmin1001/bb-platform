"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/admin/reset-password`
          : "/admin/reset-password";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send reset email.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="admin-card w-full max-w-md p-10 text-center">
          <div className="inline-flex w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-5">
            <Check size={22} className="text-emerald-700" strokeWidth={1.5} />
          </div>
          <h1
            className="text-xl mb-3 text-ink"
            style={{ fontWeight: 400 }}
          >
            Check your inbox
          </h1>
          <p className="text-sm text-ink/70 leading-relaxed mb-8">
            If an admin account exists for <strong>{email}</strong>, you&rsquo;ll
            get a password reset link in the next minute or two. Click the link
            in the email to set a new password.
          </p>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-ink/60 hover:text-ink"
          >
            <ArrowLeft size={13} /> Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="admin-card w-full max-w-md p-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-ink/55 hover:text-ink mb-6"
        >
          <ArrowLeft size={13} /> Sign in
        </Link>
        <h1
          className="text-2xl mb-2 text-ink"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          Reset password
        </h1>
        <p className="text-sm text-ink/60 mb-8" style={{ fontWeight: 400 }}>
          Enter the email tied to your admin account. We&rsquo;ll send you a link
          to set a new password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="admin-label">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="admin-input"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="admin-btn w-full"
          >
            <Mail size={14} className="mr-2" />
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      </div>
    </div>
  );
}
