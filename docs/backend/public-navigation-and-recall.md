# Public navigation and Recall page

The public header uses two grouped menus and two direct evaluation links. The
Product menu contains Product overview, Recall, Meaning Search, and Extensions.
The Developers menu contains the developer overview, extension documentation,
the source repository, and Changelog. Docs and Pricing remain direct links;
Blog, FAQ, and Contact remain available from the footer. Download is the header's
primary action and continues to resolve release availability on `/download`.
Public documentation links now send readers to the English Mintlify site at
`https://infiniti-82a6b77b.mintlify.site/docs`. Feature-specific
links use the closest published Mintlify page, including `/docs/local-ai`,
`/docs/extensions`, `/docs/privacy`, and `/docs/sync`. The legacy localized
documentation routes remain in the application for existing inbound URLs, but
the public navigation no longer promotes them.

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
Ollama setup steps, local-processing boundaries, and native expandable questions
covering unavailable providers, relevance, similarity percentages, and index recovery.
The illustration is static sample content, not a working search or a model call.
Its documentation links now connect to the Mintlify local-AI and privacy pages;
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
and `ARCHITECTURE.md`: semantic retrieval is optional, generation is a separate
capability, OCR input requires completed artifacts, percentages are similarity
scores rather than confidence, and deleting derived indexes preserves clips and
exact search. Ordinary clip updates refresh that clip; model changes build a
replacement index. Capacity targets and benchmark timings are not product claims.

## Documentation and changelog

The existing localized Docs route remains available for inbound compatibility.
The public UI now directs readers to the English Mintlify documentation site.

The Changelog intentionally shows an empty release ledger until a build is
certified and published through GitHub Releases. The deleted legacy entry was a
hard-coded pre-release claim and was not backed by a published GitHub Release.
The Download page remains the source of truth for artifact availability.

## Verification

Run `npm run test:unit`, `npm run typecheck`, `npm run lint`, and `npm run build`.
Verify the two desktop menus and compact accordions in English and Japanese;
exercise keyboard traversal, Escape restoration, outside dismissal, direct Docs
and Pricing navigation, Recall citations/reset, footer links, and the Changelog
empty state. For both feature pages, check English and Japanese at 390, 768,
1024, and 1440 CSS pixels in light/dark modes; verify no horizontal overflow,
one h1 and one main landmark, working anchor targets, and readable example panes.
Exercise all Recall questions, both citations, source buttons, and reset with
pointer and keyboard. Open Meaning Search questions with click and Enter/Space;
check setup/privacy/cross-feature links. Reduced-motion mode must avoid smooth
scrolling and animation. Screenshots should cover the hero and the evidence panel.
