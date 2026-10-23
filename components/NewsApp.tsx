"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, type Article } from "@/lib/types";
import { trending } from "@/lib/utils";
import { ArticleModal, Card, Featured, Skeleton, Ticker, Meta } from "./parts";

const REFRESH_MIN = Math.max(1, Number(process.env.NEXT_PUBLIC_REFRESH_MINUTES) || 5);
const TTL = 5 * 60 * 1000;
const LABEL: Record<string, string> = { general: "General", world: "World", india: "India", business: "Business", technology: "Technology", sports: "Sports", entertainment: "Entertainment", science: "Science", health: "Health" };
const COUNTRIES = [["", "Any country"], ["in", "India"], ["us", "United States"], ["gb", "United Kingdom"], ["au", "Australia"], ["ca", "Canada"]];
const LANGS = [["en", "English"], ["hi", "Hindi"], ["es", "Spanish"], ["fr", "French"], ["de", "German"]];

type Entry = { articles: Article[]; page: number; total: number; t: number };

export default function NewsApp() {
  const [category, setCategory] = useState("general");
  const [query, setQuery] = useState("");
  const [input, setInput] = useState("");
  const [country, setCountry] = useState("");
  const [lang, setLang] = useState("en");
  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selected, setSelected] = useState<Article | null>(null);
  const [saved, setSaved] = useState<Article[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const cache = useRef(new Map<string, Entry>());
  const listRef = useRef<Article[]>([]);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    try { setSaved(JSON.parse(localStorage.getItem("saved") || "[]")); } catch { /* ignore */ }
  }, []);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async (pg: number, force = false) => {
    const key = `${category}|${query}|${country}|${lang}`;
    const hit = cache.current.get(key);
    if (pg === 1 && !force && hit && Date.now() - hit.t < TTL) {
      listRef.current = hit.articles; setArticles(hit.articles); setPage(hit.page); setTotal(hit.total); setError(null); setLoading(false);
      return;
    }
    pg === 1 ? setLoading(true) : setMore(true);
    try {
      const qs = new URLSearchParams({ page: String(pg), lang });
      query ? qs.set("q", query) : qs.set("category", category);
      if (country) qs.set("country", country);
      if (force) qs.set("fresh", "1");
      const res = await fetch(`/api/news?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed.");
      const seen = new Set(pg === 1 ? [] : listRef.current.map((a) => a.url));
      const merged = pg === 1 ? data.articles : [...listRef.current, ...data.articles.filter((a: Article) => !seen.has(a.url))];
      listRef.current = merged; setArticles(merged); setPage(pg); setTotal(data.total); setError(null); setUpdated(new Date());
      cache.current.set(key, { articles: merged, page: pg, total: data.total, t: Date.now() });
    } catch (e) {
      const msg = (e as Error).message;
      pg === 1 ? setError(msg) : flash(`Could not load more: ${msg}`);
    } finally { setLoading(false); setMore(false); }
  }, [category, query, country, lang]);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => {
    const id = setInterval(() => load(1, true), REFRESH_MIN * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  const toggleSave = (a: Article) => {
    setSaved((prev) => {
      const next = prev.some((s) => s.url === a.url) ? prev.filter((s) => s.url !== a.url) : [a, ...prev];
      try { localStorage.setItem("saved", JSON.stringify(next)); } catch { flash("Could not save: browser storage is unavailable."); }
      return next;
    });
  };
  const act = { onOpen: setSelected, onSave: toggleSave, isSaved: (a: Article) => saved.some((s) => s.url === a.url) };

  const share = async (a: Article) => {
    try {
      if (navigator.share) await navigator.share({ title: a.title, url: a.url });
      else { await navigator.clipboard.writeText(a.url); flash("Link copied."); }
    } catch { /* user cancelled */ }
  };
  const toggleTheme = () => {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* ignore */ }
  };
  const pickCategory = (c: string) => { setCategory(c); setQuery(""); setInput(""); setShowSaved(false); setMenu(false); };
  const search = (q: string) => { setQuery(q.trim()); setInput(q.trim()); setShowSaved(false); setMenu(false); };

  const base = showSaved ? saved : articles;
  const { topics, stories } = useMemo(() => trending(articles), [articles]);
  const [featured, ...rest] = base;
  const side = rest.slice(0, 3);
  const feed = rest.slice(3);
  const canMore = !showSaved && !loading && articles.length < total && articles.length > 0;

  const Cats = ({ vertical = false }: { vertical?: boolean }) => (
    <ul className={vertical ? "flex flex-col" : "flex gap-1 overflow-x-auto"}>
      {CATEGORIES.map((c) => (
        <li key={c}>
          <button onClick={() => pickCategory(c)} aria-current={!query && !showSaved && category === c ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium hover:bg-cream ${!query && !showSaved && category === c ? "bg-brand text-bg hover:bg-brand" : ""}`}>
            {LABEL[c]}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button onClick={() => pickCategory("general")} className="flex items-center gap-2" aria-label="LivePulse News home">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-brand font-serif text-lg font-bold text-bg">LP</span>
            <span className="font-serif text-2xl font-bold">LivePulse <span className="font-normal">News</span></span>
          </button>
          <form role="search" onSubmit={(e) => { e.preventDefault(); search(input); }} className="ml-auto hidden flex-1 md:flex md:max-w-md">
            <label htmlFor="q" className="sr-only">Search news</label>
            <input id="q" value={input} onChange={(e) => setInput(e.target.value)} maxLength={100} placeholder="Search news by keyword" className="w-full rounded-l-md border border-line bg-bg px-3 py-2 text-sm" />
            <button className="btn-primary rounded-l-none">Search</button>
          </form>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <button className="btn" onClick={() => { setShowSaved((s) => !s); setMenu(false); }} aria-pressed={showSaved}>Saved ({saved.length})</button>
            <button className="btn hidden sm:inline-flex" onClick={() => load(1, true)} disabled={loading || showSaved}>Refresh</button>
            <button className="btn" onClick={toggleTheme} aria-label="Toggle dark mode">{dark ? "Light" : "Dark"}</button>
            <button className="btn md:hidden" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-controls="mobile-menu">{menu ? "Close" : "Menu"}</button>
          </div>
        </div>
        <nav aria-label="Categories" className="mx-auto hidden max-w-7xl px-4 pb-2 md:block"><Cats /></nav>
        {menu && (
          <div id="mobile-menu" className="border-t border-line px-4 py-3 md:hidden">
            <form role="search" onSubmit={(e) => { e.preventDefault(); search(input); }} className="mb-3 flex">
              <label htmlFor="mq" className="sr-only">Search news</label>
              <input id="mq" value={input} onChange={(e) => setInput(e.target.value)} maxLength={100} placeholder="Search news by keyword" className="w-full rounded-l-md border border-line bg-bg px-3 py-2 text-sm" />
              <button className="btn-primary rounded-l-none">Search</button>
            </form>
            <nav aria-label="Categories"><Cats vertical /></nav>
            <button className="btn mt-3 sm:hidden" onClick={() => { load(1, true); setMenu(false); }}>Refresh news</button>
          </div>
        )}
      </header>

      {!loading && !error && !showSaved && <Ticker list={articles} onOpen={setSelected} />}

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-bold">
              {showSaved ? "Saved articles" : query ? `Results for "${query}"` : `${LABEL[category]} news`}
            </h1>
            {updated && !showSaved && <p className="text-xs text-mute">Fetched at {updated.toLocaleTimeString()}. Auto-refreshes every {REFRESH_MIN} min.</p>}
          </div>
          {!showSaved && (
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="country">Country</label>
              <select id="country" value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-md border border-line bg-bg px-2 py-2 text-sm">{COUNTRIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <label className="sr-only" htmlFor="lang">Language</label>
              <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-md border border-line bg-bg px-2 py-2 text-sm">{LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </div>
          )}
        </div>
        {!showSaved && category === "india" && !query && <p className="mb-4 text-sm text-mute">India shows top headlines filtered to country India. The country filter is fixed for this category.</p>}
        <p className="mb-6 rounded-md border border-line bg-cream px-3 py-2 text-sm text-mute">
          Stories appear with their real publication time. Free GNews plans can delay articles by up to 12 hours, so these are headlines, not live reports.
        </p>

        {loading && !showSaved ? <Skeleton /> : error && !showSaved ? (
          <div role="alert" className="rounded-md border border-line bg-cream p-6">
            <h2 className="font-serif text-xl font-bold">News could not be loaded</h2>
            <p className="mt-2 text-mute">{error}</p>
            <button className="btn-primary mt-4" onClick={() => load(1, true)}>Try again</button>
          </div>
        ) : base.length === 0 ? (
          <div className="rounded-md border border-line bg-cream p-8 text-center">
            <h2 className="font-serif text-xl font-bold">{showSaved ? "No saved articles yet" : "No stories found"}</h2>
            <p className="mt-2 text-mute">{showSaved ? "Use Save on any story and it will appear here." : "Try a different keyword, category, country or language."}</p>
            {query && <button className="btn mt-4" onClick={() => pickCategory("general")}>Clear search</button>}
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="grid gap-8 xl:grid-cols-[1.6fr_1fr]">
                <Featured a={featured} act={act} />
                {side.length > 0 && (
                  <div className="space-y-5">
                    {side.map((a) => (
                      <article key={a.url} className="border-b border-line pb-4">
                        <button onClick={() => setSelected(a)} className="text-left" aria-label={`Open story: ${a.title}`}><h3 className="font-serif text-lg font-bold leading-snug hover:underline">{a.title}</h3></button>
                        <div className="mt-2"><Meta a={a} /></div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
              {feed.length > 0 && (
                <section className="mt-12" aria-labelledby="latest">
                  <h2 id="latest" className="mb-5 border-b-2 border-brand pb-2 font-serif text-2xl font-bold">Latest news</h2>
                  <div className="grid gap-6 sm:grid-cols-2">{feed.map((a) => <Card key={a.url} a={a} act={act} />)}</div>
                </section>
              )}
              {canMore && (
                <div className="mt-8 text-center">
                  <button className="btn-primary" onClick={() => load(page + 1)} disabled={more}>{more ? "Loading..." : "Load more"}</button>
                </div>
              )}
            </div>
            <aside aria-label="Trending" className="space-y-8">
              {!showSaved && topics.length > 0 && (
                <section>
                  <h2 className="mb-3 border-b-2 border-brand pb-2 font-serif text-xl font-bold">Trending topics</h2>
                  <div className="flex flex-wrap gap-2">{topics.map((t) => <button key={t} className="btn" onClick={() => search(t)}>{t}</button>)}</div>
                </section>
              )}
              {!showSaved && stories.length > 0 && (
                <section>
                  <h2 className="mb-3 border-b-2 border-brand pb-2 font-serif text-xl font-bold">Trending stories</h2>
                  <ol className="list-decimal space-y-4 pl-5">
                    {stories.map((a) => (
                      <li key={a.url}><button onClick={() => setSelected(a)} className="text-left font-serif font-semibold leading-snug hover:underline">{a.title}</button><div className="mt-1"><Meta a={a} /></div></li>
                    ))}
                  </ol>
                  <p className="mt-3 text-xs text-mute">Ranked by topics shared across the stories loaded on this page.</p>
                </section>
              )}
            </aside>
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-line bg-cream">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm">
          <p className="text-mute">LivePulse News. Headlines via GNews. Full stories belong to their publishers.</p>
          <nav aria-label="Footer" className="flex gap-5 font-medium"><Link href="/about" className="hover:underline">About</Link><Link href="/contact" className="hover:underline">Contact</Link><Link href="/privacy" className="hover:underline">Privacy Policy</Link></nav>
        </div>
      </footer>

      {selected && <ArticleModal a={selected} act={act} onClose={() => setSelected(null)} onShare={share} />}
      {toast && <div role="status" className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-md bg-brand px-4 py-2 text-sm text-bg shadow-lg">{toast}</div>}
    </div>
  );
}
