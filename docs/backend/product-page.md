# Product page

The localized product route is a practical product guide. The homepage owns the
interactive clipboard introduction. Product has no simulated desktop or mock
clipboard controls. It retains visual explanations and an interactive
representation graph, alongside the functional section menu.

Meaning Search, Recall, and extensions lead the page with compact illustrative
examples, prerequisites, an Explore marketing link, and a separate setup guide.
Download remains primary; Getting started is the secondary introduction action.
Recall also retains its focused marketing walkthrough at `/[locale]/recall`.

## Structure

The route is a Server Component, using English/Japanese content in
src/content/product.ts and scoped product.module.css styles. It contains a compact
introduction, product facts, section navigation, three capability demonstrations,
Getting started, a content-format reference,
search and organization details, a capture representation scene, an interactive
transformation graph, preview/reuse steps,
privacy boundaries, FAQ disclosures, and a download close.

Navigation is sticky on desktop and inline on phones/tablets. Reference rows
stack on narrow phones. Native details/summary supports keyboard, mouse and touch
without client JavaScript. All action links have real targets.
ProductRepresentationGraph is the only Product-specific client component.
Selecting a node updates the inspector. Arrow keys, Home and End navigate nodes;
Reset selects the original clip. The graph explains possibilities and does not
claim the desktop includes a workflow editor or execute any transformations.
Desktop uses connected nodes; phones use a readable two-column node layout.
Reduced motion disables edge animation. Clipboard demo code remains removed.

## Claims and links

Core local usage is free and needs no account. Format support depends on source,
platform and capture policy. File references are not cloud backups. OCR depends
on support/configuration; optional Meaning Search requires compatible local
Ollama setup. Ordinary text search needs neither. Clipboard history stays local;
optional account sync includes supported settings and extension choices, not
history. Extension permissions and processing depend on the chosen package.

Stable sections are meaning-search, recall, extensions, getting-started,
content, search, reuse, privacy, and questions. All prior section anchors remain.
Locale-aware documentation links preserve English URLs on
`https://docs.clipsx.app` and send Japanese readers to matching `/ja/` user guides.
Model commands and candidate tables live in Local AI; task guides own setup,
first-result exercises, and recovery. Developer guides remain English.
Recall needs generation; semantic retrieval is optional. Generated answers can
be wrong. Mermaid visualizes without an LLM; Rewrite needs configured generation.
Vault and Pro remain unavailable. Download is the source of truth for builds.
No clipboard, OCR, network model processing or transformations run on Product.

## Verification

Run npm run typecheck, npm run lint and npm run build. Check both locales at 320,
768, 1280 and 1600 CSS pixels in both OS themes. Verify no horizontal overflow,
readable format rows, section targets below the header, and visible focus.
Tab through links and native FAQ summaries; test Enter/Space to toggle answers.
Check localized destinations and editorial readability without JavaScript.
Verify graph selection, keyboard navigation, reset, inspector updates and focus.
Confirm there are no clipboard demo controls, autoplay or mock copy feedback.
