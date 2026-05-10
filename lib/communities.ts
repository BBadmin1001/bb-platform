export type Community = {
  slug: string;
  name: string;
  state: string;
  tagline: string;
  median: string;
  yoy: string;
  yoyDirection: "up" | "down" | "flat";
  dom: string;
  marketType: "Seller's" | "Buyer's" | "Balanced";
  about: string;
  market2026: string;
  priceTiers: { tier: string; description: string }[];
  life: { schools: string; parks: string; dining: string; commute: string };
  saminaQuote: string;
  image: string;
  /** Optional override for the /communities/[slug] hero. Falls back to
   *  `image` when not set. */
  heroImage?: string;
};

export const communities: Community[] = [
  {
    slug: "woodbridge",
    name: "Woodbridge",
    state: "Virginia",
    tagline: "Where Northern Virginia gets within reach.",
    median: "$460K",
    yoy: "+5.5%",
    yoyDirection: "up",
    dom: "42 days",
    marketType: "Balanced",
    about:
      "Woodbridge sits at the southern edge of the Northern Virginia tech corridor — close enough to commute into the region, far enough to actually afford a yard. Anchored by the Potomac River, Occoquan Bay, and Stonebridge at Potomac Town Center, it's where first-time buyers, growing families, and military households all find each other. The 22192 ZIP (Lake Ridge / Old Bridge) trends slightly more expensive at $506K median, while 22191 (Belmont Bay / Marina) currently sits at $457K — both with strong townhome and SFH inventory.",
    market2026:
      "2026 has been steady and slightly up in Woodbridge. Prices grew 5.5% year-over-year while the rest of NoVa softened. Homes are moving in about six weeks — neither hot nor cold, which means buyers can still negotiate inspection items and sellers who price right are getting clean offers.",
    priceTiers: [
      { tier: "Under $500K", description: "Townhome, 3 bd / 2-3 ba, 1,500–2,000 sqft" },
      { tier: "$500K–$750K", description: "Newer townhome or starter SFH, 4 bd, attached garage" },
      { tier: "$750K+", description: "Single-family with yard, in Lake Ridge or River Oaks, 3,000+ sqft" },
    ],
    life: {
      schools: "Westridge ES, Lake Ridge MS, Woodbridge HS",
      parks: "Leesylvania State Park, Occoquan Bay NWR, Veterans Memorial Park",
      dining: "Stonebridge at Potomac Town Center, Old Town Occoquan, Potomac Mills",
      commute: "30 min to Pentagon · VRE Manassas Line · I-95 + Route 1",
    },
    saminaQuote:
      "Woodbridge is where I live and work. It's the rare NoVa zip code where a young family can still buy something they're proud of, in a community that actually feels like one.",
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&auto=format&fit=crop&q=80",
  },
  {
    slug: "dumfries",
    name: "Dumfries",
    state: "Virginia",
    tagline: "Virginia's oldest chartered town. The market just discovered it.",
    median: "$462K",
    yoy: "+28.3%",
    yoyDirection: "up",
    dom: "32 days",
    marketType: "Seller's",
    about:
      "Founded in 1749, Dumfries is the oldest continuously chartered town in Virginia — but that's not why prices are up 28% this year. New development around the Potomac Shores Town Center, the VRE station expansion, and a major Route 1 corridor revamp have made Dumfries the breakout buyer story of 2026. The 22026 ZIP — covering Potomac Shores and Montclair-adjacent — is now trading at $597K median, with $263/sqft (up nearly 10% YoY).",
    market2026:
      "Dumfries is the most aggressive growth story on this list. A 28% YoY jump and 32-day average DOM means competitively priced homes are seeing multiple offers, often above ask. If you're a buyer, this is the neighborhood where being mortgage-ready before you start looking actually matters. If you're a seller, this is the year to list.",
    priceTiers: [
      { tier: "Under $500K", description: "Townhome in Quantico Corporate Center area, 3 bd" },
      { tier: "$500K–$750K", description: "Single-family in Potomac Shores or Montclair, 4 bd / 2.5 ba" },
      { tier: "$750K+", description: "Waterfront or golf-course adjacent, 3,500+ sqft" },
    ],
    life: {
      schools: "Potomac Shores ES, John Paul the Great Catholic HS nearby",
      parks: "Potomac Shores Golf Club, Locust Shade Park, Leesylvania State Park",
      dining: "Potomac Town Center, Stonebridge, Quantico waterfront",
      commute: "VRE Quantico station · I-95 · 35 min to Pentagon · adjacent to MCB Quantico",
    },
    saminaQuote:
      "Five years ago Dumfries was a hidden value play. Today it.s the fastest-appreciating market in the southern NoVa corridor. If you can buy here in 2026, you'll thank yourself in 2030.",
    image:
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1600&auto=format&fit=crop&q=80",
  },
  {
    slug: "ashburn",
    name: "Ashburn",
    state: "Virginia",
    tagline: "Loudoun County's tech-corridor capital.",
    median: "$660K",
    yoy: "−7.7%",
    yoyDirection: "down",
    dom: "47 days",
    marketType: "Buyer's",
    about:
      "Ashburn is where Northern Virginia's data-center economy meets master-planned suburban living. Home to Loudoun County's tech employers and the Silver Line's Ashburn station, it's the prestige address for engineers, federal contractors, and dual-income families. After three years of relentless appreciation, 2026 has brought the first meaningful price cooling — a 7.7% pullback that's quietly opened a door for buyers who were priced out in 2024–2025.",
    market2026:
      "Ashburn's correction makes it the buyer's pick of 2026. Inventory is up, average days on market is approaching seven weeks, and well-prepared buyers can negotiate seller concessions for the first time in years. The 20148 ZIP (Brambleton / One Loudoun adjacent) still commands $700K median — but that's −2.5% YoY, not the +15% we saw two years ago.",
    priceTiers: [
      { tier: "Under $500K", description: "Condo or older townhome near Ashburn Village" },
      { tier: "$500K–$750K", description: "Townhome in Brambleton or Loudoun Valley Estates, 3-4 bd" },
      { tier: "$750K+", description: "Single-family in One Loudoun, Belmont Country Club, or Brambleton" },
    ],
    life: {
      schools: "Loudoun County Schools — among the highest-rated in Virginia",
      parks: "Beaverdam Reservoir, W&OD Trail, Brambleton Town Center",
      dining: "One Loudoun, Brambleton Town Center, Dulles Town Center",
      commute: "Silver Line Metro · Dulles Toll Rd · 25 min to Tysons",
    },
    saminaQuote:
      "Ashburn's softening isn't bad news — it's the window. The buyers I'm working with right now are getting concessions that didn't exist 18 months ago.",
    image:
      "https://images.unsplash.com/photo-1592595896616-c37162298647?w=1600&auto=format&fit=crop&q=80",
  },
  {
    slug: "lorton",
    name: "Lorton",
    state: "Virginia",
    tagline: "Fairfax County addresses, without Fairfax County prices.",
    median: "$566K",
    yoy: "+19.1%",
    yoyDirection: "up",
    dom: "32 days",
    marketType: "Seller's",
    about:
      "Lorton is the secret of southern Fairfax County. Same county as McLean and Vienna — but at half the price. Bordered by the Occoquan River and Mason Neck State Park, anchored by the VRE Lorton station, it's quietly become the smartest entry point into a Fairfax County address. The 22079 ZIP is now at $681K median (+7.5% YoY), reflecting the build-out around Lorton Town Center.",
    market2026:
      "Lorton is the second-fastest growing market on this list (+19.1% YoY) — driven by buyers who want Fairfax schools and county services without a Fairfax mortgage. Homes are moving in 32 days. Inventory is tight. If you're considering listing, 2026 is your year.",
    priceTiers: [
      { tier: "Under $500K", description: "Townhome near Gunston Plaza, 3 bd / 2.5 ba" },
      { tier: "$500K–$750K", description: "SFH in Hagel Circle or Laurel Hill, 4 bd, garage" },
      { tier: "$750K+", description: "Newer construction in Liberty or Spring Hill, 3,500+ sqft" },
    ],
    life: {
      schools: "Fairfax County Public Schools — South County HS, Silverbrook ES",
      parks: "Mason Neck State Park, Pohick Bay Regional, Occoquan Regional Park",
      dining: "Lorton Town Center, Workhouse Arts Center, Springfield Town Center",
      commute: "VRE Lorton station · I-95 · 35 min to Pentagon",
    },
    saminaQuote:
      "Lorton is where I send buyers who want the Fairfax County name without the Fairfax County sticker shock. The 19% appreciation isn't a fluke — it's the catch-up nobody saw coming.",
    image:
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1600&auto=format&fit=crop&q=80",
  },
  {
    slug: "stafford",
    name: "Stafford",
    state: "Virginia",
    tagline: "Where commuters become homeowners.",
    median: "$550K",
    yoy: "−4.3%",
    yoyDirection: "down",
    dom: "49 days",
    marketType: "Buyer's",
    about:
      "Stafford is where Northern Virginia transitions into the Fredericksburg corridor — the sweet spot for buyers who need NoVa-grade schools and amenities without paying Prince William prices. Anchored by I-95, the VRE Brooke station, and proximity to Marine Corps Base Quantico, Stafford has long been military and federal-contractor territory. In 2026 it's also become the value play for everyone else.",
    market2026:
      "Stafford softened 4.3% YoY — the second-largest correction on our list. Average days on market is now 49 (about seven weeks), giving buyers real leverage. The 22554 ZIP (north Stafford / Aquia) is at $550K median; the 22556 ZIP (Hartwood / west Stafford) is at $510K and quietly up 1% YoY — a divergence worth watching.",
    priceTiers: [
      { tier: "Under $500K", description: "Townhome in Aquia Harbour or Hampton Oaks, 3 bd / 2.5 ba" },
      { tier: "$500K–$750K", description: "SFH in Embrey Mill or Augustine North, 4 bd, attached garage" },
      { tier: "$750K+", description: "Newer construction or estate-sized lot, 3,500–5,000 sqft" },
    ],
    life: {
      schools: "Stafford County Public Schools — Colonial Forge HS, Mountain View HS",
      parks: "Government Island, Aquia Landing Park, Crow's Nest Natural Area",
      dining: "Stafford Marketplace, Cosner's Corner, Central Park (Fredericksburg)",
      commute: "VRE Brooke station · I-95 · 45 min to Pentagon · adjacent to MCB Quantico",
    },
    saminaQuote:
      "Stafford in 2026 is what Woodbridge was in 2018. Buyers who get in this year are buying ahead of the next correction up.",
    image:
      "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=1600&auto=format&fit=crop&q=80",
  },
  {
    slug: "manassas",
    name: "Manassas",
    state: "Virginia",
    tagline: "Historic charm. Modern commute. Real value.",
    median: "$510K",
    yoy: "−1.9%",
    yoyDirection: "flat",
    dom: "37 days",
    marketType: "Balanced",
    about:
      "Manassas is Prince William County's other anchor — historic Old Town, the VRE Manassas Line terminus, and a school system that punches above its weight. It's a city in its own right (independent of Prince William County), which means city services, walkable Old Town, and a tax structure of its own. The 20112 ZIP (Lake Manassas / Manassas Park edge) is the breakout sub-market — currently $765K median and up 13.3% YoY.",
    market2026:
      "Manassas is the 'balanced' market on this list. Prices are essentially flat YoY (−1.9%), homes are selling in about five weeks, and inventory is healthy. Neither side has a clear advantage — which makes 2026 a clean year to transact in either direction without timing pressure.",
    priceTiers: [
      { tier: "Under $500K", description: "Older SFH or townhome in Old Town adjacent neighborhoods" },
      { tier: "$500K–$750K", description: "Updated SFH in Wellington, Sudley, or Yorkshire, 4 bd" },
      { tier: "$750K+", description: "Estate home in Lake Manassas or Bull Run, 4,000+ sqft" },
    ],
    life: {
      schools: "Manassas City Schools — Osbourn HS · adjacent PWC Schools",
      parks: "Manassas National Battlefield, Signal Bay, Bull Run Regional Park",
      dining: "Historic Old Town Manassas, Manassas Mall, Virginia Gateway",
      commute: "VRE Manassas Line (terminus) · I-66 · Route 28",
    },
    saminaQuote:
      "Manassas is the most under-rated city in NoVa. Old Town has restaurants you'd drive to from Arlington, and you can still buy a real house with a real yard for under $600K.",
    image:
      "https://images.unsplash.com/photo-1518883429555-e6f9e2dba8c4?w=1600&auto=format&fit=crop&q=80",
  },
];
