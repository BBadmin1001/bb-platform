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

export type IntegrationKey =
  | "google_places"
  | "google_analytics"
  | "calendly"
  | "lead_webhook";

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

// ─────────────────────────── Calendly (Phase 31) ───────────────────

export interface CalendlyConfig {
  /** Full Calendly scheduling URL, e.g. https://calendly.com/jane-realtor/30min */
  url: string;
}

export async function getCalendlyIntegration() {
  return getIntegration<CalendlyConfig>("calendly");
}

/** Returns the Calendly URL if connected + enabled, else null. */
export async function getCalendlyUrl(): Promise<string | null> {
  const row = await getCalendlyIntegration();
  if (!row?.enabled) return null;
  const url = row.config?.url?.trim() ?? "";
  if (!url || !/^https?:\/\//.test(url)) return null;
  return url;
}

// ─────────────────────── CRM lead webhook (Phase 31) ─────────────

/**
 * Generic outbound webhook for CRMs like Follow Up Boss, kvCORE,
 * HubSpot, Zapier, n8n. When a public form submission lands in
 * `leads`, the lead is also POSTed to this URL as JSON. The realtor
 * configures the URL and a header value once.
 */
export interface LeadWebhookConfig {
  /** Where to POST the lead payload. */
  url: string;
  /** Optional value for the X-API-Key header (Follow Up Boss style). */
  apiKey?: string;
  /** Short human label for the master + admin UI ("Follow Up Boss",
   *  "kvCORE", "Zapier Catch Hook", etc.). */
  label?: string;
}

export async function getLeadWebhook() {
  return getIntegration<LeadWebhookConfig>("lead_webhook");
}

/** Returns the configured webhook URL + headers, or null if not set. */
export async function getLeadWebhookConfig(): Promise<{
  url: string;
  apiKey?: string;
  label?: string;
} | null> {
  const row = await getLeadWebhook();
  if (!row?.enabled) return null;
  const url = row.config?.url?.trim() ?? "";
  if (!url || !/^https?:\/\//.test(url)) return null;
  return {
    url,
    apiKey: row.config?.apiKey?.trim() || undefined,
    label: row.config?.label?.trim() || undefined,
  };
}
