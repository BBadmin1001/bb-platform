import "server-only";

/**
 * Tiny Netlify API client for managing the platform site's domain
 * aliases.
 *
 * Why hand-rolled and not their SDK? Two reasons:
 *   1. We only need three endpoints — pulling in a full SDK is
 *      overkill, and any SDK we use has to run on Edge runtimes too.
 *   2. The few calls we make are well-shaped and easy to read here,
 *      which makes the integration trivial to audit.
 *
 * All functions are best-effort: when NETLIFY_API_TOKEN or
 * NETLIFY_SITE_ID are missing, they no-op with `{ ok: false,
 * skipped: true }`. The master action layer treats that as "Netlify
 * not configured yet" and surfaces a friendlier message than
 * "request failed".
 *
 * Netlify API docs: https://open-api.netlify.com/
 */

const API = "https://api.netlify.com/api/v1";

interface NetlifyConfig {
  token: string;
  siteId: string;
}

function getConfig(): NetlifyConfig | null {
  const token = process.env.NETLIFY_API_TOKEN?.trim();
  const siteId = process.env.NETLIFY_SITE_ID?.trim();
  if (!token || !siteId) return null;
  return { token, siteId };
}

export function isNetlifyConfigured(): boolean {
  return getConfig() !== null;
}

/**
 * Result shape used by every function below. `skipped` means
 * Netlify isn't configured yet — the master UI distinguishes that
 * from a real failure.
 */
export type NetlifyResult =
  | { ok: true; aliases: string[] }
  | { ok: false; error: string; skipped?: boolean };

/**
 * Fetch the current site object (we only care about the alias list).
 */
async function getSite(
  cfg: NetlifyConfig,
): Promise<{ ok: true; aliases: string[] } | { ok: false; error: string }> {
  try {
    const r = await fetch(`${API}/sites/${cfg.siteId}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: "no-store",
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return {
        ok: false,
        error: `Netlify GET /sites failed (${r.status}): ${body.slice(0, 200)}`,
      };
    }
    const json = (await r.json()) as { domain_aliases?: string[] };
    return { ok: true, aliases: json.domain_aliases ?? [] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Netlify GET /sites threw",
    };
  }
}

/**
 * PATCH the site's domain_aliases array. Replaces the whole array
 * — the addAlias / removeAlias helpers below GET first then mutate
 * + PATCH so we don't accidentally drop existing aliases.
 */
async function patchAliases(
  cfg: NetlifyConfig,
  aliases: string[],
): Promise<NetlifyResult> {
  try {
    const r = await fetch(`${API}/sites/${cfg.siteId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ domain_aliases: aliases }),
      cache: "no-store",
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return {
        ok: false,
        error: `Netlify PATCH /sites failed (${r.status}): ${body.slice(0, 200)}`,
      };
    }
    const json = (await r.json()) as { domain_aliases?: string[] };
    return { ok: true, aliases: json.domain_aliases ?? [] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Netlify PATCH threw",
    };
  }
}

function normalize(domain: string): string {
  return domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

/**
 * Add a domain to the platform site's alias list. Idempotent —
 * adding a domain that's already there is a no-op (returns ok:true
 * with the unchanged list).
 */
export async function addNetlifyAlias(
  domain: string | null | undefined,
): Promise<NetlifyResult> {
  const cfg = getConfig();
  if (!cfg) {
    return { ok: false, error: "Netlify not configured", skipped: true };
  }
  const d = normalize(domain ?? "");
  if (!d) return { ok: false, error: "Empty domain" };

  const existing = await getSite(cfg);
  if (!existing.ok) return existing;

  if (existing.aliases.includes(d)) {
    return { ok: true, aliases: existing.aliases };
  }

  return patchAliases(cfg, [...existing.aliases, d]);
}

/**
 * Remove a domain from the alias list. Idempotent — removing one
 * that isn't there is a no-op.
 */
export async function removeNetlifyAlias(
  domain: string | null | undefined,
): Promise<NetlifyResult> {
  const cfg = getConfig();
  if (!cfg) {
    return { ok: false, error: "Netlify not configured", skipped: true };
  }
  const d = normalize(domain ?? "");
  if (!d) return { ok: false, error: "Empty domain" };

  const existing = await getSite(cfg);
  if (!existing.ok) return existing;

  if (!existing.aliases.includes(d)) {
    return { ok: true, aliases: existing.aliases };
  }

  return patchAliases(cfg, existing.aliases.filter((a) => a !== d));
}

/**
 * Replace the entire alias list with the rebuilt one — useful for a
 * "force resync" button that scans every active tenant's
 * custom_domain and reconciles.
 */
export async function setNetlifyAliases(
  domains: string[],
): Promise<NetlifyResult> {
  const cfg = getConfig();
  if (!cfg) {
    return { ok: false, error: "Netlify not configured", skipped: true };
  }
  const cleaned = Array.from(new Set(domains.map(normalize).filter(Boolean)));
  return patchAliases(cfg, cleaned);
}

/**
 * Just list — handy for the master settings page to show "Netlify
 * has these aliases right now" when reconciling state.
 */
export async function listNetlifyAliases(): Promise<NetlifyResult> {
  const cfg = getConfig();
  if (!cfg) {
    return { ok: false, error: "Netlify not configured", skipped: true };
  }
  return getSite(cfg);
}
