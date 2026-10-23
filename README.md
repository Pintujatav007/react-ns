# LivePulse News

Next.js 14 + TypeScript + Tailwind news site using the [GNews API](https://gnews.io/docs/v4). The API key stays on the server; the browser only calls `/api/news` and `/api/search`.

## Structure
```
app/api/news/route.ts     headlines, category and search (q) endpoint
app/api/search/route.ts   /api/search?q=keyword (q required)
app/[slug]/page.tsx       About, Contact, Privacy
components/NewsApp.tsx    main client app (state, cache, refresh, filters)
components/parts.tsx      cards, ticker, skeletons, article modal
lib/gnews.ts              GNews client: validation, timeout, errors, dedupe
```

## Get a GNews key
1. Sign up at https://gnews.io and open your dashboard.
2. Copy the API key.

## Run locally
```bash
npm install
cp .env.example .env.local     # then paste your key into GNEWS_API_KEY
npm run dev                    # http://localhost:3000
npm run typecheck && npm run build
```

## Deploy to Vercel
1. Push to GitHub (`.env.local` is git-ignored).
2. Import the repo at vercel.com/new.
3. Add `GNEWS_API_KEY` (and optionally `NEXT_PUBLIC_REFRESH_MINUTES`) under Environment Variables.
4. Deploy.

## Notes on the free GNews plan
- About 100 requests per day, 10 articles per request, and articles delayed up to 12 hours. The UI shows real publication times and never labels stories as live or breaking.
- The `page` parameter (Load more) may require a paid plan. If GNews refuses it, a message appears and nothing fake is shown.
- Responses are cached for 5 minutes server-side and in the browser per category/search. The Refresh button and auto-refresh bypass the server cache and use quota.
- "India" = top headlines with `country=in`. Other categories map to GNews categories.

## Troubleshooting
- **"GNEWS_API_KEY is not set"**: create `.env.local` and restart `npm run dev`. On Vercel, add the variable and redeploy.
- **401 invalid key**: re-copy the key, no quotes or spaces.
- **403 / 429**: daily limit reached or too many requests. Wait, or raise the refresh interval.
- **CORS errors**: none expected, since the browser only calls same-origin `/api/*`. If you see one, you are calling gnews.io directly from client code.
- **Network or timeout errors**: the server waits 8 seconds for GNews, then shows a retry state.
