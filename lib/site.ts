// Single source of truth for site-wide BRAND INFO (contact, licenses, social).
// All on-page COPY lives in lib/content.ts — edit there to change wording.

export const site = {
  name: "Samina Bilal",
  tagline: "Make Yourself at Home",
  brokerage: "RE/MAX Galaxy",
  phone: "(703) 973-7036",
  phoneHref: "tel:+17039737036",
  email: "samina@saminarealtor.com", // placeholder — confirm
  emailHref: "mailto:samina@saminarealtor.com",
  // RE/MAX Galaxy brokerage office — for footer + header brand callout
  brokerageOffice: {
    name: "RE/MAX Galaxy",
    street: "12781 Darby Brook Court, Suite 102",
    cityStateZip: "Woodbridge, VA 22192",
    phone: "(703) 491-9570", // placeholder — replace with confirmed brokerage line
    phoneHref: "tel:+17034919570",
    logoSrc: "/images/remax-galaxy-logo.png", // drop the actual logo here
  },
  // Samina's listed office address (kept for local "Office" reference in About / Contact)
  office: {
    street: "12781 Darby Brook Court, Suite 102",
    cityStateZip: "Woodbridge, VA 22192",
  },
  licenses: {
    va: "0225256757",
    md: "[license pending]",
  },
  social: {
    instagram: "https://www.instagram.com/homewithsamina/",
    facebook: "https://www.facebook.com/SaminaBilalRealtor/",
    tiktok: "https://www.tiktok.com/@samina.realtor",
  },
  // Portrait — Samina's real headshot.
  // One URL change here updates header, footer, homepage Meet section, and About page.
  portrait: {
    // Used everywhere — header avatar, footer, homepage Meet section, About page hero + bio.
    avatar: "/images/Samina%20Headshot.jpeg",
    full: "/images/Samina%20Headshot.jpeg",
  },
};

export const nav = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Buyers", href: "/buyers" },
  { label: "Sellers", href: "/sellers" },
  { label: "Path to Ownership", href: "/path-to-ownership" },
  {
    label: "Communities",
    href: "/communities",
    children: [
      { label: "Woodbridge", href: "/communities/woodbridge" },
      { label: "Dumfries", href: "/communities/dumfries" },
      { label: "Ashburn", href: "/communities/ashburn" },
      { label: "Lorton", href: "/communities/lorton" },
      { label: "Stafford", href: "/communities/stafford" },
      { label: "Manassas", href: "/communities/manassas" },
    ],
  },
  { label: "Recent Closings", href: "/closings" },
  { label: "Trusted Partners", href: "/partners" },
  { label: "Reviews", href: "/reviews" },
  { label: "Contact", href: "/contact" },
];

export const heroStats: Array<{
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: string;
}> = [
  { to: 5.0, decimals: 1, suffix: "★", label: "Across Zillow, Google & Realtor.com" },
  { to: 42, suffix: "+", label: "Five-Star Client Reviews" },
  { to: 2, label: "States Licensed (VA & MD)" },
];
