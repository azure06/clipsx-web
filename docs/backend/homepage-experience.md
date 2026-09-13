# Homepage experience

The English and Japanese homepage leads with clipboard capture, rediscovery,
and useful previews. Free availability is not the hero message. Download links
still lead to the existing release-aware Download page; this change does not
enable uncertified artifacts or change account, billing, or sync behavior.

## Design source

The homepage uses the desktop repository's design vocabulary, inspected in:

- `../clipsx/src/features/app/AppLayout.tsx`: translucent slate surfaces,
  12px shells and 16px panels.
- `../clipsx/src/shared/components/ui/Button/Button.tsx`: blue-500 to violet-500
  primary buttons and 8px controls. Website buttons omit raised shadows.
- `../clipsx/src/features/intelligence/IntelligencePage.tsx`: violet/fuchsia
  highlights and a subtle violet dot pattern.
- `../clipsx/src/features/clipboard/components/PreviewLeadingVisual.tsx`:
  distinct blue, sky, violet, fuchsia, and amber content indicators.
- `../clipsx/tailwind.config.js`: short fade/slide transitions.

The web canvas composites the native app's translucent surfaces over a slate
background. Homepage CSS is scoped, including shared header/footer appearance.
Navigation switches to its collapsible menu below the desktop-link breakpoint,
so tablet visitors retain access to all primary destinations.

## Interactive sample

`HomePreview.tsx` is a browser-only demonstration using bundled sample content,
not a screenshot or an embedded native runtime. It does not read clipboard
contents, invoke Ollama, install extensions, access accounts, or send sample
searches to a backend. The illustrated Mermaid result is a fixed example.

Implemented interactions:

- Search sample content; filter all, favorite, or pinned samples.
- Select a clip and inspect its content. At phone widths, details replace the
  list and a back control restores it.
- Explicit light/dark preview selection; dark is the initial preview theme.
- Copy sample content only after pressing the copy button. A live status
  reports success or browser permission failure.
- A finite three-step tour advances every 4.2 seconds while the preview is in
  view, then stops. It demonstrates capture, text search, and a diagram preview.
  Pointer or keyboard interaction with the sample stops automatic progression.
  Visitors can pause, replay, or choose a step. Background tabs do not advance.
- Reduced-motion preference disables automatic playback and CSS animations;
  manual tour steps remain available.

The homepage explains that clipboard history stays on-device, Ollama is optional,
and account sync covers selected settings and extension choices, not history.
No desktop mobile support is implied by the responsive website demonstration.

## Verification

Run `npm run typecheck`, `npm run lint`, and `npm run build`. Browser checks
should cover English and Japanese at phone, tablet, and desktop widths; both
preview themes; search and empty results; favorites/pinned; copy feedback;
mobile list/detail/back; tour pause/replay; reduced motion; navigation and
download/documentation links. The native app and production release readiness
remain separate verification scopes.
