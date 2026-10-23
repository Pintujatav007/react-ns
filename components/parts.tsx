"use client";
import { useEffect, useRef, useState } from "react";
import type { Article } from "@/lib/types";
import { fullDate, timeAgo } from "@/lib/utils";

export function Img({ src, title, className = "" }: { src?: string | null; title: string; className?: string }) {
  const [bad, setBad] = useState(!src);
  if (bad)
    return <div role="img" aria-label="No image available for this story" className={`grid place-items-center bg-cream text-sm text-mute ${className}`}>No image</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src!} alt={`Photo for: ${title}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} className={`object-cover ${className}`} />;
}

export function Skeleton({ n = 6 }: { n?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading news" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-3">
          <div className="aspect-video rounded-md bg-cream" /><div className="h-4 w-3/4 rounded bg-cream" /><div className="h-4 w-1/2 rounded bg-cream" />
        </div>
      ))}
    </div>
  );
}

type Actions = { onOpen: (a: Article) => void; onSave: (a: Article) => void; isSaved: (a: Article) => boolean };

export function Meta({ a }: { a: Article }) {
  return (
    <p className="text-xs text-mute">
      <span className="font-semibold text-ink">{a.source.name}</span>
      <span className="mx-2" aria-hidden>|</span>
      <time dateTime={a.publishedAt} title={fullDate(a.publishedAt)}>{timeAgo(a.publishedAt)}, {fullDate(a.publishedAt)}</time>
    </p>
  );
}

export function SaveButton({ a, act }: { a: Article; act: Actions }) {
  const saved = act.isSaved(a);
  return (
    <button onClick={() => act.onSave(a)} aria-pressed={saved} aria-label={saved ? "Remove bookmark" : "Save article"} className="btn px-2 py-1 text-xs">
      {saved ? "Saved" : "Save"}
    </button>
  );
}

export function Card({ a, act }: { a: Article; act: Actions }) {
  return (
    <article className="flex flex-col gap-3 border-b border-line pb-5">
      <button onClick={() => act.onOpen(a)} className="text-left" aria-label={`Open story: ${a.title}`}>
        <Img src={a.image} title={a.title} className="aspect-video w-full rounded-md" />
        <h3 className="mt-3 font-serif text-xl font-bold leading-snug hover:underline">{a.title}</h3>
      </button>
      {a.description && <p className="line-clamp-2 font-serif text-[15px] leading-6 text-mute">{a.description}</p>}
      <div className="flex items-center justify-between gap-2"><Meta a={a} /><SaveButton a={a} act={act} /></div>
    </article>
  );
}

export function Featured({ a, act }: { a: Article; act: Actions }) {
  return (
    <article className="group">
      <button onClick={() => act.onOpen(a)} className="block w-full text-left" aria-label={`Open featured story: ${a.title}`}>
        <Img src={a.image} title={a.title} className="aspect-[16/9] w-full rounded-md" />
        <h2 className="mt-4 font-serif text-3xl font-bold leading-tight group-hover:underline md:text-5xl">{a.title}</h2>
      </button>
      {a.description && <p className="mt-3 max-w-2xl font-serif text-lg leading-8 text-mute">{a.description}</p>}
      <div className="mt-3 flex items-center gap-3"><Meta a={a} /><SaveButton a={a} act={act} /></div>
    </article>
  );
}

export function Ticker({ list, onOpen }: { list: Article[]; onOpen: (a: Article) => void }) {
  if (!list.length) return null;
  const items = list.slice(0, 8);
  return (
    <div className="ticker flex items-center overflow-hidden bg-brand text-bg" role="region" aria-label="Top headlines ticker">
      <span className="shrink-0 px-4 py-2 text-sm font-bold">Top headlines</span>
      <div className="overflow-hidden">
        <div className="ticker-track flex w-max">
          {[...items, ...items].map((a, i) => (
            <button key={i} onClick={() => onOpen(a)} aria-hidden={i >= items.length} tabIndex={i >= items.length ? -1 : 0} className="whitespace-nowrap px-6 py-2 text-sm hover:underline">
              {a.title} <span className="opacity-70">({timeAgo(a.publishedAt)})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ArticleModal({ a, act, onClose, onShare }: { a: Article; act: Actions; onClose: () => void; onShare: (a: Article) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={a.title} onClick={(e) => e.stopPropagation()} className="my-8 w-full max-w-2xl rounded-lg bg-bg p-5 shadow-xl md:p-8">
        <div className="flex justify-end"><button ref={closeRef} onClick={onClose} className="btn">Close</button></div>
        <h2 className="mt-2 font-serif text-3xl font-bold leading-tight">{a.title}</h2>
        <div className="mt-3"><Meta a={a} /></div>
        <Img src={a.image} title={a.title} className="mt-5 aspect-video w-full rounded-md" />
        <div className="mt-5 rounded-md border border-line bg-cream p-4">
          <p className="text-sm font-semibold">Summary from the GNews API</p>
          <p className="mt-2 font-serif text-lg leading-8">{a.description ?? "No summary was provided for this story."}</p>
          <p className="mt-3 text-sm text-mute">This is only a short summary. The full article belongs to {a.source.name}.</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="btn-primary">Read the full story on {a.source.name}</a>
          <SaveButton a={a} act={act} />
          <button className="btn" onClick={() => onShare(a)}>Share link</button>
        </div>
      </div>
    </div>
  );
}
