# ClipsX web design system

ClipsX uses one visual identity in two themes. Light mode is not a white version
of the dark site, and dark mode is not a collection of inverted utilities. Both
use the same blue-to-violet product accent, restrained fuchsia highlights, compact
controls, and cool neutral surfaces.

## Palette

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| Canvas | `#f6f8fc` | `#080d1b` | Page background |
| Surface | `#ffffff` | `#111827` | Cards, menus, and forms |
| Raised surface | `#fbfcff` | `#172033` | Elevated and interactive surfaces |
| Primary ink | `#182238` | `#f3f4f6` | Headings and primary copy |
| Muted ink | `#5d6b82` | `#9aa6b8` | Supporting copy and metadata |
| Brand blue | `#2563eb` | `#60a5fa` | Links, information, and gradient starts |
| Brand violet | `#6d28d9` | `#a78bfa` | Focus, selection, and product accents |
| Fuchsia | `#c026d3` | `#e879f9` | Sparse expressive highlights only |

The implemented source of truth is the semantic `--ui-*` token set in
`src/app/globals.css`. The table records the intended visual decisions; code
must consume tokens instead of copying these values into shared components.

## Theme rules

- New visitors follow the operating-system preference. A manual choice is stored
  only in browser `localStorage` and overrides the system until reset.
- Shared chrome, page canvas, cards, forms, dialogs, and footer always follow the
  selected theme. A route must not force them dark.
- Dark content is allowed inside a light page only when darkness communicates a
  real artifact: source code, terminal output, or an explicitly selected dark
  application preview.
- Use `--ui-text` on `--ui-canvas`/`--ui-surface` and `--ui-text-muted` only for
  supporting copy. Interactive labels and normal-size text must meet WCAG AA.
- Gradient actions keep white text. Secondary actions use semantic surface,
  border, and text tokens, with a visible `--ui-focus` keyboard ring.
- Shared chrome uses the Pearl monochrome construction: dark ink on light
  surfaces and pearl on dark surfaces. This preserves one mark while maintaining
  contrast in both themes. Full-color `clipsx.svg` remains available for product
  artwork; the translucent white legacy asset is not used in interface chrome.

## Implementation checklist

1. Start with semantic tokens; add paired `dark:` utilities only for a local,
   deliberate difference.
2. Check header, mobile navigation, footer, overlays, disabled states, and focus
   states in both themes.
3. Keep marketing mockups theme-aware unless they represent code or a user-selected
   preview theme.
4. Verify at desktop and mobile widths with reduced motion enabled.
