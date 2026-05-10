/**
 * Default copy for every page on the public site.
 *
 * This is what a NEW tenant sees before they (or the polish team)
 * customize anything via the admin panel. It's intentionally generic —
 * professional-realtor neutral, no specific names, brokerages, or
 * states baked in.
 *
 * Per-tenant identity is woven in via tokens:
 *
 *   {{realtor_name}}        → tenants.realtor_name (full name)
 *   {{realtor_first_name}}  → first word of tenants.realtor_name
 *   {{brokerage}}           → tenants.brokerage
 *   {{state_abbr}}          → tenants.state_abbr
 *
 * The token replacement happens in `lib/contentLoader.ts` on every
 * `getSection` / `getPageContent` call. So if a tenant hasn't yet
 * customized the "About" page, they still see "I'm Jenny Smith — a
 * Realtor with Compass" instead of placeholder garbage or Samina's
 * personal bio.
 *
 * Voice rules (kept neutral):
 *   • First person ("I help...") — warm, conversational.
 *   • Show care through restraint, never by saying it.
 *   • Avoid: "the best", "elite", "luxury", "exclusive", "hustle", "grind".
 *   • Don't make up credentials, license numbers, or testimonials.
 */

export const content = {
  // -------------------------------------------------------------------------
  // BRAND
  // -------------------------------------------------------------------------
  brand: {
    name: "{{realtor_name}}",
    role: "Realtor",
    brokerage: "{{brokerage}}",
    tagline: "Make Yourself at Home",
    serviceArea: "Your Local Market",
    languages: [],
  },

  // -------------------------------------------------------------------------
  // HOMEPAGE
  // -------------------------------------------------------------------------
  home: {
    hero: {
      eyebrow: "Real Estate, Done Right",
      titleLines: ["Make Yourself", "at Home"],
      subtitle:
        "Boutique real estate guidance — with {{realtor_name}}, {{brokerage}}.",
      ctas: [
        { label: "Explore Communities", href: "/communities", style: "glass" },
        { label: "Path to Ownership", href: "/path-to-ownership", style: "outline" },
      ],
      stats: [
        { value: 5.0, decimals: 1, suffix: "★", label: "Client Reviews" },
        { value: 0, suffix: "+", label: "Five-Star Client Reviews" },
        { value: 1, label: "State Licensed" },
      ],
    },

    // The "Meet [Realtor]" intro section with portrait
    meet: {
      eyebrow: "Meet {{realtor_first_name}}",
      heading:
        "A boutique approach to one of the biggest decisions you'll ever make.",
      body: [
        "I'm {{realtor_name}} — a Realtor with {{brokerage}}. I work with first-time buyers, growing families, and clients relocating into the area.",
        "My approach is calm, transparent, and detail-oriented — because the home you buy or sell shapes the next chapter of your life.",
      ],
      quote:
        "I treat every client the way I'd want to be treated — with patience, clarity, and a real plan.",
      cta: { label: "About {{realtor_first_name}}", href: "/about" },
    },

    // The three-card services section
    services: {
      eyebrow: "How I Work With Clients",
      heading: "Three ways I help.",
      cards: [
        {
          title: "Buying",
          body: "First home or fifth — I help you find one that actually fits your timing, your budget, and your life. Showings on your schedule, offers structured to win.",
          cta: "Buying with {{realtor_first_name}}",
          href: "/buyers",
          imageKey: "buy",
        },
        {
          title: "Selling",
          body: "Pricing it right is everything. I walk your home in person, review real comps in person, and tell you the honest price — not the highest number. Then I market it like it deserves.",
          cta: "Selling with {{realtor_first_name}}",
          href: "/sellers",
          imageKey: "sell",
        },
        {
          title: "Path to Ownership",
          body: "Renting now, not sure when buying becomes possible? I help you build a real 12-to-24 month plan that ends with keys in your hand. No pressure. No cost to start.",
          cta: "Start Your Path",
          href: "/path-to-ownership",
          imageKey: "path",
        },
      ],
    },

    // The communities grid section
    communities: {
      eyebrow: "Where I Work Most",
      heading: "Neighborhoods I know especially well.",
      subtitle:
        "Real market data, written by someone who works these streets every week. (Happy to help you anywhere in the area — these are just the ones I'm asked about most.)",
    },

    // The Path to Ownership teaser
    pathTeaser: {
      eyebrow: "A Program for Renters",
      heading: "From renting to owning, in 12 to 24 months.",
      body: "Most renters believe owning a home is years — or a lifetime — away. With the right plan, most are 12 to 24 months from closing on their first. My Path to Ownership process is built to get you there. No pressure. No guesswork. No cost to start.",
      cta: { label: "Learn More", href: "/path-to-ownership" },
    },

    // The Recent Closings teaser
    closingsTeaser: {
      eyebrow: "Recent Sales",
      heading: "Recent closings.",
      subtitle:
        "A glimpse at homes I've helped families buy and sell.",
      cta: { label: "See All Closings", href: "/closings" },
    },

    // The Reviews strip
    reviews: {
      eyebrow: "What Clients Say",
      heading: "In their words.",
    },

    // Final closing line at the bottom of the page
    signOff: "Make yourself at home.",
  },

  // -------------------------------------------------------------------------
  // ABOUT PAGE
  // -------------------------------------------------------------------------
  about: {
    hero: {
      eyebrow: "Realtor",
      titleLines: ["{{realtor_name}}"],
      subtitle: "A boutique approach to one of the biggest decisions you'll make.",
    },
    bio: {
      eyebrow: "A Note From {{realtor_first_name}}",
      paragraphs: [
        "I'm a Realtor with {{brokerage}}. I work primarily with first-time buyers, growing families, and clients relocating into the area.",
        "My approach to real estate is calm, transparent, and detail-oriented. Buying or selling a home shapes the next chapter of your life — it deserves a Realtor who treats it that way.",
        "Beyond traditional buy-and-sell representation, I run a dedicated Path to Ownership process for renters who want to become owners. Turning what can feel impossible into a 12-to-24-month plan with a real closing date.",
      ],
    },
    practiceAreas: {
      eyebrow: "Practice Areas",
      heading: "What I do.",
      cards: [
        {
          h: "Buyer Representation",
          p: "From pre-approval to keys. Showings, offers, inspections, negotiation — handled, so you can focus on what's next.",
        },
        {
          h: "Listing & Selling",
          p: "Pricing strategy, staging guidance, professional marketing, and offers structured to actually close — not just to hit a high number on paper.",
        },
        {
          h: "Path to Ownership",
          p: "A guided 12-to-24-month process for renters preparing to buy. Free consultation, lender introductions, and a real plan with a closing date.",
        },
      ],
    },
    credentials: {
      eyebrow: "Credentials",
      heading: "Licensed and affiliated.",
      items: [
        { label: "Brokerage", value: "{{brokerage}} · Associate" },
        { label: "License", value: "[License # — add via admin]" },
        { label: "Languages", value: "English" },
        { label: "Service Area", value: "Local market · ask for specifics" },
      ],
    },
    cta: {
      heading: "Let's find yours.",
      body: "Whether you're buying your first or your fifth, listing or just exploring, start with a 30-minute conversation. No pressure. No cost.",
      primary: { label: "Schedule a Call", href: "/contact" },
      secondary: { label: "Explore Communities", href: "/communities" },
    },
  },

  // -------------------------------------------------------------------------
  // BUYERS PAGE
  // -------------------------------------------------------------------------
  buyers: {
    hero: {
      eyebrow: "For Buyers",
      titleLines: ["Buying Your", "Next Home"],
      subtitle: "First or fifth — I make the process feel calm.",
    },
    why: {
      eyebrow: "Why a Buyer's Agent Matters",
      heading: "What you actually get.",
      cards: [
        {
          h: "Calm through the process",
          p: "House-hunting can feel relentless. My job is to remove the noise — bring you the right showings, give honest opinions on each home, and tell you when something is and isn't worth pursuing.",
        },
        {
          h: "Local market intelligence",
          p: "I live and work in this market. I know which streets matter, which schools are rezoning, which builders cut corners, and what your offer actually needs to win in your target neighborhood.",
        },
        {
          h: "A vetted network",
          p: "Lender introductions, inspectors who don't miss things, contractors who pick up the phone, settlement attorneys who close on time. My network becomes yours.",
        },
      ],
    },
    process: {
      eyebrow: "The Process",
      heading: "Six steps from search to keys.",
      steps: [
        {
          n: "01",
          h: "Pre-Approval",
          p: "I introduce you to two or three lenders so you can compare rates and programs. Pre-approval before you start shopping — sellers won't take you seriously without it.",
        },
        {
          n: "02",
          h: "Hunt",
          p: "Curated listings, showings on your schedule, honest opinions on every house. I filter out the wrong ones so you only spend time on the right ones.",
        },
        {
          n: "03",
          h: "Offer",
          p: "Comps reviewed, terms structured, offer written to win without overpaying. Every line of the contract is handled — escalation clauses, contingencies, timelines, all of it.",
        },
        {
          n: "04",
          h: "Inspection",
          p: "A trusted inspector walks the home with you. I then negotiate repair credits, price reductions, or seller concessions based on what's found.",
        },
        {
          n: "05",
          h: "Appraisal & Underwriting",
          p: "The lender's team verifies value and finalizes your loan. If the appraisal comes in low, I handle the negotiation. If underwriting needs documents, I keep it moving.",
        },
        {
          n: "06",
          h: "Closing",
          p: "Final walk-through, document signing, keys in your hand. Closing usually runs 60 to 90 minutes. You leave a homeowner.",
        },
      ],
    },
    financing: {
      eyebrow: "Financing",
      heading: "Loan programs worth knowing.",
      lead: "I work with local lenders fluent in every product on this list. Picking the wrong loan can cost you tens of thousands over the life of the mortgage — picking the right one can save the same.",
      cards: [
        {
          h: "Conventional",
          p: "3–20% down, best for buyers with strong credit and stable income. Most flexible loan type, no upfront mortgage insurance over 20% down.",
        },
        {
          h: "FHA",
          p: "As little as 3.5% down, friendlier credit requirements. Excellent for first-time buyers or anyone rebuilding credit.",
        },
        {
          h: "VA",
          p: "0% down, no PMI, competitive rates — for active-duty service members, veterans, and qualifying surviving spouses. One of the strongest loan products available.",
        },
        {
          h: "Down-Payment Assistance",
          p: "Many states run grant and second-lien programs. I'll match your situation to the right one — many buyers leave thousands on the table by not asking.",
        },
      ],
    },
    firstTimeCallout: {
      eyebrow: "Renters & First-Time Buyers",
      heading: "Not quite ready? Build the path.",
      body: "If you're renting now and not sure when ownership becomes possible, my Path to Ownership program is a guided 12-to-24-month plan that ends at the closing table.",
      cta: { label: "Explore the Path", href: "/path-to-ownership" },
    },
    cta: {
      heading: "Ready when you are.",
      body: "Start with a 30-minute conversation. Whether you're 30 days from shopping or 18 months out — that's when I'm most useful.",
      primary: { label: "Schedule a Call", href: "/contact" },
    },
  },

  // -------------------------------------------------------------------------
  // SELLERS PAGE
  // -------------------------------------------------------------------------
  sellers: {
    hero: {
      eyebrow: "For Sellers",
      titleLines: ["Selling Your", "Home"],
      subtitle: "Real pricing, real marketing, real negotiation.",
    },
    why: {
      eyebrow: "Why List With Me",
      heading: "What you actually get.",
      cards: [
        {
          h: "Honest pricing",
          p: "Real comps, walked in person — not algorithm guesses. I'll tell you what your home is actually worth today, not the highest number that gets your hopes up.",
        },
        {
          h: "Marketing that gets shown",
          p: "Professional photography, social, MLS, and the {{brokerage}} network. Your home is staged, shot, written, and placed in front of qualified buyers — not just listed.",
        },
        {
          h: "Negotiation that protects you",
          p: "Every offer reviewed line-by-line. Contingencies handled cleanly, terms structured to actually close — not just to hit a high number on paper that falls apart at appraisal.",
        },
      ],
    },
    process: {
      eyebrow: "The Process",
      heading: "Six steps to sold.",
      steps: [
        {
          n: "01",
          h: "Valuation",
          p: "I walk the property, review comps in person, and give you an honest pricing range. Not a Zestimate — a real number based on what your home actually is.",
        },
        {
          n: "02",
          h: "Pricing Strategy",
          p: "Together we set a list price calibrated to your timeline. Aggressive for speed, anchored for value — the strategy depends on you, not on a one-size-fits-all rule.",
        },
        {
          n: "03",
          h: "Prep & Stage",
          p: "Light staging recommendations, professional photography, drone exterior shots where appropriate, and a written listing description that actually reads.",
        },
        {
          n: "04",
          h: "Launch & Market",
          p: "MLS, broker network, social campaigns, broker open house. The first 14 days are everything — I make them count.",
        },
        {
          n: "05",
          h: "Negotiate Offers",
          p: "Every offer reviewed line-by-line. Price, contingencies, financing, timing. I lay out the trade-offs so you make the call with full information.",
        },
        {
          n: "06",
          h: "Close",
          p: "Inspection responses, appraisal, title, attorney coordination — I run the closing process so you can focus on the move.",
        },
      ],
    },
    pricing: {
      eyebrow: "Pricing Strategy",
      heading: "Price right. Sell right.",
      paragraphs: [
        "The single biggest mistake sellers make is overpricing on day one. The market punishes mispriced listings — homes that sit longer than 21 days statistically sell for less than comparable homes priced correctly out of the gate.",
        "My job isn't to tell you the highest possible number — it's to tell you the right number for your timeline. That honesty is why my clients trust me with the next listing too.",
      ],
    },
    valuation: {
      eyebrow: "Request a Valuation",
      heading: "Tell me about your home.",
      placeholders: {
        address: "Your home address",
        notes: "Recent renovations, timing, special features, etc.",
      },
      submit: "Get My Valuation",
      response: "Typical response time: within 24 hours.",
    },
    cta: {
      heading: "Let's talk numbers.",
      body: "A 30-minute conversation. No commitment. You leave knowing what your home is worth and what it would take to sell it well.",
      primary: { label: "Schedule a Consult", href: "/contact" },
    },
  },

  // -------------------------------------------------------------------------
  // PATH TO OWNERSHIP PAGE
  // -------------------------------------------------------------------------
  path: {
    hero: {
      eyebrow: "A Program for Renters",
      titleLines: ["Path to", "Ownership"],
      subtitle:
        "A guided 12-to-24-month plan to take you from renting to closing. No pressure. No guesswork. No cost to start.",
    },
    truth: {
      eyebrow: "The Truth",
      heading: "You're closer than you think.",
      body: "Most renters believe homeownership is years — or a lifetime — away. With the right plan, most are 12 to 24 months from closing on their first home.",
    },
    steps: [
      {
        n: "01",
        title: "Discover",
        body: "A free, confidential 30-minute consultation. We look at your income, savings, credit, and goals together. You leave knowing exactly where you stand.",
      },
      {
        n: "02",
        title: "Prepare",
        body: "A custom 6-to-18-month plan. Credit improvements, down-payment savings, lender introductions, and the right loan program for you (FHA, VA, conventional, first-time buyer grants).",
      },
      {
        n: "03",
        title: "Shop",
        body: "When you're mortgage-ready, we hit the market. Showings on your schedule, neighborhoods that fit your life, and offers that actually win.",
      },
      {
        n: "04",
        title: "Close",
        body: "Inspections, appraisal, negotiation, paperwork. You get the keys. You make yourself at home.",
      },
    ],
    stats: [
      { to: 0, prefix: "$", label: "What you pay me to start" },
      { to: 24, prefix: "12–", label: "Months from first call to closing" },
      { to: 1, label: "State licensed" },
    ],
    forWho: {
      eyebrow: "Who It's For",
      heading: "Built for real people.",
      lines: [
        "Renters tired of the rent-increase cycle",
        "First-generation buyers in your family",
        "VA-loan-eligible service members and veterans",
        "Couples planning ahead before a wedding, baby, or move",
        "Anyone who's been told 'no' by a bank and isn't sure why",
      ],
    },
    faqs: [
      {
        q: "Will this affect my credit?",
        a: "No — exploring the program does nothing to your credit. We don't pull anything until you're formally applying for a mortgage.",
      },
      {
        q: "Do I need a minimum income?",
        a: "There's no fixed minimum. What matters more is your debt-to-income ratio, employment stability, and savings runway. We'll review all of it together.",
      },
      {
        q: "I have student loans or past credit issues.",
        a: "Tell me. I work with lenders who specialize in your exact situation — including FHA, VA, USDA, and first-time-buyer grant programs that exist for a reason.",
      },
      {
        q: "Is this a 'rent-to-own' lease?",
        a: "No — this is a real path to a real mortgage. No rent premium, no lease-option contract, no risk of losing your money. You stay in your current rental until you're ready to buy.",
      },
      {
        q: "What does it cost me?",
        a: "Nothing. Buyer representation in real estate is paid by the seller at closing — that's how the industry works. The consultation, the planning, the lender intros — all free.",
      },
      {
        q: "How long does it actually take?",
        a: "It depends on where you're starting. Some people are mortgage-ready in 90 days. Most take 12–18 months. A few need a full 24. We'll know after our first conversation.",
      },
    ],
    cta: {
      heading: "Take the first step. It's free.",
      body: "Schedule a 30-minute, no-pressure conversation.",
      primary: { label: "Book My Consult", href: "/contact" },
    },
  },

  // -------------------------------------------------------------------------
  // PARTNERS PAGE
  // -------------------------------------------------------------------------
  partners: {
    hero: {
      eyebrow: "My Trusted Network",
      titleLines: ["The People I", "Work With"],
      subtitle:
        "Real estate is a team sport. These are the lenders, inspectors, insurers, and trades I trust enough to put my own clients in front of.",
    },
    intro: {
      body: "Below are the partners I introduce to clients. Each has been vetted over years of working together. None of these are paid placements — I refer them because they pick up the phone, do the work right, and treat my clients well.",
    },
    categories: [
      {
        title: "Lenders",
        body: "I always introduce buyers to two or three lenders so you can compare rates, programs, and personality fit. There's no kickback — I just want you with someone who answers their phone on a Saturday.",
        contacts: [],
      },
      {
        title: "Home Inspectors",
        body: "Inspection day is one of the most important days of your transaction. These inspectors take 2–3 hours, walk the home with you, and write reports that read like a person wrote them.",
        contacts: [],
      },
      {
        title: "Insurance",
        body: "Homeowners insurance is required at closing. These agents quote multiple carriers and won't try to upsell you on policies you don't need.",
        contacts: [],
      },
      {
        title: "Repairs & Renovations",
        body: "Pre-listing repairs, post-closing renovations, the punch-list of small things that show up after the inspection. These trades pick up the phone and do the work right.",
        contacts: [],
      },
      {
        title: "Settlement & Title",
        body: "Closing day runs through these attorneys and title companies. They close on time, communicate clearly, and don't surprise you with line items.",
        contacts: [],
      },
    ],
    disclaimer:
      "Contact information for each partner is shared with their permission. None of these referrals come with a fee, kickback, or any compensation to me. Every introduction is based on years of working together and consistent client experience.",
    cta: {
      heading: "Need an introduction?",
      body: "If you're working with me on a buy, sell, or Path to Ownership, I'll make these introductions personally — in writing, on a call, or over coffee, whichever you prefer.",
      primary: { label: "Get in Touch", href: "/contact" },
    },
  },

  // -------------------------------------------------------------------------
  // CONTACT PAGE
  // -------------------------------------------------------------------------
  contact: {
    hero: {
      eyebrow: "Get in Touch",
      titleLines: ["Let's Talk"],
      subtitle: "A 30-minute conversation. No pressure. No cost.",
    },
    formIntro: {
      eyebrow: "Send a Message",
      heading: "Tell me what you need.",
    },
    detailsIntro: {
      eyebrow: "Direct Contact",
      heading: "{{realtor_name}} · Realtor",
    },
    consent:
      "I agree to be contacted by {{realtor_name}} via call, email, and text. Reply STOP to opt out at any time. Message and data rates may apply.",
    submit: "Submit",
  },

  // -------------------------------------------------------------------------
  // COMMUNITIES PAGE
  // -------------------------------------------------------------------------
  communities: {
    hero: {
      eyebrow: "Where I Work",
      titleLines: ["Communities"],
      subtitle:
        "Neighborhoods I know by street name, school zone, and sale price — with current market data, written by someone who works these streets every week.",
    },
    tableIntro: {
      eyebrow: "At a Glance",
      heading: "Side-by-Side Market Read",
      subtitle:
        "How my markets actually compare today. Sorted by YoY price change — biggest gainers first.",
      sourceNote: "Source: local MLS, updated monthly.",
    },
    // Optional dark-break section between table and grid. Empty defaults
    // so the page never crashes on a tenant without this admin-block set.
    darkBreak: {
      eyebrow: "",
      quote: "",
      attribution: "",
    },
  },

  // -------------------------------------------------------------------------
  // CLOSINGS PAGE
  // -------------------------------------------------------------------------
  closings: {
    hero: {
      eyebrow: "Recent Sales",
      titleLines: ["Recent", "Closings"],
      subtitle:
        "Every home below is one I personally represented at the closing table.",
    },
  },

  // -------------------------------------------------------------------------
  // REVIEWS PAGE
  // -------------------------------------------------------------------------
  reviews: {
    hero: {
      eyebrow: "What Clients Say",
      titleLines: ["In Their", "Words"],
      subtitle: "",
    },
    cta: {
      heading: "Be Next.",
      body: "Whether you're buying, selling, or planning ahead — start with a 30-minute conversation. No pressure. No cost.",
      primary: { label: "Schedule a Call", href: "/contact" },
    },
  },

  // -------------------------------------------------------------------------
  // SHARED CTA BLOCKS
  // -------------------------------------------------------------------------
  shared: {
    finalSignOff: "Make yourself at home.",
  },
};
