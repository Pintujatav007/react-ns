import { NextRequest, NextResponse } from "next/server";
import { ApiError, fetchNews, isCategory } from "./gnews";

export async function handle(req: NextRequest, requireQuery = false) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const category = sp.get("category") ?? "general";
  const lang = sp.get("lang") ?? "en";
  const country = sp.get("country") ?? "";
  const page = Number(sp.get("page") ?? "1");

  if (requireQuery && !q) return NextResponse.json({ error: "Query parameter q is required." }, { status: 400 });
  if (q.length > 100) return NextResponse.json({ error: "Search query is too long (max 100 characters)." }, { status: 400 });
  if (!isCategory(category)) return NextResponse.json({ error: "Unknown category." }, { status: 400 });
  if (!/^[a-z]{2}$/.test(lang)) return NextResponse.json({ error: "Invalid language code." }, { status: 400 });
  if (country && !/^[a-z]{2}$/.test(country)) return NextResponse.json({ error: "Invalid country code." }, { status: 400 });
  if (!Number.isInteger(page) || page < 1 || page > 10) return NextResponse.json({ error: "Invalid page." }, { status: 400 });

  const fresh = sp.get("fresh") === "1";
  try {
    const data = await fetchNews({ q, category, lang, country, page, fresh });
    return NextResponse.json(data, {
      headers: { "Cache-Control": fresh ? "no-store" : "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (e) {
    const err = e as ApiError;
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
