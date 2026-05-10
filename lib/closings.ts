// Recent Closings — drop new images into /public/closings/ and add an entry here.
// The gallery shows 6 at a time and reveals 6 more on each "Load More" click,
// up to ~50 entries.

export type Closing = {
  id: string;
  image: string;
  neighborhood: string;
  city: string;
  state: string;
  year: number;
  caption?: string;
};

// Stock placeholders — Samina's real closings replace these.
const stock = [
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1518883429555-e6f9e2dba8c4?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1592595896616-c37162298647?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200&auto=format&fit=crop&q=80",
];

const neighborhoods = [
  { n: "Lake Ridge", c: "Woodbridge", s: "VA" },
  { n: "Old Town", c: "Manassas", s: "VA" },
  { n: "Brambleton", c: "Ashburn", s: "VA" },
  { n: "Aquia Harbour", c: "Stafford", s: "VA" },
  { n: "Laurel Hill", c: "Lorton", s: "VA" },
  { n: "Potomac Shores", c: "Dumfries", s: "VA" },
];

export const closings: Closing[] = Array.from({ length: 24 }).map((_, i) => {
  const place = neighborhoods[i % neighborhoods.length];
  return {
    id: `c-${i + 1}`,
    image: stock[i % stock.length],
    neighborhood: place.n,
    city: place.c,
    state: place.s,
    year: 2026 - (i % 2),
  };
});
