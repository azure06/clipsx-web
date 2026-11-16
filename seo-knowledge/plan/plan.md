# Write / Change Plan — ranked from accumulated data

Ranking criteria (Gabriele, 2026-11-10): proven search demand → winnability
for a low-authority site → conversion intent. Every item cites its evidence.
Re-ranked weekly (Monday scan) and whenever collection data changes something.

Last updated: 2026-11-17 (collect run ~04:30 JST: Clipster now #2 in the EN
limit query too — consolidating across both Windows clipboard queries;
windowsforum.com new #7 in the limit query with a workflow-use-case format;
JA 復元 churned again (isshin-kikaku out, two stale pages in, tokhimo #1
still DNS-dead); techdows' slide-master guide updated 5 days ago; JA
shortcuts query took an Indonesian page at #3; PPT file-too-big cluster
unchanged; NEW names Trailback + lazyscheme.com).

## STRATEGY NOTE — the roundup distribution gap (2026-11-16, 22:30 run)

Evidence: the first check of "best free clipboard manager windows"
(2026-11-16 ~22:30 JST) returned 5 roundup pages and ClipsX in NONE of
them — textexpander.com #1, barside.space #2, edgedrop.app #3 + #4,
slashit.app #5. TheTestedHub's roundup (found the same evening) also
omits ClipsX. Ditto wins Windows in every roundup as the default free,
open-source pick; Paste wins Mac. These roundups ARE the top 10 for a
high-intent "pick a tool" query, and no problem article outranks them
for it — the gap cannot be closed by writing another how-to. The fix is
a different kind of effort: getting ClipsX listed (outreach to the
roundup authors — TextExpander, Barside, Edge Drop, Slashit,
TheTestedHub — plus GitHub presence: stars, a README that states the
free/open-source/cross-platform case in one line, and a winget/Homebrew
install path, since Ditto's listing always cites winget/Chocolatey/
Microsoft Store availability). ClipsX's differentiators vs Ditto
(cross-platform, modern UI, semantic search, MCP, Recall) are exactly
what no roundup currently lists as a category — that is the pitch, not
"another clipboard manager". This is a proposal for Gabriele, not a
plan item yet: it needs his call on outreach, and it sits outside the
article queue. (core-adjacent: distribution, not a topic)

## Topic mix — the standard (agreed with Gabriele 2026-11-16)

Not every article has to be about clipboard/PowerPoint directly. Google
rewards topical authority over a problem space, not one keyword. Target mix
across the plan: ~60–70% CORE problem space (clipboard history/limits/
failures/comparisons; PowerPoint file size, slide masters, formatting),
~20–30% ADJACENT problems the same user has (ClipsX: Windows/macOS
productivity, copy-paste workflows, snippets, screenshot/OCR-to-text; XKey:
slide design/layout, Excel→PowerPoint, presentation workflow), ~10% PRODUCT
itself (releases, how-the-app-does-X — low traffic by nature). Hard rule:
every item is one step from a problem the product solves, with a natural
path to the product in the article. Unrelated topics are out even with
demand. Tag items core / adjacent / product when re-ranking.

## WRITE — in order

1. **Windows 11 clipboard history limits (EN+JA) — ClipsX** · STATUS: ✅ PUBLISHED
   2026-11-15 — /en/blog/windows-clipboard-history-limit and
   /ja/blog/windows-clipboard-history-limit now live in the sitemap (both 200,
   title/meta/canonical present; first seen in the 2026-11-15 16:29 JST
   collection run). Not yet seen ranking for "windows clipboard history limit"
   (checked same run: edgedrop.app #1, hp.com #2, screensnap.pro #3,
   technobezz.com #4, umatechnology.org #5 — no clipsx.app). Next: watch for
   first impressions/clicks in GSC and first SERP appearance.
   Evidence: autocomplete "windows clipboard history limit (increase)",
   "windows 11 clipboard history limit", JA「履歴 上限 増やす」; two how-to
   sites published this exact topic 2026-11-08; Windows = 56–61% of visits.
   2026-11-16 collect run 22:30 — EN top 8 IDENTICAL to the 16:30 run;
   the ClipsX article is still not ranking on day 2. JA query
   「クリップボード 履歴 上限」 CHURNED hard: Cresotech (Chrome
   extension, pages upd 2026-11-09/10) took #1 AND #4, bullcom.jp
   (JA repair-shop blog, pub Oct 20, Ditto angle) entered at #3, and
   Clipster + minto.tech dropped OUT of the shown top 5. The live JA
   article is not ranking for this query either. Cresotech's weakness
   is the same as clipboardman's: browser-only history (Chrome must
   be open). Our JA article's desktop-wide angle stands — the gap is
   ranking/visibility, not content. Borrow bullcom's format trick:
   "tool safety" caution sections (official download source, passwords
   in history, work-PC permission) are the trust content a JA reader
   expects before installing.
1a. **Clipboard history not working (Win+V troubleshooting) — ClipsX** ·
   TOP UNWRITTEN ITEM (promoted 2026-11-16 weekly scan).
   Evidence: the freshest repeated publishing of any query this week — 7 fix
   guides Oct 21 – Nov 14, 2026: techdows.com (pub 2026-10-21, upd 2026-11-03),
   cloudhousetechnologies.com (2026-10-27), vividrepairs.co.uk (~2026-11-05),
   medium.com/@rageeditzzz (Nov 4), clipster-app.com (~Oct 30),
   clipboardman.com (~Nov 3), supportyourtech.com (updated Nov 14, 2026).
   Autocomplete: "windows clipboard history not working" (under "windows
   clipboard history") and "clipboard history not working" (under "clipboard
   history disappeared"). None of the winners mentions a clipboard manager
   as the fallback when built-in history keeps failing — that is our angle:
   ordered fixes first, then "stop fixing Win+V" (persistent manager).
   Brief: seo-knowledge/briefs/clipboard-history-not-working.md. Caution: a
   vendor blog's Group Policy hook from a May/June 2026 update is unverified,
   do not repeat it.
   2026-11-16 collect run — FORMAT DECISION: clipboardman.com (now #4,
   upd ~Nov 3) is the format leader: 30-second PowerShell test to separate
   clipboard vs history, a 5-symptom→cause table with "go to" fix numbers,
   10 fixes ordered by frequency, then a "When Win+V isn't the right tool"
   fallback section. Our article should match that diagnostic structure
   and beat its fallback: clipboardman's pitch is a Chrome/Edge EXTENSION
   (browser-only history); ClipsX is the desktop-wide fallback (every app,
   persistent, searchable). Also: Clipster published its own "Win+V not
   working" guide (~Oct 30, 8 fixes, same diagnostic format) — a direct
   competitor now holds this topic too, so the desktop-wide angle is the
   differentiator, not the format. The other top-5 pages (cloudhouse #1,
   itigic #2, thetekzio #3, technologyerrors #5) are all ordered-fix
   guides with no fallback at all; techdows/vividrepairs/medium dropped
   out of the shown top 5 this run — the query churns fast.
   2026-11-16 collect run 16:30 — the query is now CROWDED: a
   "reddit"-flavoured search surfaced three more not-working guides in
   the same format — umatechnology.org (31 days ago, symptom table +
   "which problem do you have" diagnostic), technologyerrors.com (29
   days ago, Notepad two-copy test first), amarbhattarai.com (Jul 2026,
   Ctrl+V-vs-Win+V distinction). That is 7+ competing guides
   (cloudhouse, itigic, thetekzio, clipboardman, clipster, umatech,
   technologyerrors, amarbhattarai). The diagnostic format is now table
   stakes — every guide opens with "which symptom" and orders fixes.
   2026-11-16 collect run 22:30 — top 4 shown: cloudhouse #1 (still
   leading with the unverified Group Policy KB claim — do not repeat),
   clipster #2 (rose; itigic dropped out of the shown results),
   thetekzio #3, clipboardman #4. Clipster now holds #2 in BOTH the
   limit query and the not-working query — it is consolidating across
   the two highest-intent Windows clipboard queries.
   The desktop-wide fallback is the ONLY differentiator left; the
   article must not be an eighth fix list. (core)
   2026-11-17 collect run — Clipster is now #2 in the EN LIMIT query
   too (edgedrop #1, clipster #2, hp #3, technobezz #4, umatech #5,
   clipboardman #6, windowsforum #7 NEW, edgedrop #8 second article);
   screensnap.pro dropped out. So Clipster holds #2 in limit EN +
   not-working EN. Its limit guide (upd Oct 26) is the cluster format
   to study: short answer + limits table + "why your items disappear"
   (6 reasons) + manager comparison with an honest-limit note + 9
   "Clipster vs X" comparison links. NEW format element from
   windowsforum #7: an everyday-workflow section (copy 3 things, paste
   into 3 fields — data entry / support-ticket use cases). Borrow that
   for the not-working article: show the job, not just the limit. The
   live ClipsX limit article is still not ranking on day 3.
2. **Mac clipboard history: 7-day Spotlight limit + free/open-source options —
   ClipsX**. Evidence: autocomplete "mac clipboard history free / open source /
   like windows / app"; Spotlight guides published Nov 1–9, 2026; max retention
   7 days is the pain hook.
   2026-11-15 winner pattern (winners.md): top 3 (merlin.computer #1, pub.
   2026-11-08; copyagain.app #2; favtray.com #3) all lead with the ⌘Space→⌘4
   answer on the first screen, use a macOS-version table (26.0/26.1/27 vs
   Sequoia) and a priced manager comparison table, and are all written by
   clipboard-tool vendors. None lists a free, open-source, cross-platform
   manager — that is the gap for our article; Maccy is the only free/open-source
   name in their tables and it is Mac-only. Freshness is intense (all three
   published/updated within ~2 weeks), so publish soon after the draft is
   reviewed.
   2026-11-16 weekly scan — URGENCY UP: a wave of "best clipboard manager
   for Mac" roundups landed Nov 1–11 (macfolio Nov 1, notchstar Nov 4,
   clipkeep Nov 6, notchmemo ~Nov 9, Medium Nov 11; Webstarted Maccy-
   alternative comparison ~Nov 1). None lists ClipsX. The draft exists (EN
   only, local) — ship it this week while the freshness window is open.
   2026-11-16 collect run — top 10 churned again: favtray.com out;
   noticky.app in at #3 with a STALE pre-Tahoe page (says Mac has no
   native history, never mentions ⌘Space→⌘4) — a soft slot a correct,
   current article beats on facts alone; typicalmacuser.com in at #6
   (pub Oct 16, upd Oct 21) with the cleanest format in the query — a
   "three layers" structure (one-item clipboard / Spotlight history /
   manager app) plus a Universal Clipboard section. Match that structure
   and add the free/open-source cross-platform row its table lacks.
   2026-11-16 collect run 16:30 — top 6 UNCHANGED vs the 10:40 run
   (merlin, copyagain, noticky, alibaba, eatspud, typicalmacuser).
   New detail: #4 lifetips.alibaba.com holds its slot with WRONG
   instructions (claims a "Cmd+Shift+5 → Show clipboard preview"
   feature that does not exist) — a second soft slot after noticky's
   stale #3. The Mac draft is still unpublished; the freshness window
   is open but the top 10 is stable for now.
   2026-11-16 collect run 22:30 — top 6 UNCHANGED for a third
   consecutive run (10:40, 16:30, 22:30 — a full day stable). New
   detail: merlin.computer now mentions macOS 27 "Golden Gate"
   alongside Tahoe 26, and copyagain.app (upd Oct 31) confirms macOS
   27 — the freshness bar keeps moving while the draft sits
   unpublished. (core)
3. **PowerPoint file too big: causes & fixes (slide masters as one cause) —
   XKey, JA first**. Evidence: rich "powerpoint file too big (to email/send/
   open)" autocomplete cluster; JA「ファイル サイズ 大きい 原因」;
   "too many slide masters" itself has ZERO autocomplete demand — do not
   target that phrase. XKey /ja is the site's click leader.
   2026-11-15 winner pattern (winners.md): #1 slidehub.com (2026-06-24) leads
   with 4 causes + a "lost slides on save" section; #2 compressexcel.com
   (2026-04-05) leads with a before/after hook (85MB → 11MB) + a 5-minute
   checklist; #3 alibaba.com now returns 404 — a dead page holding a top-3
   slot, so the top 10 is soft for a live, maintained page. XKey's angle none
   of the winners has: slide-master cleanup as a concrete in-PowerPoint fix
   (masters are only one bullet in their lists). SlideHub holds two top-5 slots
   with two formats (focused guide + numbered list).
   2026-11-16 weekly scan — NEXT STEP: a send-focused companion article,
   "PowerPoint file too big to email" (autocomplete: to email / to send / to
   open / to send outlook). SlideHub published the companion 2026-10-12 and
   now holds the whole cluster with two cross-linked pages; sendgb.com tool
   page is #2; none of the top 3 offers an in-PowerPoint fix. Same causes,
   send-focused fixes (96 ppi email compression, PDF vs PPTX, cloud link) +
   slide-master cleanup as the in-app fix none of them has.
   2026-11-16 collect run — alibaba.com is BACK at #3 (was 404 on
   2026-11-15, now live again); ideaseed.com.au entered at #5 (pub
   2026-10-19) with a format worth borrowing — the zip-diagnosis opening
   (rename .pptx to .zip, sort ppt/media by size) and a "template is the
   actual fix" section — and it published a second FAQ-style file-too-big
   page, so it is building a cluster like SlideHub. Its slide-master
   section ("forty layouts with a 3MB background photo each is 120MB") is
   the strongest statement of our angle anywhere in the top 10. Still no
   in-PowerPoint bulk fix in the top 5 — XKey's cleanup is the gap.
   2026-11-16 collect run 16:30 — send variant: expertslides.com
   entered at #3 for "powerpoint file too big to email" (upd
   2026-10-22) with the strongest send-guide format in the query
   (diagnose table + step order + which-option-for-which-recipient table
   + pre-send checklist) and ending in its own web-link product pitch —
   same pattern as SlideHub. Main cluster: xlncad.com (Excel MVP,
   upd 2026-11-12) published a fresh "Reduce PowerPoint File Size: 6
   Ways That Work" (zip diagnosis + delete unused layouts). The cluster
   keeps growing and stays fresh — the JA-first file-too-big article
   should not wait long. The send companion should match expertslides'
   structure and end with XKey's in-app bulk cleanup, the fix none of
   the send guides has. (core)
   2026-11-16 collect run 22:30 — send variant top 4 UNCHANGED
   (slidehub #1, sendgb #2, expertslides #3, compressexcel #4);
   main cluster stable too. No XKey ranking yet.
   2026-11-17 collect run — main cluster UNCHANGED again (slidehub #1 +
   #4, compressexcel #2, alibaba #3, ideaseed #5). The cluster is stable
   this week; the JA-first file-too-big article should still not wait
   long — ideaseed keeps publishing in the cluster. (core)
4. **Slide master problems (JA): 反映されない / 削除できない / 差し替え — XKey**.
   Evidence: JA autocomplete problem cluster; ties to existing JA slide-master
   content; XKey's audience is demonstrably Japanese.
   2026-11-16 winner pattern (winners.md, JA query 「スライドマスター
   反映されない」): #1 writers-hub.co.jp (pub 2026-11-02, updated 2026-11-04)
   is an explainer with a "3 causes" troubleshooting section; #2 minto.tech
   is a 19-section complete guide whose section 15 ("変更が反映されないとき
   の原因と対処｜ここが最重要") is a symptom→cause→fix table + 4 detailed
   causes; #3 is a 3-step PDF from ~2022. EN query "powerpoint slide master
   not applying": #1 techdows.com is likewise a complete guide with the fix
   inside; #2/#3 are WPS Q&A fix pages (Oct 2026) that each end with a WPS
   Presentation pitch. Format decision: write the complete guide with a
   strong dedicated 反映されない section, not a narrow fix post — and beat
   them with the angle none has: fixing masters across the whole deck at
   once (XKey's slide-master cleanup), where every winner fixes one slide
   or one layout at a time (Reset per slide).
   2026-11-16 weekly scan — demand confirmed by a vendor flood: WPS
   published THREE near-identical Q&A fix pages into this query in two
   weeks (Oct 12, 877 views; Oct 20, 873 views; Oct 26, 872 views), each
   ending in a WPS pitch. Techdows' complete guide updated ~Nov 12.
   2026-11-16 collect run — NEW ANGLE, very winnable: the JA query
   「スライドマスター 削除できない」 (first check) is thin and mostly
   English — #1 myexcelonline (EN, about EXITING master view, not
   deleting), #2 copyprogramming (EN, complete 5-method guide incl. VBA
   macro + add-ins), #3 Microsoft Support JA docs, #4 calendar-uk (EN
   Q&A), #5 vba.intronational.com (the only JA page, a VBA purge macro,
   pub 2026-10-19, warning that Ctrl+Z does not work after VBA deletion).
   No JA guide answers "why can't I delete it / Delete is greyed out"
   as its main topic. Make 削除できない a named section of the JA guide
   (greyed-out Delete = master in use → reassign slides → delete; bulk
   purge of unused masters), ending in XKey's one-click cleanup instead
   of a macro or a paid add-in — the VBA page's own warnings (no undo,
   back up first) are the opening.
   2026-11-17 collect run — EN "not applying" re-check: techdows #1
   (complete guide, UPDATED 5 days ago — the freshest page in the query),
   WPS Q&A #2/#3 (Oct 12/20, 877/873 views), MS Q&A #4/#5, a stale PDF
   #6. Techdows' format confirms the plan: complete guide with a strong
   dedicated "changes not showing" section (3 causes), plus per-platform
   paths and a copy-master/save-as-template tail. The whole-deck angle
   (XKey cleanup at once vs Reset per slide) is still unclaimed.
5. **Clipboard history disappeared / recover it (EN+JA) — ClipsX**.
   Evidence: "clipboard history disappeared", "how to recover deleted
   clipboard history", JA「クリップボード 履歴 復元」 autocomplete clusters.
   Honest angle: built-in history often can't recover it; persistent history
   is the fix → conversion intent is high.
   2026-11-15 winner pattern (winners.md): #2 edgedrop.app owns the honest
   angle ("clipboard history isn't undo", ordered recovery: Ctrl+Z → app
   recovery → Win+V last); #1 myrecover.com pushes weak methods (temp files,
   System Restore) and a recovery-software pitch; #3 clipbook.app (Mac) owns
   the deleted-item Trash feature. Our article should copy edgedrop's ordered
   structure and beat it with the prevention angle it only gestures at:
   persistent history (ClipsX) means the text is still there after a restart.
   2026-11-16 winner pattern (winners.md, JA query 「クリップボード 履歴
   復元」): the JA top 10 is thin — only 2 results shown, both iPhone-angled:
   #1 sales-tool.tokhimo.com is unreachable (DNS failure, checked 2026-11-16)
   and #2 isshin-kikaku.com is a stale (~380 days) iPhone guide. No
   Windows-focused JA recovery article ranks. Lead the JA version with the
   honest answer (Ctrl+Z → re-copy → pin → persistent manager) — it can own
   this query.
   2026-11-16 collect run 16:30 — BRIEF WRITTEN:
   seo-knowledge/briefs/clipboard-history-disappeared-recover.md. The
   recover query is vendor-guide crowded and churns by phrasing: for the
   variant "clipboard history disappeared how to recover", clipbook.app
   rose to #1 (was #3), techdows.com entered at #3, edgedrop.app dropped
   out of the shown top 4. Format decision stands (honest short answer +
   ordered recovery + "what won't help" + prevention angle) — clipbook
   and octoclip both use it now. New names: octoclip.app (#4,
   cross-platform manager, free tier + one-time license, syncs devices —
   closest positioning overlap after Clipster) and clipbook.app (Mac,
   Trash feature: deleted items recoverable 1 month). Answer ClipBook's
   Trash honestly — ClipsX has no Trash; the hook is persistent
   searchable history + Recall (find the lost text by what it meant).
   (core)
   2026-11-17 collect run — "clipboard history disappeared how to
   recover" (EN): clipbook #1, myrecover #2, techdows #3, octoclip #4;
   edgedrop OUT. JA 「クリップボード 履歴 復元」: tokhimo #1 STILL
   DNS-unreachable (2nd consecutive run — a #1 page that does not load),
   datarecoverypit #2 (stale ~1706 days), umatechnology #3 (~543 days);
   isshin-kikaku OUT. Still no Windows-focused JA recovery article in
   the top 10 — the JA recover article remains the winnable opening.
6. **PowerPoint shortcut keys list / 早見表 (EN+JA) — XKey**.
   Evidence: "powerpoint shortcut keys (pdf/cheat sheet)", JA「ショートカットキー
   一覧・早見表」; /en/product/shortcuts already indexed (Nov 7 crawl) so a
   real resource page builds on an indexed URL.
   2026-11-15 winner pattern (winners.md, JA query): #1 enpreth.jp is an
   exhaustive 9-category table but ~2.5 years stale; #2 kulau.jp is a curated
   16-shortcut list with mnemonics (updated 2026-05-26); #3 helpaso.net is an
   exhaustive list citing Microsoft's official JA page, updated 2026-05-26.
   Two formats share the top 10: exhaustive table vs curated+mnemonic. A fresh,
   complete JA list with a downloadable cheat-sheet angle is the gap.
   2026-11-16 collect run 16:30 — keyficient.co, an EN tool page
   (searchable raw Alt-key table, no JA, no categories, no Ctrl section),
   rose from #4 to #1 for the JA query 「パワーポイント ショートカット
   一覧」; enpreth dropped to #2, a Korean page dropped out. A raw
   searchable table beats curated JA guides on lookup usability — that
   is why it ranks #1 despite being EN-only. Our JA article should be
   BOTH: a complete categorized JA table (to match enpreth/helpaso) AND
   a searchable/curated layer (to beat keyficient) — a "16 to learn
   first with mnemonics" section (kulau's format) on top of the full
   table, plus the downloadable cheat sheet nobody in the top 10 offers.
   (core)
   2026-11-17 collect run — JA query churned again: keyficient still #1,
   enpreth #2, an INDONESIAN list page at #3 (NEW), helpaso #4, kulau #5,
   slideformation (EN exhaustive list) #6 NEW; the Korean page dropped
   out. A non-JA page at #3 for a JA query shows how thin JA supply is —
   the fresh complete JA table + searchable/curated layer still has a
   clear opening.
8. **AI clipboard managers compared (Nov 2026): the paid Mac rival went
   subscription — ClipsX**. Added 2026-11-16 weekly scan (refresh of the
   2026-11-10 scan's idea 1). Evidence: Stashcut 1.1 shipped 2026-11-10 and
   switched from the €29 one-time launch price to a €2.99/month subscription
   (stashcut.com/changelog); Copyla 1.3.0 (2026-11-08) added iCloud sync;
   ClipBoardy 2.0 (2026-11-01) went free download + encrypted history. The
   paid Mac AI-clipboard niche keeps filling while ClipsX stays free,
   open-source, cross-platform, with 8 MCP tools. Honest caveat: "semantic
   search clipboard" still has ZERO autocomplete demand — lead with the
   comparison ("best AI clipboard manager") and the price change as the hook,
   not with the semantic-search phrase. Honest losses to state: Stashcut's
   one-button agent setup and secret detection are ahead.

## CHANGE — existing pages

- **/en/download (ClipsX): 39 impressions, 0 clicks (28d to Nov 7).**
  Watch next GSC pulls for which queries show it; then rewrite title/meta to
  match that intent. Do not guess yet — data first.
- **JA meta descriptions** are short on several pages (39–50 chars):
  clipsx /ja/recall, /ja/blog; xkey /ja/product/teams, /ja/pricing.
  Low-effort polish when touching those pages anyway.
- **Blog strategy correction:** stop leading with local-first/AI themes
  (indexed, ~0 impressions). New posts target the problem queries above;
  Meaning Search/MCP appear inside them as the answer, not the headline —
  "semantic search clipboard" has zero autocomplete demand (2026-11-10).

## WATCH — via the recurring collection

- Whether the 11 indexing requests (2026-11-10) flip pages to Indexed
  (daily GSC run) + docs/recall request (Nov 11).
- First generic-query impressions/clicks on either site — the signal this
  whole plan is working.
- New autocomplete suggestions on the seed terms (checked every 6h) —
  emerging demand gets promoted into this plan.
- New competitors in the free clipboard-manager space (spotted 2026-11-16):
  Barside (free, privacy-first, Windows/Linux/Mac — closest positioning
  overlap with ClipsX; ranks #2 for "best free clipboard manager windows"),
  Edge Drop (free, Apache 2.0, Windows-only; owns #1 for "windows clipboard
  history limit" and ranks across clipboard queries), Ortu (free, open-source,
  cross-platform; dev.to 2026-07-03). None of the "best free clipboard
  manager" roundups lists ClipsX — watch whether ClipsX gets picked up, and
  whether Barside/Ortu start ranking for our target queries.
- Clipster (clipster-app.com) — ELEVATED 2026-11-16 to the competitor to
  watch most closely: cross-platform clipboard manager (Mac/Windows/iPhone),
  free, end-to-end encrypted sync; holds #2 for "windows clipboard history
  limit" (upd Oct 26) with a guide in exactly our format, and published its
  own "Win+V not working" guide (~Oct 30, 8 fixes) on our plan-1a topic.
  Its honest-limit note concedes Ditto/CopyQ keep more history on Windows;
  ClipsX should not concede that ground. Watch whether Clipster starts
  ranking for "mac clipboard history" and "clipboard history disappeared".
- minto.tech is rising across JA queries (#1 for 「クリップボード 履歴 上限」,
  #2 for 「スライドマスター 反映されない」) — a JA competitor site to watch.
- Ideaseed (ideaseed.com.au) is building a PowerPoint file-size cluster
  (180MB narrative guide Oct 19 + FAQ-style "Why Is My PowerPoint File So
  Large?" page) — a design-agency competitor in the XKey file-too-big
  query; watch whether it starts ranking for the slide-master queries.
- Octoclip (octoclip.app) — NEW 2026-11-16: cross-platform clipboard
  manager (iPhone/Android/Windows/Mac, free tier + one-time license,
  cross-device sync), ranks #4 for "how to recover copied text" with an
  honest-angle guide (pub Jun 11, upd Oct 11). Closest positioning
  overlap with ClipsX after Clipster; watch whether it starts ranking for
  "mac clipboard history" and "clipboard history not working".
- ClipBook (clipbook.app) — NEW 2026-11-16: Mac clipboard manager whose
  Trash feature (deleted items recoverable, 1-month default) is its hook;
  holds #1 for the "clipboard history disappeared how to recover" variant
  (pub Oct 22). Watch whether it starts ranking for "mac clipboard
  history".
- xlncad.com (Excel MVP Ajay Anand) — NEW 2026-11-16: fresh "Reduce
  PowerPoint File Size: 6 Ways That Work" (upd Nov 12, zip diagnosis +
  delete unused layouts) in the XKey file-too-big cluster.
- Cresotech / Clipboard Tool (cresotech.com) — NEW 2026-11-16: Chrome
  extension clipboard tool (history free; text shortcuts $2.99/mo,
  $14.99/yr, $24.99 lifetime; v1.4.5, upd 2026-11-10; 52 languages,
  JA-localized). Took #1 AND #4 for JA「クリップボード 履歴 上限」
  with pages updated 2026-11-09/10, pushing Clipster and minto.tech
  out of the shown top 5. Browser-only history (Chrome must be open)
  — same weakness as clipboardman's extension. Watch whether it
  starts ranking for the EN limit query and "mac clipboard history".
- BULLCOM (bullcom.jp) — NEW 2026-11-16: Kobe/Akashi PC repair-shop
  blog; JA Win+V guide (pub Oct 20, 2026) entered at #3 for
  「クリップボード 履歴 上限」 with a Ditto angle + "tool safety"
  caution sections. Watch whether the shop keeps publishing
  clipboard topics.
- NotchDodo — NEW 2026-11-16: Mac clipboard manager living in the
  notch (Product Hunt discussion updated 2026-11-15). Niche Mac
  competitor; watch for a ranking page.
- Recento (1dot.ai) — NEW 2026-11-16: Mac clipboard + recent-files
  overlay, free / $19.99 lifetime; 1dot.ai publishes comparison
  content (Alfred vs Raycast clipboard, Spotlight vs Recento) that
  pitches it. Watch whether it starts ranking for "mac clipboard
  history".
- TheTestedHub (thetestedhub.com) — NEW 2026-11-16: "Copy Paste
  Manager" roundup (PastePal / Ditto / CopyQ / Unclutter /
  Clipboard Pro) — no ClipsX. Another roundup in the distribution
  gap (see STRATEGY NOTE above).
- Trailback (trailback.app) — NEW 2026-11-17: Mac clipboard manager
  pitched as "find something you saw but never copied — search by what
  you remember". Its builder published a Mac clipboard-history guide on
  Medium (2026-11-12) that gets the Tahoe/26.1 retention facts right.
  This is the closest semantic/Recall-adjacent competitor spotted yet —
  it pitches ClipsX's Meaning Search/Recall angle for Mac. Not yet in
  any SERP top 10 checked; watch whether it starts ranking for "mac
  clipboard history".
- lazyscheme.com — NEW 2026-11-17: "Reduce PowerPoint file size" guide
  (upd 22 days ago) citing Microsoft docs (compress pictures/media,
  fonts, Excel objects; one-change-at-a-time method). A new entrant in
  the XKey file-too-big cluster; watch whether it starts ranking for
  the file-size queries.
