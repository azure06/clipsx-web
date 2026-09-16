# Product page

The localized product route is a practical product guide. The homepage owns the
interactive clipboard introduction. Product has no simulated desktop or mock
clipboard controls. It retains visual explanations and an interactive
representation graph, alongside the functional section menu.

Recall has its own focused route at `/[locale]/recall`; Product remains the
broader clipboard-system reference and does not duplicate Recall's evidence
walkthrough.

## Structure

The route is a Server Component, using English/Japanese content in
src/content/product.ts and scoped product.module.css styles. It contains a compact
introduction, product facts, section navigation, a content-format reference,
search and organization details, a capture representation scene, an interactive
transformation graph, preview/reuse steps, Extensions information,
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

Localized links point to /download, /extensions, /docs/getting-started,
/docs/privacy and /docs/sync. Download remains the source of truth for builds.
No clipboard, OCR, network model processing or transformations run on Product.

## Verification

Run npm run typecheck, npm run lint and npm run build. Check both locales at 375,
768, 1280 and 1600 CSS pixels in both OS themes. Verify no horizontal overflow,
readable format rows, section targets below the header, and visible focus.
Tab through links and native FAQ summaries; test Enter/Space to toggle answers.
Check localized destinations and editorial readability without JavaScript.
Verify graph selection, keyboard navigation, reset, inspector updates and focus.
Confirm there are no clipboard demo controls, autoplay or mock copy feedback.
