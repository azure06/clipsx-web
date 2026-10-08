# Public navigation and Recall page

The public header uses two grouped menus and three direct evaluation links. The
Product menu contains Product overview, Recall, Meaning Search, and Extensions.
The Developers menu contains the developer overview, extension documentation,
the source repository, and Changelog. Docs, Blog, and Pricing are direct links,
with Blog immediately before Pricing. FAQ and Contact remain available from
the footer. Download is the header's
primary action and continues to resolve release availability on `/download`.
Download remains visible beside the menu button on compact headers. Sponsor
appears as a muted 13px text action beside Download on desktop and above Download
inside the compact menu, without a border or background. Keyboard focus remains
visible and the mobile touch target is at least 44px tall. It is not duplicated
among the direct navigation links.
Footer and homepage support links remain available. Its verified default is
`https://github.com/sponsors/azure06`.
`NEXT_PUBLIC_SPONSOR_URL` overrides that default; an empty value hides the links.
Public documentation links send readers to `NEXT_PUBLIC_DOCS_URL`, defaulting
to `https://docs.clipsx.app`. User guides are localized under `/ja/`; developer
guides stay English. Feature-specific links use `/meaning-search`, `/recall`,
`/extensions`, `/privacy`, and `/sync`; `/local-ai` owns shared model setup.
Mintlify owns documentation routes;
the public app links directly to that documentation host.

Desktop menus open on explicit activation, close on outside interaction or
Escape, expose menu semantics, and support Arrow Up, Arrow Down, Home, and End.
The compact header uses accordion sections instead. Account controls and GitHub
remain independent of the marketing navigation.

## Recall marketing page

`/[locale]/recall` is a localized product explanation, not a Recall service.
Its client-side evidence story uses three bundled examples. Visitors can change
the example, open citations, inspect excerpts, and reset the scene. The page
does not accept arbitrary prompts, access clipboard history, contact Ollama, or
call a website backend.

The copy follows the desktop implementation:

- Recall runs only after explicit invocation and within the visible scope.
- It retrieves bounded evidence before using a configured local generation
  model. Meaning Search is helpful but keyword-centered fallback remains.
- Detected secret-faceted clips are excluded without an override.
- Citations remain inspectable and generated answers remain fallible.
- Temporary questions and answers do not become canonical clip metadata.

## Meaning Search guide and feature-page presentation

`/[locale]/docs/meaning-search` keeps its existing URL and metadata for inbound
compatibility and renders
the server component `MeaningSearchGuide`. It provides a query/result illustration,
in-page navigation, a three-step retrieval explanation, eligible text sources,
Ollama prerequisites with a maintained setup-guide link, local-processing boundaries, and native expandable questions
covering unavailable providers, relevance, similarity percentages, and index recovery.
The illustration is static sample content, not a working search or a model call.
Its documentation links connect to the localized Mintlify Meaning Search and privacy pages;
product links continue to connect to `/recall` and `/download`.

Recall and Meaning Search share the scoped `recall.module.css` visual system:
responsive editorial columns, dark example surfaces, visible violet focus rings,
and light/dark system-theme support. The Recall hero now shows a cited everyday
example instead of the decorative letter illustration. Its evidence story labels
all data as illustrative and generated; citations expose pressed state and the
inspector relationship, with live announcements when evidence changes. Reset
restores the first question and source. The layout supplies the single main landmark.
Section anchors account for the fixed header, and reduced motion disables smooth
anchor scrolling on these pages. No dependencies, routes, or backend behavior change.

Feature claims were checked against `../clipsx/docs/SEMANTIC_SEARCH_ARCHITECTURE.md`
and `MODELS.md`: semantic retrieval is optional, generation is a separate
capability, OCR input requires completed artifacts, percentages are similarity
scores rather than confidence, and deleting derived indexes preserves clips and
exact search. Ordinary clip updates refresh that clip; model changes build a
replacement index. Capacity targets and benchmark timings are not product claims.

## Documentation and changelog

The footer includes the localized Identity Studio link at `/identity-studio`.
It remains a secondary brand reference rather than a header destination.
The page retains noindex/nofollow metadata and is excluded from the sitemap.
Footer links use the shared keyboard-focus treatment.

The existing localized Docs route remains available for inbound compatibility.
The public UI now directs readers to the English Mintlify documentation site.

The Changelog lists the published v0.1.0 release from October 3, 2026.
`src/content/changelog.ts` records the source URL, publication timestamp,
localized highlights, and platform/upgrade limits. New entries require
published release evidence; release history is editorial content.
The Download page remains the source of truth for artifact availability.

## Verification

Run `npm run test:unit`, `npm run typecheck`, `npm run lint`, and `npm run build`.
Verify the two desktop menus and compact accordions in English and Japanese;
exercise keyboard traversal, Escape restoration, outside dismissal, direct Docs
Blog and Pricing navigation, Recall citations/reset, footer links, and the
Changelog release entry. For both feature pages, check English and Japanese at 390, 768,
1024, and 1440 CSS pixels in light/dark modes; verify no horizontal overflow,
one h1 and one main landmark, working anchor targets, and readable example panes.
Exercise all Recall questions, both citations, source buttons, and reset with
pointer and keyboard. Open Meaning Search questions with click and Enter/Space;
check setup/privacy/cross-feature links. Reduced-motion mode must avoid smooth
scrolling and animation. Screenshots should cover the hero and the evidence panel.
