"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAdminLayout } from "./AdminLayoutProvider";

export default function AdminLoginForm({ from }: { from?: string }) {
  const { realtorName } = useAdminLayout();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push(from || "/admin");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="admin-card w-full max-w-md p-10">
        <h1
          className="text-2xl mb-2 text-ink"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          {realtorName ? `${realtorName} · Admin` : "Admin"}
        </h1>
        <p className="text-sm text-ink/60 mb-10" style={{ fontWeight: 400 }}>
          Sign in to manage your website.
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

          <div>
            <label className="admin-label">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-input"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="admin-btn w-full"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>

          <p className="text-xs text-ink/55 text-center">
            <Link
              href="/admin/forgot-password"
              className="hover:text-navy underline underline-offset-2"
            >
              Forgot password?
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
