import type { Article } from "./types";

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
export const fullDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const STOP = new Set("the a an and or of to in on for with at by from is are was were be as it its this that new says say after over into about up out how why what who will has have had not but more than their they his her you we".split(" "));
const words = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));

// Trending topics and stories come only from the articles currently loaded.
export function trending(list: Article[]) {
  const freq = new Map<string, number>();
  list.forEach((a) => new Set(words(a.title)).forEach((w) => freq.set(w, (freq.get(w) || 0) + 1)));
  const topics = [...freq.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
  const score = (a: Article) => words(a.title).reduce((s, w) => s + (freq.get(w) || 1) - 1, 0);
  const stories = [...list].sort((a, b) => score(b) - score(a)).slice(0, 5);
  return { topics, stories };
}
