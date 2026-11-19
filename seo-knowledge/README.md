# SEO Intelligence — ClipsX + XKey

A continuously accumulating data knowledge base for improving search access to:

- **ClipsX** — clipsx.app + docs.clipsx.app (repo: azure06/clipsx-web)
- **XKey** — xkey.infiniticlips.com (repo: azure06/xkey, website in `XKey/UI/`)

Started 2026-11-10 at Gabriele's request: "scrape, understand what people search,
what Google indexes, use my Search Console and everything you can figure out to
improve the access of my sites… keep performing this over and over, periodically,
several times a day. We create our data knowledge where we can analyze things."

## What is collected, and how often

| Layer | Source | Cadence | What it captures |
|---|---|---|---|
| Site crawl | sitemap.xml + every URL on both sites (+ docs) | every 6 hours | URL count, HTTP status, title, meta description, canonical, H1, robots meta — diffs vs previous run flag new/changed/broken pages |
| Search demand | Google autocomplete (EN + JA seed terms) | every 6 hours | Real phrases people type, per seed; new suggestions = emerging demand |
| Search demand | SERP checks for target queries (browser search) | every 6 hours (rotating subset) | Who ranks, whether either site appears, winnable long-tails |
| Search Console | Performance + Page Indexing + URL Inspection, via signed-in browser | daily (~09:20 JST) | Clicks/impressions/queries/pages (28d + 7d), indexing totals, watchlist URL status. GSC data lags ~2–3 days and updates ~daily, so more frequent checks add nothing |
| Vercel Analytics | Dashboard (visitors, referrers, top pages) | weekly (with synthesis) | Whether search work turns into visits/downloads |
| News/competitors | Web scan (existing weekly scan) | weekly, Mondays | Topics with proven demand; feeds the write/change plan |

## Layout

- `clipsx/` — snapshots, indexing watchlist, query data for clipsx.app
- `xkey/` — same for xkey.infiniticlips.com
- `plan/` — the living write/change plan, re-ranked from accumulated data
  (criteria: proven demand → winnability for a low-authority site → conversion
  intent, per Gabriele 2026-11-10)
- Root JSON snapshots: one per collection run, timestamped; diffs are computed
  against the previous snapshot, never from memory.

The same findings are mirrored to a `seo/knowledge-base` branch in each site's
own repo (clipsx-web and xkey) so the knowledge lives next to the code it will
change. Nothing on these branches is merged to main without Gabriele's go-ahead.

## Rules

- Never invent search volumes or numbers. Every claim cites its source + date.
- Checked facts, inference, and borrowed playbooks are kept separate.
- Request-indexing and other Search Console actions only when Gabriele
  authorises them, or as follow-through on an authorisation already given.
- Reports to Gabriele only when something changed materially or work is ready
  for his decision; routine no-change runs stay silent in the logs.
