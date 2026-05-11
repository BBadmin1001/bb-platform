/**
 * Content Registry — single source of truth for what's editable in the admin.
 *
 * Each section maps to ONE row in `content_blocks` (page, key, value).
 * `value` is JSON-serialized using the section's defined `shape`.
 *
 * Adding a new editable section?
 *   1. Add an entry below
 *   2. Run/update `supabase/migrations/0002_seed_content.sql` (or call the
 *      reseed script) so the row exists
 *   3. Read it on the marketing site via `getSection(page, key)`
 *
 * The shape vocabulary is intentionally tiny — every editable spot can be
 * described with these primitives. The editor renders forms automatically.
 */

import { content as defaults } from "./content";

// =============================================================================
// SHAPE VOCABULARY — primitives the auto-editor knows how to render
// =============================================================================

export type Field =
  | { type: "text"; label: string; placeholder?: string; help?: string }
  | { type: "paragraph"; label: string; placeholder?: string; help?: string; rows?: number }
  | { type: "url"; label: string; placeholder?: string; help?: string }
  | { type: "list"; label: string; itemType: "text" | "paragraph"; help?: string }
  | { type: "object"; label: string; help?: string; shape: Record<string, Field> }
  | {
      type: "array";
      label: string;
      help?: string;
      itemShape: Record<string, Field>;
      /** Field name within itemShape used as the collapsed list label */
      itemTitleField?: string;
      /** Plural noun for the "Add X" button */
      itemNoun?: string;
    }
  | {
      /** Pick from the Media Library. Stored value is { image_id: <uuid> }. */
      type: "image";
      label: string;
      help?: string;
      /** Default crop variant for preview + delivery. Defaults to "free". */
      crop?: "square" | "portrait" | "landscape" | "wide" | "free";
      /** URL shown in the picker when nothing has been picked yet — usually
       *  the page's current hardcoded fallback so admins see what they're
       *  about to replace. */
      fallback?: string;
      /** Cosmetic shape for the picker preview. "circle" frames the preview
       *  in a round mask (used for favicons and avatars) so it looks like the
       *  thing it'll become. */
      previewShape?: "rect" | "circle";
    }
  | {
      /** Pick a YouTube video from the Media Library. Used for muted-loop
       *  hero backgrounds. Stored value is { media_id: <uuid> }. */
      type: "video";
      label: string;
      help?: string;
      /** YouTube ID or full URL shown as preview when nothing's picked. */
      fallbackYouTubeId?: string;
    };

export type SectionDef = {
  page: PageKey;
  key: string;
  label: string;
  description?: string;
  /** Top-level shape — always an object whose keys are the section's fields */
  shape: Record<string, Field>;
};

export type PageKey =
  | "home"
  | "about"
  | "buyers"
  | "sellers"
  | "path"
  | "partners"
  | "contact"
  | "communities"
  | "closings"
  | "reviews"
  | "brand";

export const PAGE_LABELS: Record<PageKey, string> = {
  home: "Homepage",
  about: "About",
  buyers: "Buyers",
  sellers: "Sellers",
  path: "Path to Ownership",
  partners: "Trusted Partners",
  contact: "Contact",
  communities: "Communities (page)",
  closings: "Recent Closings (page)",
  reviews: "Reviews (page)",
  brand: "Brand & Identity",
};

export const PAGE_ORDER: PageKey[] = [
  "home",
  "about",
  "buyers",
  "sellers",
  "path",
  "communities",
  "closings",
  "reviews",
  "partners",
  "contact",
  "brand",
];

// =============================================================================
// REUSABLE SUB-SHAPES
// =============================================================================

/**
 * Build a hero section shape with a custom default background URL. Every
 * page's hero shows this fallback in the editor and on the live site
 * until an admin picks a new image from the Media Library.
 */
function makeHeroFields(fallbackBg: string): Record<string, Field> {
  return {
    eyebrow: { type: "text", label: "Eyebrow", help: "The small label above the title." },
    titleLines: {
      type: "list",
      itemType: "text",
      label: "Title Lines",
      help: "Each line stacks on its own row in the hero. Usually 1–3 lines.",
    },
    subtitle: { type: "paragraph", label: "Subtitle", rows: 3 },
    backgroundImage: {
      type: "image",
      label: "Hero Background",
      crop: "wide",
      fallback: fallbackBg,
      help: "The full-bleed photo behind the hero. Best aspect: 16:9 wide.",
    },
  };
}

// Default hero (used by sections that don't specify a custom background URL,
// e.g. brand identity which has no hero). Same shape but with no fallback.
const heroFields: Record<string, Field> = makeHeroFields("");

/**
 * Standard final-CTA section — heading, body, primary button, optional
 * background image. Page passes the existing hardcoded backdrop URL as
 * fallback so the editor's preview matches the live site.
 */
function makeCtaShape(fallbackBg?: string): Record<string, Field> {
  return {
    heading: { type: "text", label: "Heading" },
    body: { type: "paragraph", label: "Body", rows: 3 },
    primary: {
      type: "object",
      label: "Primary Button",
      shape: ctaShape,
    },
    backgroundImage: {
      type: "image",
      label: "Backdrop Photo",
      crop: "wide",
      fallback: fallbackBg ?? "",
      help: "Faded full-bleed photo behind the CTA. Best aspect: 16:9 wide.",
    },
  };
}

function makeCtaWithSecondaryShape(fallbackBg: string): Record<string, Field> {
  return {
    heading: { type: "text", label: "Heading" },
    body: { type: "paragraph", label: "Body", rows: 3 },
    primary: {
      type: "object",
      label: "Primary Button",
      shape: ctaShape,
    },
    secondary: {
      type: "object",
      label: "Secondary Button",
      shape: ctaShape,
    },
    backgroundImage: {
      type: "image",
      label: "Backdrop Photo",
      crop: "wide",
      fallback: fallbackBg,
      help: "Faded full-bleed photo behind the CTA.",
    },
  };
}

/**
 * Dark-break section divider — full-bleed photo strip with optional eyebrow,
 * quote, and attribution overlaid via a glass card. Used between sections on
 * most pages.
 */
function makeDarkBreakShape(opts: {
  fallbackBg: string;
  defaultEyebrow?: string;
  defaultQuote?: string;
  defaultAttribution?: string;
}): Record<string, Field> {
  return {
    backgroundImage: {
      type: "image",
      label: "Photo",
      crop: "wide",
      fallback: opts.fallbackBg,
      help: "Full-bleed photo. Best aspect: 16:9.",
    },
    eyebrow: {
      type: "text",
      label: "Eyebrow",
      placeholder: opts.defaultEyebrow,
      help: "Small label above the quote. Leave blank for a photo-only divider.",
    },
    quote: {
      type: "paragraph",
      label: "Quote",
      placeholder: opts.defaultQuote,
      rows: 2,
      help: "The big italic line. Leave blank for a photo-only divider.",
    },
    attribution: {
      type: "text",
      label: "Attribution",
      placeholder: opts.defaultAttribution,
      help: "Who said it. Leave blank for none.",
    },
  };
}

const ctaShape: Record<string, Field> = {
  label: { type: "text", label: "Button Label" },
  href: { type: "url", label: "Link URL", placeholder: "/contact" },
};

// =============================================================================
// SECTIONS — every editable section on the site
// =============================================================================

export const SECTIONS: SectionDef[] = [
  // ───────────────────────────── BRAND ─────────────────────────────
  {
    page: "brand",
    key: "identity",
    label: "Brand Identity",
    description: "Name, role, brokerage, tagline, service area — used site-wide.",
    shape: {
      name: { type: "text", label: "Full Name" },
      role: { type: "text", label: "Role / Title" },
      brokerage: { type: "text", label: "Brokerage" },
      tagline: { type: "text", label: "Tagline" },
      serviceArea: { type: "text", label: "Service Area" },
      languages: { type: "list", itemType: "text", label: "Languages Spoken" },
    },
  },
  {
    page: "brand",
    key: "contact",
    label: "Contact & License",
    description:
      "Phone, email, social URLs, state licenses, and brokerage office address. These flow into the header, footer, contact page, privacy page, and the open-house flyer.",
    shape: {
      phone: {
        type: "text",
        label: "Phone",
        placeholder: "(703) 555-1234",
        help: "Shown in the footer and contact page.",
      },
      email: {
        type: "text",
        label: "Email",
        placeholder: "you@yourdomain.com",
      },
      social: {
        type: "object",
        label: "Social URLs",
        help: "Leave any blank to hide that icon from the footer.",
        shape: {
          instagram: {
            type: "url",
            label: "Instagram URL",
            placeholder: "https://instagram.com/handle",
          },
          facebook: {
            type: "url",
            label: "Facebook URL",
            placeholder: "https://facebook.com/handle",
          },
          tiktok: {
            type: "url",
            label: "TikTok URL",
            placeholder: "https://tiktok.com/@handle",
          },
          linkedin: {
            type: "url",
            label: "LinkedIn URL",
            placeholder: "https://linkedin.com/in/handle",
          },
        },
      },
      licenses: {
        type: "array",
        label: "Real Estate Licenses",
        help: "Add one row per state you're licensed in. Both fields required.",
        itemShape: {
          state: {
            type: "text",
            label: "State (2-letter)",
            placeholder: "VA",
          },
          number: {
            type: "text",
            label: "License Number",
            placeholder: "0225...",
          },
        },
        itemTitleField: "state",
        itemNoun: "License",
      },
      office: {
        type: "object",
        label: "Brokerage Office",
        help: "Optional — physical office address shown on flyers + privacy page. Leave blank to omit.",
        shape: {
          name: {
            type: "text",
            label: "Office Name",
            placeholder: "RE/MAX Galaxy",
          },
          street: {
            type: "text",
            label: "Street",
            placeholder: "12781 Darby Brook Court, Suite 102",
          },
          cityStateZip: {
            type: "text",
            label: "City, State Zip",
            placeholder: "Woodbridge, VA 22192",
          },
          phone: {
            type: "text",
            label: "Office Phone",
            placeholder: "(703) 491-9570",
          },
        },
      },
    },
  },
  {
    page: "brand",
    key: "portrait",
    label: "Realtor Image",
    description:
      "Your headshot — used as header avatar, footer, homepage intro, About page hero and bio. One picker, used in 6 places.",
    shape: {
      portrait: {
        type: "image",
        label: "Realtor Image",
        crop: "portrait",
        help: "Best aspect ratio is 3:4 (vertical). The crop preset adapts automatically per location.",
        fallback: "/images/Samina%20Headshot.jpeg",
      },
    },
  },
  {
    page: "brand",
    key: "brokerLogo",
    label: "Broker Image",
    description:
      "Your brokerage logo — shown on the open-house flyer header band and anywhere the brokerage is identified. Transparent PNG looks cleanest on the navy band.",
    shape: {
      logo: {
        type: "image",
        label: "Broker Logo",
        crop: "free",
        help: "Transparent PNG recommended.",
        fallback: "/images/Remax%20Galaxy.png",
      },
    },
  },
  {
    page: "brand",
    key: "favicon",
    label: "Favicon",
    description:
      "The small icon shown in browser tabs and bookmarks. Defaults to the realtor image — pick something simpler (a logo or initial) if you want a cleaner tab mark.",
    shape: {
      icon: {
        type: "image",
        label: "Favicon",
        crop: "square",
        previewShape: "circle",
        help: "Square crop, shown in browser tabs as a circle.",
        fallback: "/images/Samina%20Headshot.jpeg",
      },
    },
  },
  {
    page: "brand",
    key: "featuredImage",
    label: "Site Featured Image",
    description:
      "The image shown when your site or a page is shared on social media (link previews on Facebook, Instagram, iMessage, etc.). Open-house listings use their hero photo automatically; this is the default everywhere else.",
    shape: {
      image: {
        type: "image",
        label: "Featured Image",
        crop: "wide",
        help: "Wide aspect (16:9 or 1.91:1). Used as the default OpenGraph share image.",
        fallback:
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=85",
      },
    },
  },

  // ───────────────────────────── HOME ─────────────────────────────
  {
    page: "home",
    key: "hero",
    label: "Hero",
    description: "The big opening section with title, video, and stats.",
    shape: {
      ...heroFields,
      backgroundVideo: {
        type: "video",
        label: "Background Video",
        help:
          "A YouTube video set to autoplay, mute, and loop. Add YouTube videos in the Media Library first, then pick one here. Leave blank to use the default mp4 sea-turtle clip.",
      },
      ctas: {
        type: "array",
        label: "Buttons",
        itemShape: {
          ...ctaShape,
          style: { type: "text", label: "Style", help: "'glass' or 'outline'" },
        },
        itemTitleField: "label",
        itemNoun: "Button",
      },
      stats: {
        type: "array",
        label: "Stats",
        itemShape: {
          value: { type: "text", label: "Value (number)", help: "e.g. 5.0 or 42" },
          decimals: { type: "text", label: "Decimals", help: "e.g. 1 for 5.0; leave blank for whole" },
          prefix: { type: "text", label: "Prefix", help: "e.g. $" },
          suffix: { type: "text", label: "Suffix", help: "e.g. ★ or +" },
          label: { type: "text", label: "Label" },
        },
        itemTitleField: "label",
        itemNoun: "Stat",
      },
    },
  },
  {
    page: "home",
    key: "meet",
    label: "Meet Samina",
    description: "Intro section with portrait + bio paragraphs + pull quote.",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "paragraph", label: "Heading", rows: 2 },
      body: { type: "list", itemType: "paragraph", label: "Body Paragraphs" },
      quote: { type: "paragraph", label: "Pull Quote", rows: 3 },
      cta: { type: "object", label: "Button", shape: ctaShape },
    },
  },
  {
    page: "home",
    key: "services",
    label: "Three Ways I Help",
    description: "The three service cards (Buying, Selling, Path to Ownership).",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      cards: {
        type: "array",
        label: "Cards",
        itemShape: {
          title: { type: "text", label: "Title" },
          body: { type: "paragraph", label: "Body", rows: 4 },
          cta: { type: "text", label: "CTA Label" },
          href: { type: "url", label: "Link URL" },
          image: {
            type: "image",
            label: "Card Photo",
            crop: "portrait",
            help: "The photo behind this service card.",
          },
        },
        itemTitleField: "title",
        itemNoun: "Card",
      },
    },
  },
  {
    page: "home",
    key: "communities",
    label: "Communities Intro",
    description: "Heading text above the 6-neighborhood grid.",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      subtitle: { type: "paragraph", label: "Subtitle", rows: 3 },
    },
  },
  {
    page: "home",
    key: "pathTeaser",
    label: "Path to Ownership Teaser",
    description: "Short pitch block linking to the full Path page.",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      body: { type: "paragraph", label: "Body", rows: 4 },
      cta: { type: "object", label: "Button", shape: ctaShape },
      backgroundImage: {
        type: "image",
        label: "Background Photo",
        crop: "wide",
        fallback:
          "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&auto=format&fit=crop&q=85",
      },
    },
  },
  {
    page: "home",
    key: "closingsTeaser",
    label: "Recent Closings Teaser",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      subtitle: { type: "paragraph", label: "Subtitle", rows: 2 },
      cta: { type: "object", label: "Button", shape: ctaShape },
    },
  },
  {
    page: "home",
    key: "reviews",
    label: "Reviews Strip",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      backgroundImage: {
        type: "image",
        label: "Faded Background Photo",
        crop: "wide",
        fallback:
          "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1920&auto=format&fit=crop&q=85",
        help: "Subtle background photo at 8% opacity behind the testimonials.",
      },
    },
  },
  {
    page: "home",
    key: "darkBreak1",
    label: "Dark Break Divider 1",
    description:
      "First dark photo strip on the homepage — between Meet Samina and the service cards.",
    shape: makeDarkBreakShape({
      fallbackBg:
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&auto=format&fit=crop&q=85",
      defaultEyebrow: "What Clients Say Most",
      defaultQuote:
        "She makes the process feel calm — exactly what you want when you're making the biggest decision of your life.",
      defaultAttribution: "Repeat client · Google Review",
    }),
  },
  {
    page: "home",
    key: "darkBreak2",
    label: "Dark Break Divider 2",
    description:
      "Second dark photo strip on the homepage — between Recent Closings and the Reviews strip.",
    shape: makeDarkBreakShape({
      fallbackBg:
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&auto=format&fit=crop&q=85",
      defaultEyebrow: "Why I Do This Work",
      defaultQuote:
        "Real estate is the most important purchase most people make. It deserves a Realtor who treats it that way.",
      defaultAttribution: "Samina",
    }),
  },
  {
    page: "home",
    key: "signOff",
    label: "Sign-Off Line",
    description: "The final line at the bottom of the homepage.",
    shape: {
      text: { type: "text", label: "Text" },
    },
  },

  // ───────────────────────────── ABOUT ─────────────────────────────
  {
    page: "about",
    key: "hero",
    label: "Hero",
    description:
      "About-page hero. Defaults to your portrait — pick a different image for a non-portrait cover.",
    // The current default is the portrait — use it as the fallback so the
    // picker matches what's on the live site.
    shape: makeHeroFields("/images/Samina%20Headshot.jpeg"),
  },
  {
    page: "about",
    key: "bio",
    label: "Bio Paragraphs",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      paragraphs: { type: "list", itemType: "paragraph", label: "Paragraphs" },
    },
  },
  {
    page: "about",
    key: "practiceAreas",
    label: "Practice Areas",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      cards: {
        type: "array",
        label: "Cards",
        itemShape: {
          h: { type: "text", label: "Heading" },
          p: { type: "paragraph", label: "Body", rows: 4 },
        },
        itemTitleField: "h",
        itemNoun: "Card",
      },
    },
  },
  {
    page: "about",
    key: "credentials",
    label: "Credentials",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      items: {
        type: "array",
        label: "Items",
        itemShape: {
          label: { type: "text", label: "Label" },
          value: { type: "text", label: "Value" },
        },
        itemTitleField: "label",
        itemNoun: "Credential",
      },
    },
  },
  {
    page: "about",
    key: "cta",
    label: "Closing CTA",
    shape: makeCtaWithSecondaryShape(
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&auto=format&fit=crop&q=85",
    ),
  },
  {
    page: "about",
    key: "darkBreak",
    label: "Dark Break Divider",
    description:
      "The photo strip between the practice areas and credentials sections.",
    shape: makeDarkBreakShape({
      fallbackBg:
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&auto=format&fit=crop&q=85",
      defaultEyebrow: "What Stays With Clients",
      defaultQuote: "Trust is built one home at a time.",
    }),
  },

  // ───────────────────────────── BUYERS ─────────────────────────────
  {
    page: "buyers",
    key: "hero",
    label: "Hero",
    shape: makeHeroFields(
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&auto=format&fit=crop&q=85",
    ),
  },
  {
    page: "buyers",
    key: "why",
    label: "Why a Buyer's Agent Matters",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      cards: {
        type: "array",
        label: "Cards",
        itemShape: {
          h: { type: "text", label: "Heading" },
          p: { type: "paragraph", label: "Body", rows: 4 },
        },
        itemTitleField: "h",
        itemNoun: "Card",
      },
    },
  },
  {
    page: "buyers",
    key: "process",
    label: "The Process (Steps)",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      steps: {
        type: "array",
        label: "Steps",
        itemShape: {
          n: { type: "text", label: "Number", help: '"01", "02", etc.' },
          h: { type: "text", label: "Heading" },
          p: { type: "paragraph", label: "Body", rows: 4 },
        },
        itemTitleField: "h",
        itemNoun: "Step",
      },
    },
  },
  {
    page: "buyers",
    key: "financing",
    label: "Financing",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      lead: { type: "paragraph", label: "Lead Paragraph", rows: 4 },
      cards: {
        type: "array",
        label: "Loan Programs",
        itemShape: {
          h: { type: "text", label: "Heading" },
          p: { type: "paragraph", label: "Body", rows: 4 },
        },
        itemTitleField: "h",
        itemNoun: "Program",
      },
    },
  },
  {
    page: "buyers",
    key: "firstTimeCallout",
    label: "First-Time Buyers Callout",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      body: { type: "paragraph", label: "Body", rows: 4 },
      cta: { type: "object", label: "Button", shape: ctaShape },
    },
  },
  {
    page: "buyers",
    key: "cta",
    label: "Closing CTA",
    shape: makeCtaShape(
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1920&auto=format&fit=crop&q=85",
    ),
  },
  {
    page: "buyers",
    key: "darkBreak",
    label: "Dark Break Divider",
    description: "Photo strip between the process steps and the financing section.",
    shape: makeDarkBreakShape({
      fallbackBg:
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&auto=format&fit=crop&q=85",
      defaultEyebrow: "Between Steps",
      defaultQuote: "A house isn't a home until it fits your life.",
    }),
  },

  // ───────────────────────────── SELLERS ─────────────────────────────
  {
    page: "sellers",
    key: "hero",
    label: "Hero",
    shape: makeHeroFields(
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1920&auto=format&fit=crop&q=85",
    ),
  },
  {
    page: "sellers",
    key: "why",
    label: "Why List With Me",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      cards: {
        type: "array",
        label: "Cards",
        itemShape: {
          h: { type: "text", label: "Heading" },
          p: { type: "paragraph", label: "Body", rows: 4 },
        },
        itemTitleField: "h",
        itemNoun: "Card",
      },
    },
  },
  {
    page: "sellers",
    key: "process",
    label: "The Process (Steps)",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      steps: {
        type: "array",
        label: "Steps",
        itemShape: {
          n: { type: "text", label: "Number" },
          h: { type: "text", label: "Heading" },
          p: { type: "paragraph", label: "Body", rows: 4 },
        },
        itemTitleField: "h",
        itemNoun: "Step",
      },
    },
  },
  {
    page: "sellers",
    key: "pricing",
    label: "Pricing Strategy",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      paragraphs: { type: "list", itemType: "paragraph", label: "Paragraphs" },
    },
  },
  {
    page: "sellers",
    key: "valuation",
    label: "Valuation Form",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      placeholders: {
        type: "object",
        label: "Form Placeholders",
        shape: {
          address: { type: "text", label: "Address Placeholder" },
          notes: { type: "text", label: "Notes Placeholder" },
        },
      },
      submit: { type: "text", label: "Submit Button Label" },
      response: { type: "text", label: "Response Note" },
    },
  },
  {
    page: "sellers",
    key: "cta",
    label: "Closing CTA",
    shape: makeCtaShape(
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1920&auto=format&fit=crop&q=85",
    ),
  },
  {
    page: "sellers",
    key: "darkBreak",
    label: "Dark Break Divider 1",
    description: "Photo strip between process and pricing strategy.",
    shape: makeDarkBreakShape({
      fallbackBg:
        "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1920&auto=format&fit=crop&q=85",
      defaultEyebrow: "Pricing & Marketing",
      defaultQuote: "The first fourteen days are everything.",
    }),
  },
  {
    page: "sellers",
    key: "darkBreak2",
    label: "Dark Break Divider 2",
    description:
      "Photo-only strip between the pricing strategy and the valuation form. No copy by default — just a transitional photo.",
    shape: makeDarkBreakShape({
      fallbackBg:
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&auto=format&fit=crop&q=85",
    }),
  },

  // ───────────────────────────── PATH ─────────────────────────────
  {
    page: "path",
    key: "hero",
    label: "Hero",
    shape: makeHeroFields(
      "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&auto=format&fit=crop&q=85",
    ),
  },
  {
    page: "path",
    key: "truth",
    label: "The Truth Section",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      body: { type: "paragraph", label: "Body", rows: 4 },
    },
  },
  {
    page: "path",
    key: "steps",
    label: "Steps (Discover → Close)",
    shape: {
      items: {
        type: "array",
        label: "Steps",
        itemShape: {
          n: { type: "text", label: "Number" },
          title: { type: "text", label: "Title" },
          body: { type: "paragraph", label: "Body", rows: 4 },
        },
        itemTitleField: "title",
        itemNoun: "Step",
      },
    },
  },
  {
    page: "path",
    key: "stats",
    label: "Stats Strip",
    shape: {
      items: {
        type: "array",
        label: "Stats",
        itemShape: {
          to: { type: "text", label: "Number" },
          prefix: { type: "text", label: "Prefix" },
          suffix: { type: "text", label: "Suffix" },
          label: { type: "text", label: "Label" },
        },
        itemTitleField: "label",
        itemNoun: "Stat",
      },
    },
  },
  {
    page: "path",
    key: "forWho",
    label: "Who It's For",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      lines: { type: "list", itemType: "text", label: "Bullet Lines" },
    },
  },
  {
    page: "path",
    key: "faqs",
    label: "FAQs",
    shape: {
      items: {
        type: "array",
        label: "Questions",
        itemShape: {
          q: { type: "text", label: "Question" },
          a: { type: "paragraph", label: "Answer", rows: 4 },
        },
        itemTitleField: "q",
        itemNoun: "FAQ",
      },
    },
  },
  {
    page: "path",
    key: "cta",
    label: "Closing CTA",
    shape: makeCtaShape(
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1920&auto=format&fit=crop&q=85",
    ),
  },
  {
    page: "path",
    key: "darkBreak",
    label: "Dark Break Divider",
    description: "Photo strip between Who-It's-For and the FAQ.",
    shape: makeDarkBreakShape({
      fallbackBg:
        "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&auto=format&fit=crop&q=85",
      defaultEyebrow: "The Plan",
      defaultQuote: "A real closing date, not a fantasy.",
    }),
  },
  {
    page: "path",
    key: "stepImages",
    label: "Step Photos (4)",
    description:
      "Background photos for the 4 sticky-stack cards on the Path-to-Ownership page (Discover · Prepare · Shop · Close).",
    shape: {
      step1: {
        type: "image",
        label: "Step 01 — Discover",
        crop: "wide",
        fallback:
          "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1920&auto=format&fit=crop&q=85",
      },
      step2: {
        type: "image",
        label: "Step 02 — Prepare",
        crop: "wide",
        fallback:
          "https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=1920&auto=format&fit=crop&q=85",
      },
      step3: {
        type: "image",
        label: "Step 03 — Shop",
        crop: "wide",
        fallback:
          "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&auto=format&fit=crop&q=85",
      },
      step4: {
        type: "image",
        label: "Step 04 — Close",
        crop: "wide",
        fallback:
          "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1920&auto=format&fit=crop&q=85",
      },
    },
  },

  // ───────────────────────────── PARTNERS ─────────────────────────────
  {
    page: "partners",
    key: "hero",
    label: "Hero",
    shape: makeHeroFields(
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1920&auto=format&fit=crop&q=85",
    ),
  },
  {
    page: "partners",
    key: "intro",
    label: "Intro Body",
    shape: {
      body: { type: "paragraph", label: "Intro Paragraph", rows: 4 },
    },
  },
  {
    page: "partners",
    key: "disclaimer",
    label: "Disclaimer",
    shape: {
      text: { type: "paragraph", label: "Disclaimer Text", rows: 3 },
    },
  },
  {
    page: "partners",
    key: "cta",
    label: "Closing CTA",
    shape: makeCtaShape(
      "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&auto=format&fit=crop&q=85",
    ),
  },
  {
    page: "partners",
    key: "darkBreak",
    label: "Dark Break Divider",
    description: "Photo strip between the partner grid and the disclaimer.",
    shape: makeDarkBreakShape({
      fallbackBg:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1920&auto=format&fit=crop&q=85",
    }),
  },

  // ───────────────────────────── COMMUNITIES PAGE ─────────────────────────────
  {
    page: "communities",
    key: "hero",
    label: "Hero",
    shape: makeHeroFields(
      "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=1920&auto=format&fit=crop&q=85",
    ),
  },
  {
    page: "communities",
    key: "tableIntro",
    label: "Comparison Table Intro",
    description:
      "Heading above the side-by-side market comparison table on /communities.",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
      subtitle: { type: "paragraph", label: "Subtitle", rows: 3 },
      sourceNote: {
        type: "text",
        label: "Source Note",
        help: "The italic line under the table.",
      },
    },
  },
  {
    page: "communities",
    key: "darkBreak",
    label: "Dark Break Divider",
    shape: makeDarkBreakShape({
      fallbackBg:
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&auto=format&fit=crop&q=85",
      defaultEyebrow: "Six Neighborhoods, One Realtor",
      defaultQuote: "Local matters.",
    }),
  },

  // ───────────────────────────── CLOSINGS PAGE ─────────────────────────────
  {
    page: "closings",
    key: "hero",
    label: "Hero",
    shape: makeHeroFields(
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&auto=format&fit=crop&q=85",
    ),
  },

  // ───────────────────────────── REVIEWS PAGE ─────────────────────────────
  {
    page: "reviews",
    key: "hero",
    label: "Hero",
    shape: makeHeroFields(
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1920&auto=format&fit=crop&q=85",
    ),
  },
  {
    page: "reviews",
    key: "cta",
    label: "Closing CTA",
    shape: makeCtaShape(
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1920&auto=format&fit=crop&q=85",
    ),
  },

  // ───────────────────────────── CONTACT ─────────────────────────────
  {
    page: "contact",
    key: "hero",
    label: "Hero",
    shape: makeHeroFields(
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&auto=format&fit=crop&q=85",
    ),
  },
  {
    page: "contact",
    key: "formIntro",
    label: "Form Intro",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
    },
  },
  {
    page: "contact",
    key: "detailsIntro",
    label: "Direct Contact Intro",
    shape: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "text", label: "Heading" },
    },
  },
  {
    page: "contact",
    key: "consent",
    label: "Consent Disclaimer",
    shape: {
      text: { type: "paragraph", label: "Consent Text", rows: 3 },
    },
  },
  {
    page: "contact",
    key: "submit",
    label: "Submit Button",
    shape: {
      label: { type: "text", label: "Button Label" },
    },
  },
];

// =============================================================================
// HELPERS
// =============================================================================

export function findSection(page: string, key: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.page === page && s.key === key);
}

export function sectionsForPage(page: PageKey): SectionDef[] {
  return SECTIONS.filter((s) => s.page === page);
}

/**
 * Compute the default JSON value for a section, sourced from `lib/content.ts`.
 *
 * The registry's section keys correspond directly to the nested object paths
 * in `defaults` — e.g. `home.hero` → `defaults.home.hero`.
 *
 * Sign-off and other primitives wrap as { text: ... } so the editor has a
 * consistent shape.
 */
export function defaultValueFor(section: SectionDef): unknown {
  const root = (defaults as Record<string, unknown>)[section.page];
  if (!root || typeof root !== "object") return {};
  const raw = (root as Record<string, unknown>)[section.key];

  // Special-cases where the registry shape wraps a primitive
  if (section.page === "home" && section.key === "signOff") {
    return { text: typeof raw === "string" ? raw : "" };
  }
  if (
    (section.page === "partners" && section.key === "disclaimer") ||
    (section.page === "contact" && section.key === "consent")
  ) {
    return { text: typeof raw === "string" ? raw : "" };
  }
  if (section.page === "contact" && section.key === "submit") {
    return { label: typeof raw === "string" ? raw : "" };
  }
  // Path "steps", "stats", "faqs" wrap an array under `items`
  if (
    section.page === "path" &&
    (section.key === "steps" || section.key === "stats" || section.key === "faqs")
  ) {
    return { items: Array.isArray(raw) ? raw : [] };
  }

  return raw ?? {};
}
