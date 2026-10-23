export type Article = {
  title: string;
  description: string | null;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url?: string };
};
export type NewsResponse = { articles: Article[]; total: number; page: number };
export const CATEGORIES = [
  "general", "world", "india", "business", "technology", "sports", "entertainment", "science", "health",
] as const;
export type Category = (typeof CATEGORIES)[number];
