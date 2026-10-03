# SEO and acquisition

## Commercial posture

ClipsX's initial public motion is self-service adoption of the Free desktop app.
Visitors should understand the product, select an installer, and reach their
first useful clip without needing an account, local models, or a purchase.
Pro is a Coming soon teaser. Its feature lineup and pricing are revealed at
launch; no price, paid entitlement, release date, or checkout is advertised.

Download is the primary acquisition action. Blog appears immediately before
Pricing in desktop and compact navigation. Sponsorship is a separate support
intent, exposed in header and footer only when `NEXT_PUBLIC_SPONSOR_URL` is set
to a verified live destination. This public build-time value requires a rebuild.
GitHub's API returned `hasSponsorsListing: false` for `azure06` on October 3,
2026, so a GitHub Sponsors link must remain unset until the listing is enabled.
Sponsorship does not purchase Pro or create a billing entitlement.

## Search implementation

`src/lib/seo.ts` owns localized page metadata and the public-route inventory.
Every indexable marketing page sets its own canonical URL, reciprocal English
and Japanese alternates, English x-default, localized description, Open Graph
URL/locale, and sharing title/description. A locale layout does not set a
canonical that child pages could accidentally inherit.

`src/app/sitemap.ts` exclusively generates `/sitemap.xml`. Only public marketing
pages and existing blog articles appear. Blog lastmod uses its editorial date;
undated pages omit lastmod rather than claiming every build changed content.
`src/app/robots.ts` exclusively generates `/robots.txt`. The postbuild
next-sitemap generator, dependency, config, and obsolete ignored public output
are removed so they cannot conflict with
Next.js metadata routes or include private pages through auto-discovery.
Account, Vault, sign-in, and sign-up layouts carry noindex metadata.
Robots directives are search hints, not authorization or privacy controls.

The homepage describes a free clipboard manager in its search title and
description, while retaining its visual headline. SoftwareApplication JSON-LD
describes the existing Free app. Blog articles use BlogPosting JSON-LD with the
actual editorial date, title, language, and organization attribution. Neither
schema invents ratings or testimonials, and neither guarantees a rich result.
JSON-LD serialization escapes `<` before inserting content in a script element.

Blog cards link their titles and have descriptive article link labels. Article
pages show publication dates, breadcrumbs, reading estimates matching the short
articles, and a download route after reading.
The locale layout owns the main landmark and provides a keyboard skip link;
feature pages and the changelog do not nest additional main landmarks.
The compact header keeps Download visible outside the expanded menu.
Installer cards stack actions beneath their details at narrow widths so long
Japanese labels do not squeeze the platform text into a vertical column.
When release metadata cannot be verified, the recovery link appears before
the unavailable installer cards.

## Evidence and decisions

Review date: October 3, 2026. This review uses the Sales plugin's initial sales
motion workflow, repository evidence, published release evidence, and primary
search/usability guidance. No funnel analytics or Search Console data were
supplied; conversion and ranking improvements remain hypotheses to measure.

| Finding | Evidence | Implemented response |
| --- | --- | --- |
| Two sitemap owners caused HTTP 500 at `/sitemap.xml` and `/robots.txt` in the existing checkout | Old ignored public generator output conflicted with App Router routes; build alone passed | Remove generator and stale output; one public sitemap with page-specific locale alternates |
| Most marketing pages omitted canonicals and localized sharing metadata | Page metadata exports; Product was the exception | Shared metadata helper on all public marketing pages |
| Undated pages claimed a fresh modification on every sitemap generation | Previous `new Date()` for every entry | Editorial dates for articles; omit unknown dates |
| Blog was absent from primary navigation | Previous `mainNavLinks` contained only Docs and Pricing | Blog directly before Pricing in both header variants |
| Release history contradicted publication | [Published v0.1.0](https://github.com/azure06/clipsx/releases/tag/v0.1.0), timestamp `2026-10-03T02:39:45Z` | Localized, sourced first changelog with upgrade limits |
| Setup docs and FAQ described unavailable Mac/installers | Documentation index, getting started, platform support, troubleshooting, FAQ | Current package matrix and first-copy steps |
| Pricing repeated unfinalized-plan language | Previous Pro card and future-tier copy | Concise Coming soon teaser with Free adoption path |
| Several routes nested main inside the locale layout's main | Extensions and Changelog page roots | One main landmark, skip link |
| Sponsor listing unavailable | GitHub GraphQL `hasSponsorsListing` | Conditional support link; retain Download as primary |
| Public content depends on auth availability | Locale layout awaits `getUser`; proxy awaits session update. Local logs reported auth fetch retries and an `/en` response taking 25.5 seconds during an auth-service failure | Remaining architecture issue: separate public content delivery from account-menu/session lookup; no healthy-production latency claim follows from this local failure |

Google recommends self-consistent canonical signals and reciprocal language
alternates: [canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
and [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions).
[Sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
requires accurate significant-modification dates. NN/g's
[menu checklist](https://media.nngroup.com/media/articles/attachments/PDF_Menu-Design-Checklist.pdf)
supports descriptive destination labels and visible primary navigation.
Keeping Download primary and Sponsor secondary is a sales/UX inference based
on their different user goals, not an observed conversion lift.

## Remaining decisions and measurement

Suggested owner: site maintainer. Before the next acquisition campaign:

1. Enable GitHub Sponsors, then configure its live URL and verify both headers
   and the footer. Outcome: a working voluntary support path.
2. Submit `/sitemap.xml` in Google Search Console and inspect both locales of
   Home, Download, Blog, and Pricing. Outcome: evidence of canonical selection,
   indexing, impressions, and query intent. Requires property access.
3. Use existing public-route analytics and Speed Insights to establish an
   acquisition baseline before adding tracking. Track landing page to download
   page movement; installer clicks and first successful desktop reuse require
   separate measurement design. Visits alone do not establish activation.
4. Expand the short existing articles into useful task-focused guides from
   actual workflows. Their current depth is limited; technical metadata cannot
   substitute for useful content. Avoid unsubstantiated time-saving claims.
5. Complete operator identity, jurisdiction, and legal review in the existing
   Privacy/Terms launch drafts. Their visible draft status remains a trust gap;
   this review does not invent the missing legal facts.
6. Make public marketing delivery resilient to auth-service outages. Preserve
   session security on account/Vault routes while preventing account-menu
   identity lookups from blocking public content. Reproduce the local retry
   failure under controlled conditions before selecting timeout or streaming
   behavior; the observed 25.5-second request is failure-path evidence, not a
   production performance baseline.

## Verification

Run unit tests, typecheck, lint, and production build. Verify rendered canonical,
hreflang, Open Graph URLs, article schema, sitemap entries, and noindex layouts.
Review Blog, Pricing, Download, and Changelog in English/Japanese and both
themes, with the compact header, keyboard focus, and reduced motion. Confirm
working setup/download links and no horizontal overflow at narrow widths.

The implementation review passed 112 unit tests, typecheck, production build,
and lint (zero errors; existing Vault warnings remain). Direct HTTP checks
verified all 34 public pages' canonical/locale metadata and single main/h1,
34 sitemap URLs, working sitemap/robots endpoints, and auth noindex metadata.
Live release data exposed all five versioned installer links. Desktop/compact
browser review covered both languages and light/dark presentation; the Japanese
installer-card issue found during that review was corrected.
