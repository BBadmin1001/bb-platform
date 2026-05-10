"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * One-time admin signup form. The parent page guards this so it's only
 * reachable while zero team_members exist — once the first owner signs up,
 * additional users are invited from the Team settings inside /admin.
 */
export default function AdminSignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
      setTimeout(() => router.push("/admin"), 4000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Signup failed. Please try again.";
      setError(message);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="admin-card w-full max-w-md p-10 text-center">
          <h1 className="text-xl mb-3" style={{ fontWeight: 600 }}>
            Account created.
          </h1>
          <p className="text-sm text-ink/70 mb-6">
            Check your email for a confirmation link (if email confirmation is
            enabled), then come back and sign in.
          </p>
          <Link href="/admin" className="admin-btn">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="admin-card w-full max-w-md p-10">
        <h1
          className="text-2xl mb-2 text-ink"
          style={{ fontWeight: 600, letterSpacing: "0.01em" }}
        >
          First-Time Setup
        </h1>
        <p className="text-sm text-ink/60 mb-10" style={{ fontWeight: 400 }}>
          Create your admin account.
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
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-input"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="admin-label">Confirm Password</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="admin-input"
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
            {loading ? "Creating…" : "Create Account"}
          </button>
        </form>

        <p className="text-xs text-ink/50 mt-8 text-center">
          Already have an account?{" "}
          <Link
            href="/admin"
            className="text-navy underline underline-offset-2 hover:no-underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
