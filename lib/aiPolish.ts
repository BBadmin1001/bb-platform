import "server-only";

/**
 * AI-assisted content polishing.
 *
 * Takes the raw intake_data a customer submitted in the wizard and
 * generates a polished `home.meet` block (eyebrow, heading, bio
 * paragraphs, quote, CTA) tailored to that realtor's voice +
 * service area + clientele.
 *
 * The polish team reviews + tweaks the output in the admin panel
 * before publishing — this isn't a fully-autonomous content engine.
 * The goal is "5 minutes of review" instead of "1-2 hours of writing
 * from scratch."
 *
 * Configuration:
 *   ANTHROPIC_API_KEY  — when missing, every polish call returns a
 *                        clear "AI not configured" error so the
 *                        admin UX stays predictable in dev.
 *
 * The prompt is intentionally constrained to Brand Bonjour's house
 * voice rules (calm, no boastful claims, no "luxury/elite/exclusive",
 * first person). If the customer's voice_direction conflicts with
 * those rules we honour the customer (it's their site).
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

const SYSTEM_PROMPT = `You write copy for boutique real estate agent websites. House style:

- First person ("I help...") — warm, conversational, never boastful.
- No "the best", "elite", "luxury", "exclusive", "hustle", "grind".
- Show care through restraint, never by saying it.
- Concrete > abstract. Avoid hype.
- 1-3 short paragraphs in the body, each 2-3 sentences max.
- Do not invent credentials, license numbers, testimonials, or stats.
- Do not mention "Path to Ownership" by name unless the customer's
  intake explicitly mentions a similar program.

Output JSON only. No prose around it. Schema:
{
  "eyebrow": "Meet <FirstName>",
  "heading": "<one calm sentence framing the value of their work>",
  "body": ["paragraph 1", "paragraph 2"],
  "quote": "<one short personal-feeling line, ≤ 25 words>",
  "cta": { "label": "About <FirstName>", "href": "/about" }
}`;

/**
 * Generate a polished `home.meet` block from intake data.
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

  const userPrompt = `Customer intake data:

Realtor name: ${intake.realtor_full_name || "(unset)"}
Brokerage: ${intake.brokerage_name || "(unset)"}
Bio they wrote: ${intake.realtor_short_bio?.trim() || "(none)"}
Voice direction: ${intake.voice_direction?.trim() || "(none — use house style)"}
Languages: ${(intake.languages || []).join(", ") || "(none specified)"}
Service areas: ${(intake.service_areas || []).join(", ") || "(none specified)"}
License states: ${
    (intake.licensed_states || [])
      .map((l) => l.state_abbr)
      .filter(Boolean)
      .join(", ") || "(none specified)"
  }
Tagline: ${intake.tagline?.trim() || "(none)"}

Generate the home.meet block. Use "${firstName}" as the first name.`;

  try {
    const res = await c.messages.create({
      // Sonnet 4.5 is the right tier for content polish — fast, smart
      // enough for tone/voice work, and ~5x cheaper than Opus. Pinned
      // to the alias so it tracks the latest 4.5 release.
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Pull the first text block out of the response.
    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n")
      .trim();

    // Strip markdown code fences if Claude wrapped the JSON.
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as PolishedMeet;

    // Sanity-check shape so we don't write garbage onto the tenant.
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
