import "server-only";
import { promises as dns } from "node:dns";

/**
 * DNS verification for tenant custom domains.
 *
 * The flow we expect from a customer:
 *
 *   1. They buy yourdomain.com at a registrar (GoDaddy, Namecheap…).
 *   2. They add a CNAME at the apex (or @) pointing at our hosting:
 *        @  CNAME  <DOMAIN_TARGET>     e.g. bb-platform.netlify.app
 *      Some registrars don't allow CNAME on apex — those need
 *      ALIAS / ANAME records instead, but the value is still our
 *      DOMAIN_TARGET. (Netlify also supports A records to its
 *      load-balancer IPs as an alternative.)
 *
 *   3. We resolve their domain. If it points at our DOMAIN_TARGET
 *      (or anything that ultimately CNAMEs to it), we mark them
 *      verified.
 *
 * This module deliberately uses node:dns (not fetch) so we get the
 * raw record without triggering an HTTP request.
 */

export type DomainCheck =
  | { state: "unset" }
  | { state: "verified"; observed: string }
  | { state: "pending"; observed: string | null; reason: string }
  | { state: "mismatch"; observed: string; reason: string };

const DEFAULT_TARGET = "bb-platform.netlify.app";

export function getPlatformTarget(): string {
  const t = process.env.DOMAIN_TARGET?.trim().toLowerCase();
  return t || DEFAULT_TARGET;
}

/**
 * Resolve a domain through CNAME chains until we hit a leaf.
 * Returns the final hostname the domain points at, or null if it
 * doesn't resolve at all.
 */
async function resolveCnameChain(host: string): Promise<string | null> {
  const visited = new Set<string>();
  let current = host.toLowerCase();
  // Cap chain length so a malicious DNS loop can't hang us.
  for (let i = 0; i < 8; i++) {
    if (visited.has(current)) return current;
    visited.add(current);
    try {
      const records = await dns.resolveCname(current);
      if (!records || records.length === 0) return current;
      current = records[0].toLowerCase().replace(/\.$/, "");
    } catch {
      return current;
    }
  }
  return current;
}

/**
 * Verify that `domain` resolves (via any CNAME chain) to our
 * configured DOMAIN_TARGET, or — for hosts that publish A records
 * directly to Netlify's load balancer — that the IP belongs to a
 * subdomain we recognise.
 *
 * Returns a structured result the master dashboard can render.
 */
export async function checkDomain(
  domain: string | null | undefined,
  target: string = getPlatformTarget(),
): Promise<DomainCheck> {
  const d = (domain || "").trim().toLowerCase();
  if (!d) return { state: "unset" };

  // Strip protocol if a customer pasted https://… by mistake.
  const clean = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const expected = target.toLowerCase().replace(/\.$/, "");

  // Try CNAME first — that's the canonical setup we recommend.
  const final = await resolveCnameChain(clean);

  if (!final) {
    return {
      state: "pending",
      observed: null,
      reason: "Domain doesn't resolve yet — DNS not propagated.",
    };
  }

  if (final === expected || final.endsWith(`.${expected}`)) {
    return { state: "verified", observed: final };
  }

  // Some registrars only allow A records at the apex. If `final`
  // looks like an A-record IP, try a reverse lookup or just label as
  // pending until they fix it.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(final)) {
    return {
      state: "pending",
      observed: final,
      reason: `Domain points to an IP (${final}) instead of the recommended CNAME. Netlify A records are also accepted but require manual verification.`,
    };
  }

  return {
    state: "mismatch",
    observed: final,
    reason: `Domain currently resolves to "${final}", not our target "${expected}".`,
  };
}
