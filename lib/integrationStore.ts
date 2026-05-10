/**
 * Integration credential store — read/write helpers around the
 * `public.integrations` table.
 *
 * Each integration is identified by a single string `key` (e.g.
 * "google_places") and stores its config in a jsonb blob — that way
 * different integrations can have totally different shapes without
 * needing per-service columns.
 *
 * RLS:
 *   • Authenticated admins can read/write (used by the wizard UI)
 *   • Service-role client bypasses RLS (used by the cron sync)
 *   • Anon access is blocked entirely
 *
 * Note on encryption: for v1 we store the raw API key in jsonb. The RLS
 * policy keeps it from leaking to anon. If/when we go multi-tenant we'll
 * upgrade to Supabase Vault (or pgcrypto) and encrypt at rest.
 */

import { getServiceClient } from "./contentLoader";
import { getCurrentTenantId } from "./tenant/context";

// ─────────────────────────── Types ──────────────────────────────

export type IntegrationKey = "google_places" | "google_analytics";

export interface GooglePlacesConfig {
  apiKey: string;
  placeId: string;
  /** Whether ALL incoming Google reviews require admin approval before
   *  going public, or whether they auto-publish. Default: true (require
   *  approval). */
  requireApproval?: boolean;
}

export interface GoogleAnalyticsConfig {
  /** GA4 Measurement ID — looks like "G-XXXXXXXXXX". */
  measurementId: string;
}

export interface IntegrationRow<TConfig = unknown> {
  key: IntegrationKey;
  config: TConfig;
  enabled: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: "success" | "error" | null;
  lastSyncError: string | null;
  updatedAt: string;
}

// ─────────────────────────── Reads ──────────────────────────────

/**
 * Load an integration by key. Returns null if not yet configured.
 * Uses the SERVICE-ROLE client (bypasses RLS) so server actions, server
 * components, and cron jobs can all reach it.
 */
export async function getIntegration<TConfig = unknown>(
  key: IntegrationKey,
): Promise<IntegrationRow<TConfig> | null> {
  try {
    const supabase = getServiceClient();
    if (!supabase) return null;
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return null;
    const { data, error } = await supabase
      .from("integrations")
      .select(
        "key, config, enabled, last_synced_at, last_sync_status, last_sync_error, updated_at",
      )
      .eq("tenant_id", tenantId)
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;
    return {
      key: data.key as IntegrationKey,
      config: data.config as TConfig,
      enabled: data.enabled,
      lastSyncedAt: data.last_synced_at,
      lastSyncStatus: data.last_sync_status,
      lastSyncError: data.last_sync_error,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

export async function getGoogleIntegration() {
  return getIntegration<GooglePlacesConfig>("google_places");
}

/**
 * Returns true ONLY if Google Places is configured AND enabled. Used by
 * the public site to decide whether to show "Powered by Google reviews"
 * style chrome and by the admin to decide whether to show the wizard
 * vs the connected-state card.
 */
export async function isGoogleConnected(): Promise<boolean> {
  const row = await getGoogleIntegration();
  return Boolean(
    row?.enabled && row.config?.apiKey && row.config?.placeId,
  );
}

// ─────────────────────────── Google Analytics ──────────────────

export async function getAnalyticsIntegration() {
  return getIntegration<GoogleAnalyticsConfig>("google_analytics");
}

/**
 * Returns the Measurement ID if Analytics is configured + enabled, else null.
 * Consumed by `app/layout.tsx` to inject the GA tag conditionally — when null,
 * no GA script is rendered (and visitors aren't tracked).
 */
export async function getAnalyticsMeasurementId(): Promise<string | null> {
  const row = await getAnalyticsIntegration();
  if (!row?.enabled) return null;
  const id = row.config?.measurementId?.trim() ?? "";
  if (!id || !/^G-[A-Z0-9]+$/.test(id)) return null;
  return id;
}
