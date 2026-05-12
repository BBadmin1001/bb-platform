import "server-only";

/**
 * AI-assisted content polishing.
 *
 * Two surfaces:
 *   • `polishMeetSection(intake)` — the original Phase 13 polish, just
 *     rewrites `home.meet`. Kept for backwards-compat with the master
 *     "Polish Meet section" button.
 *   • `polishWholeSite(intake, allDefaults)` — rewrites every editable
 *     copy block on every public page (home / about / buyers / sellers /
 *     path / partners / contact), tailored to the realtor's intake.
 *     Parallel: one Claude call per page, so an 8-page site polishes
 *     in ~5-10 seconds total, and a single page failing doesn't take
 *     the others down.
 *
 * Configuration:
 *   ANTHROPIC_API_KEY  — when missing, every polish call returns a
 *                        clear "AI not configured" error so the
 *                        admin UX stays predictable in dev.
 *
 * The prompts are constrained to Brand Bonjour's house voice rules
 * (calm, no boastful claims, no "luxury/elite/exclusive", first
 * person). When the customer's voice_direction conflicts with those
 * rules we honour the customer (it's their site).
 *
 * Output shape: every polish call returns the SAME JSON shape as the
 * default content (so the existing renderers Just Work). Hrefs,
 * imageKeys, step numbers, stats are preserved as-is — Claude is told
 * to rewrite copy fields only.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { IntakeData } from "@/lib/intakeSchema";

let cached: Anthropic | null = null;
function client(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  if (!cached) cached = new Anthropic({ apiKey: key });
  return cached;
}

// ─────────────────────────────────────────────────────────────────────
// House style — shared across every polish call.
// ─────────────────────────────────────────────────────────────────────

const HOUSE_STYLE = `You write copy for boutique real estate agent websites. House style:

- First person ("I help...") — warm, conversational, never boastful.
- No "the best", "elite", "luxury", "exclusive", "hustle", "grind", "world-class".
- Show care through restraint, never by saying it.
- Concrete > abstract. Avoid hype.
- Keep paragraphs short (2-3 sentences max), keep total length close to the original.
- Do not invent credentials, license numbers, testimonials, or stats.
- If you encounter a {{realtor_name}}, {{realtor_first_name}}, {{brokerage}}, or
  {{state_abbr}} placeholder in the original copy, KEEP it (or substitute an
  equivalent placeholder) — the platform auto-fills these at render time so
  the copy stays accurate if the realtor's details change.
- Preserve any hrefs (e.g. "/about", "/contact"), image keys (imageKey: "buy"),
  step numbers ("01", "02"), and numeric stats exactly as given.
- Only rewrite *text* fields (eyebrow, heading, subtitle, body, paragraphs,
  quote, cta.label, etc.). Anything that looks like data or routing — leave alone.`;

const OUTPUT_RULES = `Output **only** the polished JSON object — no prose, no
explanation, no markdown fences. The output must have the **exact same JSON
shape** as the input (same keys at every level, same array lengths). If a
field is null or empty in the input, leave it null or empty in the output.`;

// ─────────────────────────────────────────────────────────────────────
// Per-page metadata: what each page is FOR. Helps Claude calibrate
// tone (homepage is welcoming, sellers is reassuring, etc.).
// ─────────────────────────────────────────────────────────────────────

export const POLISH_PAGES = [
  "home",
  "about",
  "buyers",
  "sellers",
  "path",
  "partners",
  "contact",
] as const;
export type PolishPage = (typeof POLISH_PAGES)[number];

const PAGE_GUIDES: Record<PolishPage, string> = {
  home:
    "The front door. The visitor is forming a first impression — write hero copy that signals competence + warmth, a Meet section that introduces the realtor humanly, and service cards that frame Buying / Selling / Path-to-Ownership in plain English. End on a calm sign-off line.",
  about:
    "Personal story of the realtor. Write the bio in their voice — what they care about, who they help, why they got into the business. Use the realtor's bio + voice_direction from intake as primary source material. Don't invent biography facts.",
  buyers:
    "For people thinking about buying a home. Tone: reassuring, not salesy. Talk about the buying process (pre-approval, hunt, offer, inspection, appraisal, closing) and what working with a buyer's agent actually gets you. Loan-program section is informational — keep the same loan types in the same order.",
  sellers:
    "For homeowners considering selling. Tone: confident but never boastful. Cover honest pricing, professional marketing, negotiation. The 6-step process is the same shape (Valuation → Pricing → Prep & Stage → Launch → Negotiate → Close).",
  path:
    "A 12-to-24-month plan for renters becoming owners. Tone: encouraging, anti-pressure. The 4-step program (Discover → Prepare → Shop → Close) is the same shape. FAQs cover the most common objections — keep the same questions, polish the answers.",
  partners:
    "The realtor's trusted network (lenders, inspectors, insurance, repairs, settlement). Keep the same 5 category headings; rewrite the descriptions of each in the realtor's voice. The intro emphasizes that referrals aren't paid placements.",
  contact:
    "Sparse by design — a hero, a form intro, a consent line. No body copy to invent. Just polish the tone of the hero subtitle, the formIntro heading, and the consent text.",
};

// ─────────────────────────────────────────────────────────────────────
// Intake summary — once per polish run, passed in every page call so
// Claude has full context.
// ─────────────────────────────────────────────────────────────────────

function summarizeIntake(intake: IntakeData): string {
  const lines: string[] = [];
  lines.push(`Realtor full name: ${intake.realtor_full_name || "(unset)"}`);
  lines.push(`Brokerage: ${intake.brokerage_name || "(unset)"}`);
  if (intake.realtor_short_bio?.trim()) {
    lines.push(`Bio (their words): ${intake.realtor_short_bio.trim()}`);
  }
  if (intake.voice_direction?.trim()) {
    lines.push(`Voice direction: ${intake.voice_direction.trim()}`);
  }
  if (intake.languages?.length) {
    lines.push(`Languages: ${intake.languages.join(", ")}`);
  }
  if (intake.service_areas?.length) {
    lines.push(`Service areas: ${intake.service_areas.join(", ")}`);
  }
  if (intake.licensed_states?.length) {
    const states = intake.licensed_states
      .map((l) => l.state_abbr)
      .filter(Boolean)
      .join(", ");
    if (states) lines.push(`Licensed states: ${states}`);
  }
  if (intake.tagline?.trim()) {
    lines.push(`Tagline: ${intake.tagline.trim()}`);
  }
  if (intake.notes?.trim()) {
    lines.push(`Notes from realtor: ${intake.notes.trim()}`);
  }
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────
// JSON extraction — strip code fences, parse, validate basic shape.
// ─────────────────────────────────────────────────────────────────────

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

/**
 * Shape-check: does the polished output have the same keys at the
 * same paths as the input defaults? Doesn't validate types deeply —
 * just that nothing important is missing. Catches "Claude returned
 * an object with only 'eyebrow'" style failures.
 */
function shapesMatch(defaults: unknown, polished: unknown): boolean {
  if (defaults === null || polished === null) return true;
  if (typeof defaults !== typeof polished) return false;
  if (Array.isArray(defaults)) {
    if (!Array.isArray(polished)) return false;
    if (defaults.length !== polished.length) return false;
    // Validate each pair so an array of cards keeps the same card count.
    return defaults.every((d, i) => shapesMatch(d, polished[i]));
  }
  if (typeof defaults === "object" && defaults !== null) {
    if (typeof polished !== "object" || polished === null) return false;
    const defKeys = Object.keys(defaults as Record<string, unknown>);
    const polKeys = Object.keys(polished as Record<string, unknown>);
    // Every key in the defaults must be in the polished output. Extra
    // keys on the polished side are fine (Claude sometimes adds metadata).
    return defKeys.every((k) => polKeys.includes(k));
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────
// Page-level polish
// ─────────────────────────────────────────────────────────────────────

export type PolishPageResult =
  | { ok: true; page: PolishPage; content: Record<string, unknown> }
  | { ok: false; page: PolishPage; error: string };

/**
 * Rewrite every editable copy block on one page in one Claude call.
 * Returns the polished JSON (same shape as `defaults`), or a clear
 * error if anything went sideways.
 */
export async function polishPage(
  intake: IntakeData,
  page: PolishPage,
  defaults: Record<string, unknown>,
): Promise<PolishPageResult> {
  const c = client();
  if (!c) {
    return {
      ok: false,
      page,
      error:
        "AI polish isn't configured yet — set ANTHROPIC_API_KEY in env to enable.",
    };
  }

  const userPrompt = `Page being polished: \`${page}\`

Purpose of this page:
${PAGE_GUIDES[page]}

Realtor intake data:
${summarizeIntake(intake)}

Current default copy (this is the JSON shape you must return — rewrite
the text fields in the realtor's voice, keep everything else identical):
\`\`\`json
${JSON.stringify(defaults, null, 2)}
\`\`\`

${OUTPUT_RULES}`;

  try {
    const res = await c.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: HOUSE_STYLE,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n")
      .trim();

    const parsed = extractJson(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        page,
        error: "AI returned non-object — expected JSON keyed by section.",
      };
    }
    if (!shapesMatch(defaults, parsed)) {
      return {
        ok: false,
        page,
        error:
          "AI returned a different JSON shape than the defaults — refusing to write garbage onto the tenant.",
      };
    }
    return { ok: true, page, content: parsed as Record<string, unknown> };
  } catch (e) {
    return {
      ok: false,
      page,
      error:
        e instanceof Error
          ? `Polish failed: ${e.message}`
          : "Polish failed (unknown error).",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Whole-site polish — parallel page-by-page
// ─────────────────────────────────────────────────────────────────────

export type PolishSiteResult = {
  pages: PolishPageResult[];
  /** Total Claude latency in ms (max across parallel calls). */
  ms: number;
  /** Convenience: how many pages succeeded / failed. */
  okCount: number;
  errCount: number;
};

/**
 * Polish every page in parallel. Each page is independent — one
 * failing doesn't cancel the others. Returns per-page results.
 *
 * `allDefaults` is the `lib/content.ts` `content` object — the function
 * picks out the pages it cares about (POLISH_PAGES) and ignores the
 * rest (brand block, shared CTAs, communities table, etc.).
 */
export async function polishWholeSite(
  intake: IntakeData,
  allDefaults: Record<string, unknown>,
): Promise<PolishSiteResult> {
  const start = Date.now();
  const settled = await Promise.allSettled(
    POLISH_PAGES.map((page) => {
      const pageDefaults = allDefaults[page];
      if (!pageDefaults || typeof pageDefaults !== "object") {
        return Promise.resolve<PolishPageResult>({
          ok: false,
          page,
          error: `No default content for page "${page}".`,
        });
      }
      return polishPage(
        intake,
        page,
        pageDefaults as Record<string, unknown>,
      );
    }),
  );

  const pages: PolishPageResult[] = settled.map((s, i) => {
    const page = POLISH_PAGES[i];
    if (s.status === "fulfilled") return s.value;
    return {
      ok: false,
      page,
      error:
        s.reason instanceof Error
          ? s.reason.message
          : "Polish promise rejected.",
    };
  });

  return {
    pages,
    ms: Date.now() - start,
    okCount: pages.filter((p) => p.ok).length,
    errCount: pages.filter((p) => !p.ok).length,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Backwards-compatible single-section polish (Phase 13)
// ─────────────────────────────────────────────────────────────────────

export type PolishedMeet = {
  eyebrow: string;
  heading: string;
  body: string[];
  quote: string;
  cta: { label: string; href: string };
};

export type PolishResult =
  | { ok: true; meet: PolishedMeet }
  | { ok: false; error: string };

const MEET_ONLY_PROMPT = `${HOUSE_STYLE}

Output JSON only. No prose around it. Schema:
{
  "eyebrow": "Meet <FirstName>",
  "heading": "<one calm sentence framing the value of their work>",
  "body": ["paragraph 1", "paragraph 2"],
  "quote": "<one short personal-feeling line, ≤ 25 words>",
  "cta": { "label": "About <FirstName>", "href": "/about" }
}`;

/**
 * Legacy entry point — polishes just `home.meet`. The whole-site
 * polish supersedes this for new flows; kept so existing "Polish Meet
 * section" buttons keep working without a UI redesign forced on master.
 */
export async function polishMeetSection(
  intake: IntakeData,
): Promise<PolishResult> {
  const c = client();
  if (!c) {
    return {
      ok: false,
      error:
        "AI polish isn't configured yet — set ANTHROPIC_API_KEY in env to enable.",
    };
  }

  const firstName =
    (intake.realtor_full_name || "").split(/\s+/)[0] || "the realtor";

  const userPrompt = `${summarizeIntake(intake)}

Generate the home.meet block. Use "${firstName}" as the first name.`;

  try {
    const res = await c.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: MEET_ONLY_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n")
      .trim();

    const parsed = extractJson(text) as PolishedMeet;
    if (
      typeof parsed.eyebrow !== "string" ||
      typeof parsed.heading !== "string" ||
      !Array.isArray(parsed.body) ||
      typeof parsed.quote !== "string" ||
      !parsed.cta ||
      typeof parsed.cta.label !== "string" ||
      typeof parsed.cta.href !== "string"
    ) {
      return { ok: false, error: "AI returned the wrong shape — try again." };
    }

    return { ok: true, meet: parsed };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `AI polish failed: ${e.message}`
          : "AI polish failed.",
    };
  }
}
