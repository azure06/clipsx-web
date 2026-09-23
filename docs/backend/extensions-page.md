# Extensions page

The public Extensions page serves two audiences:

- People using ClipsX can understand what an extension changes, explore the
  prepared first-party collection, and continue to the installation and
  permission guide.
- Developers can see the Extension API v3 lifecycle and continue to developer
  documentation or the first-party extension source repository.

## Product source

The page reflects the implemented desktop architecture in `../clipsx`:

- Contributions can detect, render, transform, or act on compatible clipboard
  representations. The host selects applicable contributions and preserves the
  canonical clip.
- The first-party source collection contains Mermaid, JWT Inspector, Base64,
  Data Tools, Ask AI, and Rewrite. New v3 archives must be published before
  they appear in the signed registry. No optional package is installed by default.
- Registry releases are versioned and checksum-pinned. Installation, relevant
  updates, and external access expose their permission boundary for review.
- Extensions have no ambient clipboard-history, filesystem, or network access.
  Network destinations and external navigation must be declared and granted
  for the exact package release.
- Repeated execution failures can quarantine a package without mutating the
  original clip.

The page links first-party source to
`https://github.com/azure06/clipsx-extensions`. The desktop host, public
contract, CLI, and conformance tests remain in
`https://github.com/azure06/clipsx`.

## Interactive example

`ExtensionWorkbench.tsx` is a browser-only illustration with bundled sample
content. It demonstrates Mermaid rendering, JWT inspection, and a Data Tools
transform. It does not execute extension packages, decode real tokens, access
the visitor's clipboard, install software, or call a backend.

The example rotates between samples every 4.4 seconds until a visitor selects
one. Direct selection remains available by mouse, touch, and keyboard and stops
automatic rotation. Reduced-motion preference disables automatic rotation and
the entry animation.

## Release status

The first-party packages and signed registry are prepared but still require
publication. The page states this beside the collection and does not expose
install buttons or claim catalog availability. The Downloads page continues to
control desktop artifact availability independently.

## Verification

Run `npm run typecheck`, `npm run lint`, and `npm run build`. Browser checks
should cover English and Japanese content at phone, tablet, and desktop widths;
all three workbench examples; keyboard focus; reduced motion; internal
documentation links; and the external first-party source link.
