export type Review = {
  quote: string;
  source: "Zillow" | "Google" | "Realtor.com";
  short?: string;
};

export const reviews: Review[] = [
  {
    quote:
      "Samina Bilal made the first-time home buying experience an absolute pleasure. Her communication and responsiveness were exceptional from the very first call.",
    source: "Zillow",
    short: "First-time buyer",
  },
  {
    quote:
      "Helped me rent a townhouse home in Chantilly, VA. We had a fantastic experience working with Samina! From start to finish, she was incredibly helpful.",
    source: "Zillow",
    short: "Rental client, Chantilly",
  },
  {
    quote:
      "I am incredibly grateful to have had the opportunity to work with Miss Samina Bilal throughout my home buying journey. Through her guidance, expertise and knowledge, I now have a place to call home.",
    source: "Realtor.com",
    short: "Buyer",
  },
  {
    quote:
      "Knowledgeable, dedicated, and a real listener. She makes the process feel calm — exactly what you want when you're making the biggest decision of your life.",
    source: "Google",
    short: "Repeat client",
  },
];

export const ratingsLine: Array<{ source: string; value: number; count: string }> = [
  { source: "Zillow", value: 5.0, count: "25 reviews" },
  { source: "Google", value: 5.0, count: "10 reviews" },
  { source: "Realtor.com", value: 5.0, count: "7 reviews" },
];
