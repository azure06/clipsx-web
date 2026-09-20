# ClipsX Web

The public website, documentation, account surface, configuration-sync backend,
and dormant billing foundation for [ClipsX](https://github.com/azure06/clipsx).

ClipsX is a free, programmable desktop clipboard. Clipboard content stays on
the device. Optional accounts currently synchronize only supported settings and
reviewed extension or command intent—not clips, files, notes, tags, credentials,
permission grants, local provider configuration, or derived intelligence data.

## Local development

Use Node.js 22+, a Supabase project or local Supabase CLI, and the environment
values documented in `docs/backend/production-readiness.md`.

```bash
npm install
npm run dev
```

Run `npm run test:unit`, `npm run typecheck`, `npm run lint`, and `npm run build`
before deployment.

## Theme conventions

The site follows the visitor's system theme by default. The header control lets
them persist a light, dark, or system preference locally in their browser.
Use the semantic `--ui-*` / `--vault-*` tokens for shared surfaces, text,
borders, overlays, and focus states; reserve `dark:` utilities for deliberate
component-specific differences. New pages must be readable in both themes.
The palette, contrast rules, brand-mark usage, and review checklist are recorded
in [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).

## Product state

- Marketing, documentation, auth, and account pages support English and Japanese.
- Google, GitHub, and email/password use Supabase Auth. Provider keys and exact
  production redirect allowlists are configured outside the repository.
- Versioned installers are linked only from the desktop repository's GitHub
  Releases page after platform certification.
- Free is the complete implemented local desktop product. Pro checkout is
  disabled unless `CLIPSX_ENABLE_PAID_CHECKOUT=true`; do not enable it while the
  supporter plan remains undefined.
- Browser vault routes remain a separately controlled preview.

`clipsx-web` is private application code and has no redistribution license. The
desktop app and first-party extensions are licensed separately under Apache 2.0.
See [`docs/backend/`](docs/backend/) for architecture, operations, and recovery.
