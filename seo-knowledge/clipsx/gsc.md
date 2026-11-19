# ClipsX — Search Console record (clipsx.app + docs.clipsx.app)

Source: Google Search Console via signed-in browser (no connector exists).
Data lags ~2–3 days. Never fill gaps with estimates.

## Latest snapshot — checked 2026-11-19, data through 2026-11-16 (new data arrived)

Performance, last 28 days (Oct 20 – Nov 16):
- 10 clicks, 178 impressions, CTR 5.6%, avg position 5.6
- Last 7 days: 4 clicks, 51 impressions, CTR 7.8%, avg position 3.0
- Top query: "clipsx" — 10 clicks / 122 impressions (28d)
- All other listed queries 0 clicks: clipcache 0/3, download clipx 0/1,
  extendx 0/1, "twitter クリップボード" 0/1
- **Generic (non-brand) clicks: still zero — all 10 clicks are "clipsx".**
- Top pages (28d): /en 8 clicks/142 imp; docs.clipsx.app/ 1/11;
  /ja/contact 1/2; /en/download 0 clicks / 32 imp;
  /ja 0/10; /meaning-search 0/7; /ja/download 0/6; /en/pricing 0/6;
  /en/changelog 0/5; /en/contact 0/5
- Top pages (7d): /en 4/43; /en/download 0/11; /en/changelog 0/3;
  /ja/download 0/3; /en/pricing 0/3; /en/contact 0/3; /ja 0/2;
  /en/privacy 0/1; docs/ja/core-workflows 0/1; /ja/pricing 0/1
- vs 2026-11-18 (data through Nov 15): clicks 10→10, impressions 179→178,
  CTR 5.6% unchanged, position 6.7→5.6 (improved); 7d 5/51/9.8%/2.6 →
  4/51/7.8%/3.0. Flat overall; all clicks still brand.

Indexing (Page Indexing report dated Nov 13 — unchanged from Nov 18):
- 42 indexed, 167 not indexed
- 127 "Crawled – currently not indexed", 16 redirects,
  15 404s (stale docs JS chunks, harmless), 3 duplicate-no-canonical,
  2 noindex, 2 duplicate Google-chose-canonical, 2 "Discovered –
  currently not indexed"

Live-verified indexed (URL Inspection, 2026-11-19) — no state changed vs 2026-11-18:
- /en (recrawled Nov 16 21:35), /ja (recrawled Nov 19 02:02 — fresh crawl,
  still indexed), /en/blog (Nov 7), /en/download (recrawled Nov 18 16:51,
  still indexed)
- Root https://clipsx.app/ NOT indexed — "Page with redirect", canonical /en.
  By design, not a problem.

Live-verified still not indexed (URL Inspection, 2026-11-19):
- docs/meaning-search (crawled Nov 10 09:00), docs/assistant-setup
  (Nov 10 08:58), docs/automation (Nov 10 08:58), docs/recall (last crawl
  Nov 11 15:07 — recrawled after the Nov 11 indexing request, still
  declined). Google's call now.
- Note: URL Inspection showed "Sitemaps: Temporary processing error" in the
  Discovery section for the inspected clipsx.app pages (observed only, not
  investigated).

Indexing requested 2026-11-10 (authorised by Gabriele):
- docs/assistant-setup, docs/automation, docs/ja/automation, docs/meaning-search
- docs/recall was BLOCKED by Google's daily quota on Nov 10; re-requested
  successfully on 2026-11-11 (~15:05 JST). All 12 authorised URLs have now
  been requested. Requesting only queues a priority crawl — indexing is
  Google's call.

Blog visibility (the real problem — not indexing):
- 0 clicks, ≤2 impressions per blog URL over 28 days; /en/blog indexed but
  0 impressions in the checked windows.

## History

| Checked | Window | Clicks | Impr. | Notes |
|---|---|---|---|---|
| 2026-11-07 (export) | Oct 10–Nov 4 | 12 | 183 | "clipsx" 8 clicks pos 1.94; zero generic |
| 2026-11-10 | Oct 11–Nov 7 (28d) | 9 | 190 | "clipsx" 5 clicks pos 2.1; zero generic |
| 2026-11-11 | Oct 12–Nov 8 (28d) | 8 | 182 | "clipsx" 6 clicks/117 imp; zero generic; docs watchlist still crawled-not-indexed; recall re-requested (12/12 done) |
| 2026-11-12 | Oct 13–Nov 9 (28d) | 8 | 173 | "clipsx" 7 clicks/111 imp; zero generic; no watchlist change; recall recrawled Nov 11, still not indexed; totals 42/165 unchanged |
| 2026-11-13 | Oct 14–Nov 10 (28d) | 8 | 171 | "clipsx" 8 clicks/113 imp; zero generic; 7d clicks 3→4; no watchlist change; totals 42/165 unchanged (report Nov 9); discovered 3→0, crawled-not-indexed 125→127 |
| 2026-11-14 | Oct 14–Nov 10 (28d) | 8 | 171 | IDENTICAL to Nov 13 — no new data (performance still through Nov 10, indexing report still Nov 9); zero generic; no watchlist change |
| 2026-11-15 | Oct 16–Nov 12 (28d) | 9 | 172 | First new data since Nov 13: clicks 8→9, pos 8.6→7.2; still zero generic (all 9 clicks "clipsx"); 7d 4/38/10.5%/3.3; indexing report still Nov 9, totals 42/165 unchanged; no watchlist change |
| 2026-11-16 | Oct 17–Nov 13 (28d) | 9 | 173 | Essentially flat (9/172→9/173); still zero generic; 7d 4/37/10.8%/3.1; indexing report updated to Nov 13: 42/167 (not-indexed +2, discovered 0→2); no watchlist change |
| 2026-11-17 | Oct 18–Nov 14 (28d) | 8 | 178 | Clicks 9→8, imp 173→178, pos 7.2→6.7; still zero generic (all 8 "clipsx"); 7d 4/44/9.1%/2.7; indexing report still Nov 13, totals 42/167 unchanged; /en recrawled Nov 16 21:35, still indexed; no watchlist change |
| 2026-11-19 | Oct 20–Nov 16 (28d) | 10 | 178 | Clicks flat 10, imp 179→178, pos 6.7→5.6; still zero generic (all 10 "clipsx"); 7d 4/51/7.8%/3.0; indexing report still Nov 13, totals 42/167 unchanged; /ja recrawled Nov 19 02:02, /en/download recrawled Nov 18 16:51, both still indexed; no watchlist change (4 docs pages still crawled-not-indexed, no new crawl since Nov 10/11) |
| 2026-11-18 | Oct 19–Nov 15 (28d) | 10 | 179 | Clicks 8→10, imp 178→179, CTR 4.5%→5.6%, pos 6.7 flat; still zero generic (all 10 "clipsx"); 7d 5/51/9.8%/2.6 (all 5 clicks from /en); indexing report still Nov 13, totals 42/167 unchanged; no watchlist change (4 docs pages still crawled-not-indexed, no new crawl since Nov 10/11) |
