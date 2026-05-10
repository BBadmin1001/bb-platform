import "server-only";

/**
 * Transactional email layer — wraps Resend so the rest of the app
 * calls one of the named send helpers (sendIntakeReceived, etc.)
 * instead of constructing message bodies inline.
 *
 * Configuration:
 *
 *   RESEND_API_KEY                 — Resend API key (re_...). When
 *                                    missing, every send becomes a
 *                                    console.log no-op so production
 *                                    keeps working without the
 *                                    integration.
 *   EMAIL_FROM                     — sender address, e.g.
 *                                    "BB Platform <hello@brandbonjour.com>".
 *                                    Defaults to a generic onboarding@.
 *   EMAIL_REPLY_TO                 — optional Reply-To header (your
 *                                    real inbox). Defaults to the FROM
 *                                    address.
 *   EMAIL_INTERNAL_TO              — comma-separated list of internal
 *                                    addresses that get every "new
 *                                    paid prospect" / "needs polish"
 *                                    notification. When unset, internal
 *                                    notifications are skipped.
 *
 * All sends are best-effort — if the network or Resend itself has a
 * blip, we log the error and move on. Email failure should never
 * fail a customer-facing action like a Stripe checkout submit.
 */

import { Resend } from "resend";

let cached: Resend | null = null;
function client(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}

const FROM =
  process.env.EMAIL_FROM?.trim() ||
  "BB Platform <onboarding@resend.dev>";
const REPLY_TO = process.env.EMAIL_REPLY_TO?.trim() || undefined;
const INTERNAL_TO = (process.env.EMAIL_INTERNAL_TO || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  /** Plain-text fallback. We render a stripped version automatically
   *  when not provided. */
  text?: string;
};

/** Low-level send. Logs and swallows errors. */
async function send(args: SendArgs): Promise<{ ok: boolean }> {
  const r = client();
  if (!r) {
    console.log("[email] (no-op, RESEND_API_KEY unset)", {
      to: args.to,
      subject: args.subject,
    });
    return { ok: true };
  }
  try {
    const { error } = await r.emails.send({
      from: FROM,
      to: Array.isArray(args.to) ? args.to : [args.to],
      replyTo: REPLY_TO,
      subject: args.subject,
      html: args.html,
      text: args.text || stripHtml(args.html),
    });
    if (error) {
      console.error("[email] resend returned error", error);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] send threw", e);
    return { ok: false };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────

function shell(content: string): string {
  return `<!doctype html>
<html><body style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif; color: #142840; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
${content}
<p style="margin-top: 40px; font-size: 11px; color: rgba(20,40,64,0.5); letter-spacing: 0.18em; text-transform: uppercase;">BB Platform · Real estate websites, done right.</p>
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────
// Public send helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Confirmation right after a customer submits the intake wizard.
 * Sets expectations for what happens next: "we'll polish, you'll
 * get a preview link, then you point your domain at us."
 */
export async function sendIntakeReceived(input: {
  to: string;
  contactName: string;
  hasPaid: boolean;
}) {
  const subject = input.hasPaid
    ? "We got your intake — your site is in build"
    : "We got your intake — quote on the way";
  const html = shell(`
<h1 style="font-size: 24px; font-weight: 200; letter-spacing: 0.005em; margin: 0 0 16px;">Thanks, ${escape(input.contactName)}.</h1>
<p>Your intake landed safely. ${
    input.hasPaid
      ? "Payment is in too — our team is firing up your site now."
      : "We'll review and get back to you with a quote within one business day."
  }</p>
<p style="margin-top: 16px;">Here's what happens next:</p>
<ol style="padding-left: 20px;">
  <li><strong>We polish.</strong> Our team takes the content you sent and crafts a finished site — copy edits, photo placement, brand polish.</li>
  <li><strong>You review.</strong> We send you a private preview link. You take a look, request tweaks, give us the green light.</li>
  <li><strong>You connect your domain.</strong> We give you the DNS instructions — usually one CNAME record. The site goes live the moment your domain resolves.</li>
</ol>
<p>Questions? Just reply — this address is monitored.</p>
`);
  return send({ to: input.to, subject, html });
}

/**
 * Internal alert when a new paid prospect lands. Goes to the
 * EMAIL_INTERNAL_TO list (your team) so polish work can start
 * immediately without anyone refreshing the master dashboard.
 */
export async function sendInternalNewPaidProspect(input: {
  prospectId: string;
  contactName: string;
  brokerage: string;
  email: string;
  agreedSetupCents: number | null;
  salesRepRef: string | null;
}) {
  if (INTERNAL_TO.length === 0) return { ok: true }; // nobody to alert
  const dollars = input.agreedSetupCents
    ? `$${(input.agreedSetupCents / 100).toFixed(0)}`
    : "—";
  const subject = `New paid prospect: ${input.contactName} (${input.brokerage}) · ${dollars}`;
  const html = shell(`
<h1 style="font-size: 20px; font-weight: 500; margin: 0 0 12px;">New paid prospect</h1>
<table style="width: 100%; border-collapse: collapse; font-size: 14px;">
  <tr><td style="padding: 6px 0; color: rgba(20,40,64,0.55); width: 120px;">Contact</td><td>${escape(input.contactName)}</td></tr>
  <tr><td style="padding: 6px 0; color: rgba(20,40,64,0.55);">Brokerage</td><td>${escape(input.brokerage)}</td></tr>
  <tr><td style="padding: 6px 0; color: rgba(20,40,64,0.55);">Email</td><td>${escape(input.email)}</td></tr>
  <tr><td style="padding: 6px 0; color: rgba(20,40,64,0.55);">Setup fee</td><td><strong>${dollars}</strong></td></tr>
  ${input.salesRepRef ? `<tr><td style="padding: 6px 0; color: rgba(20,40,64,0.55);">Sales rep</td><td>${escape(input.salesRepRef)}</td></tr>` : ""}
</table>
<p style="margin-top: 24px;">
  <a href="${process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://bb-platform-387.netlify.app"}/master/prospects/${input.prospectId}"
     style="display: inline-block; padding: 12px 20px; background: #142840; color: white; text-decoration: none; font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 500;">
    Open in master dashboard →
  </a>
</p>
`);
  return send({ to: INTERNAL_TO, subject, html });
}

/**
 * "Your site is ready to review" — sent when master advances a tenant
 * to `ready_for_review` lifecycle stage. Includes the preview link.
 */
export async function sendSiteReadyForReview(input: {
  to: string;
  realtorName: string;
  previewUrl: string;
}) {
  const subject = "Your website is ready for a look";
  const html = shell(`
<h1 style="font-size: 24px; font-weight: 200; margin: 0 0 16px;">${escape(input.realtorName)}, take a look.</h1>
<p>We've polished up your site. Here's a private preview link — only people with this URL can see it.</p>
<p style="margin: 24px 0;">
  <a href="${escape(input.previewUrl)}"
     style="display: inline-block; padding: 14px 28px; background: #142840; color: white; text-decoration: none; font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 500;">
    Preview your site →
  </a>
</p>
<p>Click around. Note any tweaks you want. Reply to this email with your changes — or with the green light to move to the next step (connecting your domain).</p>
<p style="margin-top: 24px; color: rgba(20,40,64,0.55); font-size: 13px;">
  Preview URL: <code>${escape(input.previewUrl)}</code>
</p>
`);
  return send({ to: input.to, subject, html });
}

/**
 * "Connect your domain" — sent when master advances to
 * `ready_for_domain`. Includes the CNAME instructions.
 */
export async function sendDomainInstructions(input: {
  to: string;
  realtorName: string;
  desiredDomain: string;
  cnameTarget: string;
}) {
  const subject = "Point your domain at us";
  const html = shell(`
<h1 style="font-size: 24px; font-weight: 200; margin: 0 0 16px;">One last step, ${escape(input.realtorName)}.</h1>
<p>You're approved — your site is ready to go live on <strong>${escape(input.desiredDomain)}</strong>. Last thing we need is your domain pointing at our servers.</p>
<p>Log in wherever you bought your domain (GoDaddy, Namecheap, Google Domains, Cloudflare, etc.) and add this DNS record:</p>
<table style="width: 100%; border: 1px solid rgba(20,40,64,0.15); border-radius: 6px; padding: 16px; font-family: ui-monospace, monospace; font-size: 13px; margin: 16px 0;">
  <tr><td style="padding: 4px 0; color: rgba(20,40,64,0.55); width: 80px;">Type</td><td>CNAME</td></tr>
  <tr><td style="padding: 4px 0; color: rgba(20,40,64,0.55);">Name</td><td>@ (or root / apex)</td></tr>
  <tr><td style="padding: 4px 0; color: rgba(20,40,64,0.55);">Value</td><td><strong>${escape(input.cnameTarget)}</strong></td></tr>
</table>
<p>It usually takes 5–60 minutes for DNS to propagate. We're watching automatically — once it resolves, your site goes live and we'll send a confirmation.</p>
<p>Need help? Just reply with your registrar name and we'll walk you through.</p>
`);
  return send({ to: input.to, subject, html });
}

/**
 * "You're live" — sent when DNS verifies and the tenant flips to live.
 */
export async function sendSiteLive(input: {
  to: string;
  realtorName: string;
  liveUrl: string;
}) {
  const subject = "You're live 🎉";
  const html = shell(`
<h1 style="font-size: 24px; font-weight: 200; margin: 0 0 16px;">It's live, ${escape(input.realtorName)}.</h1>
<p>Your site is publicly online at <a href="${escape(input.liveUrl)}"><strong>${escape(input.liveUrl)}</strong></a>.</p>
<p>From here on, everything's editable from your admin panel — copy, photos, communities, listings, reviews, partners. We're still here if you need us.</p>
<p style="margin: 24px 0;">
  <a href="${escape(input.liveUrl)}/admin"
     style="display: inline-block; padding: 14px 28px; background: #142840; color: white; text-decoration: none; font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 500;">
    Open your admin panel →
  </a>
</p>
`);
  return send({ to: input.to, subject, html });
}

// Tiny HTML escaper to keep our template insertions safe.
function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
