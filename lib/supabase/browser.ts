"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Singleton Supabase client for client components.
 *
 * Uses the publishable (anon) key. Auth state is read from the
 * cookies the proxy.ts middleware keeps in sync, so signing in via a
 * server action is automatically reflected here.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
