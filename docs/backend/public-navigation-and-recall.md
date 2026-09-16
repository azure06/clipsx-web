# Public navigation and Recall page

The public header uses two grouped menus and two direct evaluation links. The
Product menu contains Product overview, Recall, Meaning Search, and Extensions.
The Developers menu contains the developer overview, extension documentation,
the source repository, and Changelog. Docs and Pricing remain direct links;
Blog, FAQ, and Contact remain available from the footer. Download is the header's
primary action and continues to resolve release availability on `/download`.

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

## Documentation and changelog

The existing localized Docs route now includes separate Recall and expanded
Ollama guides. The Ollama guide distinguishes embedding models used for Meaning
Search from generation models used for Recall, treats discovered capabilities
as authoritative, and links to official Ollama installation and model pages.

The Changelog intentionally shows an empty release ledger until a build is
certified and published through GitHub Releases. The deleted legacy entry was a
hard-coded pre-release claim and was not backed by a published GitHub Release.
The Download page remains the source of truth for artifact availability.

## Verification

Run `npm run test:unit`, `npm run typecheck`, `npm run lint`, and `npm run build`.
Verify the two desktop menus and compact accordions in English and Japanese;
exercise keyboard traversal, Escape restoration, outside dismissal, direct Docs
and Pricing navigation, Recall citations/reset, footer links, and the Changelog
empty state. Reduced-motion mode must stop the ambient Recall illustration.
