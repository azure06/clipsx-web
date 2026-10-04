# SEO and acquisition

## Commercial posture

ClipsX's initial public motion is self-service adoption of the Free desktop app.
Visitors should understand the product, select an installer, and reach their
first useful clip without needing an account, local models, or a purchase.
Pro is a Coming soon teaser. Its feature lineup and pricing are revealed at
launch; no price, paid entitlement, release date, or checkout is advertised.

Download is the primary acquisition action. Blog appears immediately before
Pricing in desktop and compact navigation. Sponsorship is a separate support
intent, exposed as a muted 13px desktop header link beside the stronger Download
button and as a quiet text action in the compact menu, without a duplicate
navigation link. Footer and localized homepage support links remain available.
The verified live default is `https://github.com/sponsors/azure06` (GitHub API
`hasSponsorsListing: true`). `NEXT_PUBLIC_SPONSOR_URL` overrides that destination;
an explicitly empty value hides support links. Changes require a rebuild.
Sponsorship does not purchase Pro or create a billing entitlement.

## Search implementation

`src/lib/seo.ts` owns localized page metadata and the public-route inventory.
Every indexable marketing page sets its own canonical URL, reciprocal English
and Japanese alternates, English x-default, localized description, Open Graph
URL/locale, and sharing title/description. A locale layout does not set a
canonical that child pages could accidentally inherit.

`src/app/sitemap.ts` exclusively generates `/sitemap.xml`. Only public marketing
pages and existing blog articles appear. Blog lastmod uses its explicit modification date, falling back to its editorial publication date;
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

Blog content is centralized in `src/content/blog.ts`, with matching English and
Japanese guides, stable section IDs, paragraphs, lists, resources, and image
descriptions. Articles are ordered newest first. The index features the latest
article and presents the remaining entries in a responsive two-column grid.
Article pages provide a takeaway, section navigation, sources, related articles,
and a closing Download action. Reading estimates are derived from localized
text (220 English words or 500 Japanese characters per minute), not fixed values.

Each article has a distinct optimized 1600×900 WebP conceptual illustration.
Dimensions reserve its layout space; captions distinguish illustrations from
product screenshots. Open Graph, Twitter, and BlogPosting metadata use the same
article-specific image and localized description. Publication dates are the
maintainer-selected editorial dates: September 6, September 20, and October 4,
2026. They are not independently verified historical publication timestamps.
Subsequent significant revisions use an explicit modification date; builds do
not change dates automatically.
The locale layout owns the main landmark and provides a keyboard skip link;
feature pages and the changelog do not nest additional main landmarks.
The compact header keeps Download visible outside the expanded menu.
Installer cards stack actions beneath their details at narrow widths so long
Japanese labels do not squeeze the platform text into a vertical column.
When release metadata cannot be verified, the recovery link appears before
the unavailable installer cards.

## Metadata requirements

Canonical URLs, language alternates and significant-modification dates must reflect the actual public pages. Keep one owner for sitemap/robots routes. Download is the primary acquisition action; Sponsor remains secondary. Conversion and ranking improvements require measurement.

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

Web Analytics and Speed Insights share a send-time public-route filter. It accepts
absolute HTTP(S) SDK URLs and root-relative paths, removes all query parameters
and fragments, and rejects private, identifier-bearing or malformed paths. Public
campaign-link visits are counted without retaining campaign values. Account,
Vault, Auth and API events remain excluded even after client navigation from a
public page. No custom installer-click events are emitted. Verify collection in
the Vercel dashboard after deployment; SDK installation alone does not prove intake.

Suggested owner: site maintainer. Before the next acquisition campaign:

1. Keep the GitHub Sponsors profile current with the work it funds. Verify the
   support destination when changing configuration. Sponsorship is implemented.
2. Submit `/sitemap.xml` in Google Search Console and inspect both locales of
   Home, Download, Blog, and Pricing. Outcome: evidence of canonical selection,
   indexing, impressions, and query intent. Requires property access.
3. Use existing public-route analytics and Speed Insights to establish an
   acquisition baseline before adding tracking. Track landing page to download
   page movement; installer clicks and first successful desktop reuse require
   separate measurement design. Visits alone do not establish activation.
4. Keep the existing guides aligned with current desktop workflows and feature
   availability. Local storage, optional services, model setup, and extension
   permissions have distinct boundaries. Avoid unsubstantiated time-saving claims.
5. Maintain the current-service Terms/Privacy policy and the request/retention
   procedure in [Legal pages](legal-pages.md). Vault and Pro billing are confirmed
   inactive; update disclosures before enabling either. Public contact is the
   confirmed `support@clipsx.app` mailbox. No personal name or home address is
   inferred or published. Actual provider configuration and legal applicability
   remain operational follow-ups; publication does not claim legal certification.
6. Make public marketing delivery resilient to auth-service outages. Preserve
   session security on account/Vault routes while preventing account-menu
   identity lookups from blocking public content. Reproduce the local retry
   failure under controlled conditions before selecting timeout or streaming
   behavior; the observed 25.5-second request is failure-path evidence, not a
   production performance baseline.

## Verification

The sponsorship strip follows the download section, using existing typography,
colors, and focus styles, with a stacked layout below 800px. Its heading is
"Built in the open. Backed by you." The body names maintenance, testing, and new
features; the action names its destination, "Sponsor ClipsX on GitHub". It does
not promise sponsor benefits. This is a design hypothesis, not measured lift.
It follows [GitHub profile guidance](https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/editing-your-profile-details-for-github-sponsors)
on explaining funded work and [NN/g link guidance](https://www.nngroup.com/articles/better-link-labels/)
on descriptive, sincere labels.

Run unit tests, typecheck, lint, and production build. Verify rendered canonical,
hreflang, Open Graph URLs, article schema, sitemap entries, and noindex layouts.
Review Blog, Pricing, Download, and Changelog in English/Japanese and both
themes, with the compact header, keyboard focus, and reduced motion. Confirm
working setup/download links and no horizontal overflow at narrow widths.
