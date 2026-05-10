/**
 * SINGLE SOURCE OF TRUTH for every line of copy on the site.
 *
 * Want to change a headline, subhead, paragraph, eyebrow, CTA label, stat
 * label, FAQ answer, or footer line? Edit it HERE — every page that reads
 * from this file updates automatically.
 *
 * Voice rules (per Samina):
 *   • First person ("I help...") — warm, conversational, never self-claiming
 *     or boastful. No "the best", "elite", "luxury", "exclusive".
 *   • Show luxury through restraint, never by saying it.
 *   • Avoid: hustle, grind, hot deals, let's get it.
 *   • Never call the Path to Ownership program "rent-to-own" or
 *     "credit repair" — both are different (and risky) categories.
 *   • Don't mention years licensed.
 *   • Don't mention Washington D.C. — service area is Virginia & Maryland only.
 *   • IT background — keep very subtle if at all.
 */

export const content = {
  // -------------------------------------------------------------------------
  // BRAND
  // -------------------------------------------------------------------------
  brand: {
    name: "Samina Bilal",
    role: "Realtor",
    brokerage: "RE/MAX Galaxy",
    tagline: "Make Yourself at Home",
    serviceArea: "Northern Virginia & Maryland",
    languages: ["English", "Urdu", "Hindi"],
  },

  // -------------------------------------------------------------------------
  // HOMEPAGE
  // -------------------------------------------------------------------------
  home: {
    hero: {
      eyebrow: "Northern Virginia · Maryland",
      titleLines: ["Make Yourself", "at Home"],
      subtitle:
        "Boutique real estate guidance across Virginia and Maryland — with Samina Bilal, RE/MAX Galaxy.",
      ctas: [
        { label: "Explore Communities", href: "/communities", style: "glass" },
        { label: "Path to Ownership", href: "/path-to-ownership", style: "outline" },
      ],
      stats: [
        { value: 5.0, decimals: 1, suffix: "★", label: "Across Zillow, Google & Realtor.com" },
        { value: 42, suffix: "+", label: "Five-Star Client Reviews" },
        { value: 2, label: "States Licensed (VA & MD)" },
      ],
    },

    // The "Meet Samina" intro section with portrait
    meet: {
      eyebrow: "Meet Samina",
      heading:
        "A boutique approach to one of the biggest decisions you'll ever make.",
      body: [
        "I'm Samina Bilal — a Realtor with RE/MAX Galaxy, based in Woodbridge and licensed in Virginia and Maryland. I work mostly with first-time buyers, growing families, and clients relocating to the area from out of state or out of country.",
        "I speak English, Urdu, and Hindi — which has become a quiet strength when working with clients whose families are involved in the decision.",
      ],
      quote:
        "I treat every client the way I'd want to be treated — with patience, clarity, and a real plan.",
      cta: { label: "About Samina", href: "/about" },
    },

    // The three-card services section (was "Three Ways In" — now clearer)
    services: {
      eyebrow: "How I Work With Clients",
      heading: "Three ways I help.",
      cards: [
        {
          title: "Buying",
          body: "First home or fifth — I help you find one that actually fits your timing, your budget, and your life. Showings on your schedule, offers structured to win.",
          cta: "Buying with Samina",
          href: "/buyers",
          imageKey: "buy",
        },
        {
          title: "Selling",
          body: "Pricing it right is everything. I walk your home in person, review real comps in person, and tell you the honest price — not the highest number. Then I market it like it deserves.",
          cta: "Selling with Samina",
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

    // The 6-community grid section
    communities: {
      eyebrow: "Where I Work Most",
      heading: "Six neighborhoods I know especially well.",
      subtitle:
        "Real 2026 market data, written by someone who works these streets every week. (Happy to help you anywhere across Northern Virginia and Maryland — these are just the ones I'm asked about most.)",
    },

    // The Path to Ownership teaser
    pathTeaser: {
      eyebrow: "A Program for Renters",
      heading: "From renting to owning, in 12 to 24 months.",
      body: "Most renters in Virginia and Maryland believe owning a home is years — or a lifetime — away. With the right plan, most are 12 to 24 months from closing on their first. My Path to Ownership process is built to get you there. No pressure. No guesswork. No cost to start.",
      cta: { label: "Learn More", href: "/path-to-ownership" },
    },

    // The Recent Closings teaser
    closingsTeaser: {
      eyebrow: "Sold by Samina",
      heading: "Recent closings.",
      subtitle:
        "A glimpse at homes I've helped families buy and sell across Northern Virginia.",
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
      eyebrow: "Realtor · Virginia & Maryland",
      titleLines: ["Samina Yunus", "Bilal"],
      subtitle: "A boutique approach to one of the biggest decisions you'll make.",
    },
    bio: {
      eyebrow: "A Note From Samina",
      paragraphs: [
        "I'm a Realtor with RE/MAX Galaxy, dual-licensed in Virginia and Maryland, based in Woodbridge. I work primarily with first-time buyers, growing families, and clients relocating into the area — locally, from other states, and from abroad.",
        "I speak English, Urdu, and Hindi. It's helped me serve families where the parents, in-laws, or extended family need to be part of the conversation — which, in my experience, is most of the time.",
        "Before real estate, I worked in IT — which taught me a healthy obsession with checking the small things, twice. I've carried that into how I handle inspections, contract review, and timelines.",
        "Beyond traditional buy-and-sell representation, I run a dedicated Path to Ownership process for renters who want to become owners. It's the work I find most meaningful — turning what can feel impossible into a 12-to-24-month plan with a real closing date at the end.",
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
        { label: "Brokerage", value: "RE/MAX Galaxy · Associate" },
        { label: "Virginia License", value: "#0225256757" },
        { label: "Maryland License", value: "#[license pending]" },
        { label: "Languages", value: "English · Urdu · Hindi" },
        { label: "Service Area", value: "Northern Virginia · Maryland" },
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
          p: "I live and work in Northern Virginia. I know which streets flood, which schools are rezoning, which builders cut corners, and what your offer actually needs to win in your target neighborhood.",
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
      lead: "I work with Virginia and Maryland lenders fluent in every product on this list. Picking the wrong loan can cost you tens of thousands over the life of the mortgage — picking the right one can save the same.",
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
          p: "Virginia and Maryland both run grant and second-lien programs. I'll match your situation to the right one — many buyers leave thousands on the table by not asking.",
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
          p: "Professional photography, social, MLS, and the global RE/MAX network. Your home is staged, shot, written, and placed in front of qualified buyers — not just listed.",
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
          p: "Bright MLS, RE/MAX network, social campaigns, broker open house. The first 14 days are everything — I make them count.",
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
        "The single biggest mistake sellers make is overpricing on day one. The Northern Virginia market punishes mispriced listings — homes that sit longer than 21 days statistically sell for less than comparable homes priced correctly out of the gate.",
        "My job isn't to tell you the highest possible number — it's to tell you the right number for your timeline. That honesty is why my clients trust me with the next listing too.",
      ],
    },
    valuation: {
      eyebrow: "Request a Valuation",
      heading: "Tell me about your home.",
      placeholders: {
        address: "1234 Main St, Woodbridge, VA 22192",
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
      body: "Most renters in Virginia and Maryland believe homeownership is years — or a lifetime — away. With the right plan, most are 12 to 24 months from closing on their first home.",
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
      { to: 2, label: "States — Virginia & Maryland" },
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
        a: "Nothing. Buyer representation in real estate is paid by the seller at closing — that's how the industry works in Virginia and Maryland. The consultation, the planning, the lender intros — all free.",
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
  // PARTNERS PAGE (NEW)
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
        contacts: [
          { name: "[Lender Partner Name]", role: "Senior Loan Officer", company: "[Lender Brand]", phone: "[(703) 555-0100]", email: "[name@lender.com]" },
          { name: "[Lender Partner Name]", role: "Branch Manager", company: "[Lender Brand]", phone: "[(703) 555-0101]", email: "[name@lender.com]" },
          { name: "[Lender Partner Name]", role: "VA & FHA Specialist", company: "[Lender Brand]", phone: "[(703) 555-0102]", email: "[name@lender.com]" },
        ],
      },
      {
        title: "Home Inspectors",
        body: "Inspection day is one of the most important days of your transaction. These inspectors take 2–3 hours, walk the home with you, and write reports that read like a person wrote them.",
        contacts: [
          { name: "[Inspector Name]", role: "Licensed Home Inspector", company: "[Inspection Company]", phone: "[(703) 555-0200]", email: "[name@inspector.com]" },
          { name: "[Inspector Name]", role: "Licensed Home Inspector", company: "[Inspection Company]", phone: "[(703) 555-0201]", email: "[name@inspector.com]" },
        ],
      },
      {
        title: "Insurance",
        body: "Homeowners insurance is required at closing. These agents quote multiple carriers and won't try to upsell you on policies you don't need.",
        contacts: [
          { name: "[Insurance Agent Name]", role: "Independent Insurance Agent", company: "[Agency]", phone: "[(703) 555-0300]", email: "[name@insurance.com]" },
          { name: "[Insurance Agent Name]", role: "Independent Insurance Agent", company: "[Agency]", phone: "[(703) 555-0301]", email: "[name@insurance.com]" },
        ],
      },
      {
        title: "Repairs & Renovations",
        body: "Pre-listing repairs, post-closing renovations, the punch-list of small things that show up after the inspection. These trades pick up the phone and do the work right.",
        contacts: [
          { name: "[Contractor Name]", role: "General Contractor", company: "[Company]", phone: "[(703) 555-0400]", email: "[name@contractor.com]" },
          { name: "[Specialist Name]", role: "Plumbing", company: "[Company]", phone: "[(703) 555-0401]", email: "[name@plumbing.com]" },
          { name: "[Specialist Name]", role: "HVAC", company: "[Company]", phone: "[(703) 555-0402]", email: "[name@hvac.com]" },
          { name: "[Specialist Name]", role: "Electrical", company: "[Company]", phone: "[(703) 555-0403]", email: "[name@electrical.com]" },
          { name: "[Specialist Name]", role: "Painting & Drywall", company: "[Company]", phone: "[(703) 555-0404]", email: "[name@painting.com]" },
        ],
      },
      {
        title: "Settlement & Title",
        body: "Closing day runs through these attorneys and title companies. They close on time, communicate clearly, and don't surprise you with line items.",
        contacts: [
          { name: "[Attorney Name]", role: "Settlement Attorney", company: "[Firm]", phone: "[(703) 555-0500]", email: "[name@firm.com]" },
        ],
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
      heading: "Samina Bilal · Realtor",
    },
    consent:
      "I agree to be contacted by Samina Bilal via call, email, and text. Reply STOP to opt out at any time. Message and data rates may apply.",
    submit: "Submit",
  },

  // -------------------------------------------------------------------------
  // COMMUNITIES PAGE — heading, table intro, dark break
  // -------------------------------------------------------------------------
  communities: {
    hero: {
      eyebrow: "The Six",
      titleLines: ["Communities"],
      subtitle:
        "Six neighborhoods I know by street name, school zone, and sale price — with real 2026 market data, written by someone who works these streets every week.",
    },
    tableIntro: {
      eyebrow: "2026 At a Glance",
      heading: "Side-by-Side Market Read",
      subtitle:
        "How the six markets actually compare today. Sorted by YoY price change — biggest gainers first.",
      sourceNote: "Source: Redfin, March 2026. Updated monthly.",
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
  // CLOSINGS PAGE — hero
  // -------------------------------------------------------------------------
  closings: {
    hero: {
      eyebrow: "Sold by Samina",
      titleLines: ["Recent", "Closings"],
      subtitle:
        "Every home below is one Samina personally represented at the closing table.",
    },
  },

  // -------------------------------------------------------------------------
  // REVIEWS PAGE — hero, CTA  (top-level key matches the `reviews` PageKey;
  // nested `home.reviews` is a different section — no collision)
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
