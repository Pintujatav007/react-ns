import type { Article, NewsResponse } from "./types";

const BASE = "https://gnews.io/api/v4";
const CACHE_SECONDS = 300;
const TIMEOUT_MS = 8000;

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Every category maps to a real GNews parameter. "India" = top headlines filtered to country=in.
const CATEGORY_MAP: Record<string, { category: string; country?: string }> = {
  general: { category: "general" }, world: { category: "world" }, india: { category: "general", country: "in" },
  business: { category: "business" }, technology: { category: "technology" }, sports: { category: "sports" },
  entertainment: { category: "entertainment" }, science: { category: "science" }, health: { category: "health" },
};
export const isCategory = (c: string) => c in CATEGORY_MAP;

export type NewsParams = { category?: string; q?: string; lang?: string; country?: string; page?: number; fresh?: boolean };

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function dedupe(list: Article[]): Article[] {
  const urls = new Set<string>(), titles = new Set<string>();
  return list.filter((a) => {
    const t = norm(a.title);
    if (urls.has(a.url) || titles.has(t)) return false;
    urls.add(a.url); titles.add(t);
    return true;
  });
}

export async function fetchNews(p: NewsParams): Promise<NewsResponse> {
  const key = process.env.GNEWS_API_KEY;
  if (!key) throw new ApiError(500, "GNEWS_API_KEY is not set. Add it to .env.local (see README).");

  const qs = new URLSearchParams();
  const q = p.q?.trim();
  if (q) qs.set("q", q);
  else {
    const m = CATEGORY_MAP[p.category || "general"];
    qs.set("category", m.category);
    if (m.country) qs.set("country", m.country);
  }
  if (p.lang) qs.set("lang", p.lang);
  if (p.country && !qs.has("country")) qs.set("country", p.country);
  qs.set("max", "10");
  const page = p.page && p.page > 1 ? p.page : 1;
  if (page > 1) qs.set("page", String(page));
  qs.set("apikey", key);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const init: RequestInit = p.fresh ? { cache: "no-store" } : { next: { revalidate: CACHE_SECONDS } };
    const res = await fetch(`${BASE}/${q ? "search" : "top-headlines"}?${qs}`, { ...init, signal: ctrl.signal });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const detail = Array.isArray(body?.errors) ? body.errors.join(" ") : body?.errors ? JSON.stringify(body.errors) : "";
      if (res.status === 401) throw new ApiError(401, "GNews rejected the API key. Check GNEWS_API_KEY.");
      if (res.status === 403) throw new ApiError(403, `Daily request limit reached or this feature is not on your GNews plan. ${detail}`.trim());
      if (res.status === 429) throw new ApiError(429, "Too many requests to GNews. Wait a few seconds and retry.");
      throw new ApiError(res.status === 400 ? 400 : 502, `GNews error (${res.status}). ${detail}`.trim());
    }
    const data = await res.json();
    const articles: Article[] = dedupe(
      (data.articles ?? [])
        .filter((a: Article) => a?.title && a?.url)
        .map((a: Article) => ({
          title: a.title, description: a.description || null, url: a.url, image: a.image || null,
          publishedAt: a.publishedAt, source: { name: a.source?.name || "Unknown source", url: a.source?.url },
        }))
    );
    return { articles, total: data.totalArticles ?? articles.length, page };
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === "AbortError") throw new ApiError(504, "GNews took too long to respond. Try again.");
    throw new ApiError(502, "Could not reach GNews. Check your network connection.");
  } finally {
    clearTimeout(timer);
  }
}
