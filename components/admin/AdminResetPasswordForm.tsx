"use client";

/**
 * Set-new-password screen.
 *
 * The user lands here from an email link sent by Supabase. The link includes
 * either:
 *   - a `?code=...` query (PKCE flow — exchange for session), or
 *   - an `#access_token=...` hash (implicit flow — Supabase JS auto-detects)
 *
 * Once a session exists, calling `supabase.auth.updateUser({ password })`
 * sets the new password.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminResetPasswordForm() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="admin-card w-full max-w-md p-10">
        <Form />
      </div>
    </div>
  );
}

function Form() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [exchanging, setExchanging] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: exchange the recovery code for a session if needed
  useEffect(() => {
    let cancelled = false;
    async function go() {
      const supabase = createClient();
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        // Check we have a session now
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setSessionReady(true);
        } else {
          setExchangeError(
            "This link has expired or already been used. Request a new password reset email.",
          );
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Couldn't validate the reset link.";
        setExchangeError(msg);
      } finally {
        if (!cancelled) setExchanging(false);
      }
    }
    go();
    return () => {
      cancelled = true;
    };
  }, [code]);

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
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
      setDone(true);
      // Bounce to /admin after a beat — they're already signed in via the
      // recovery session
      setTimeout(() => {
        router.push("/admin");
        router.refresh();
      }, 1500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not update password.";
      setError(msg);
      setSaving(false);
    }
  }

  if (exchanging) {
    return (
      <div className="text-center text-sm text-ink/65 py-8">
        Validating reset link…
      </div>
    );
  }

  if (exchangeError) {
    return (
      <div className="text-center">
        <h1
          className="text-xl mb-3 text-ink"
          style={{ fontWeight: 400 }}
        >
          Link expired
        </h1>
        <p className="text-sm text-ink/70 leading-relaxed mb-6">
          {exchangeError}
        </p>
        <Link href="/admin/forgot-password" className="admin-btn inline-flex">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-5">
          <Check size={22} className="text-emerald-700" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl mb-3 text-ink" style={{ fontWeight: 400 }}>
          Password updated
        </h1>
        <p className="text-sm text-ink/70 leading-relaxed">
          Signing you in…
        </p>
      </div>
    );
  }

  return (
    <>
      <h1
        className="text-2xl mb-2 text-ink"
        style={{ fontWeight: 600, letterSpacing: "0.01em" }}
      >
        Set new password
      </h1>
      <p className="text-sm text-ink/60 mb-8" style={{ fontWeight: 400 }}>
        Pick a password 8 characters or longer. You&rsquo;ll be signed in
        immediately after saving.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="admin-label">New password</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="admin-input"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="admin-label">Confirm password</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          disabled={saving || !sessionReady || !password || !confirm}
          className="admin-btn w-full"
        >
          <KeyRound size={14} className="mr-2" />
          {saving ? "Saving…" : "Save new password"}
        </button>
      </form>
    </>
  );
}
