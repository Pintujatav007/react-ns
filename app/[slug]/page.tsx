import Link from "next/link";
import { notFound } from "next/navigation";

const PAGES: Record<string, { title: string; body: string[] }> = {
  about: {
    title: "About LivePulse News",
    body: [
      "LivePulse News is a college project that gathers headlines from publishers worldwide through the GNews API.",
      "We show each story's summary, source and publication time. Full articles stay on the publisher's own website.",
      "On GNews's free plan, articles can arrive up to 12 hours after publication. The time shown on every card is the real publication time.",
    ],
  },
  contact: {
    title: "Contact",
    body: ["For feedback about this project, email the project team at livepulse.project@example.com. Replace this address before publishing."],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "LivePulse News has no accounts and collects no personal data on its servers.",
      "Saved articles and your theme choice are stored only in your browser's local storage. Clear your browser data to remove them.",
      "Search terms are sent to GNews to fetch results. See GNews's own privacy policy for how they handle requests.",
    ],
  },
};

export const generateStaticParams = () => Object.keys(PAGES).map((slug) => ({ slug }));
export const dynamicParams = false;

export default function InfoPage({ params }: { params: { slug: string } }) {
  const page = PAGES[params.slug];
  if (!page) notFound();
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/" className="text-sm text-mute underline">Back to LivePulse News</Link>
      <h1 className="mt-6 font-serif text-4xl font-bold">{page.title}</h1>
      <div className="mt-6 space-y-4 font-serif text-lg leading-8">{page.body.map((p, i) => <p key={i}>{p}</p>)}</div>
    </main>
  );
}
