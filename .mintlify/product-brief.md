# Product brief

## Description

ClipsX is a free desktop clipboard. Users find copied content, inspect its representations, and make it useful with optional Meaning Search, Recall, and extensions. Original history is stored on the device; optional providers and extensions have explicit processing boundaries.

## Primary audience

English- and Japanese-speaking desktop users, including developers and people working with text or structured content. Readers may be new to local models. They need a first useful workflow and clear requirements, rather than knowledge of model APIs.

## Jobs to be done

- Install an available build and capture, find, and reuse a first clip without an account or AI.
- Set up an embedding model for Meaning Search.
- Configure generation, ask Recall, and verify its sources.
- Install a visualization or transformation extension and review its permissions.
- Compare model candidates using their own content and device resources.
- Understand optional account sync and recover from setup failures.
- Build and validate a first-party extension archive, import it locally, and verify a harmless transformation before creating a package with a new identity.

## Motivation

Copying is easy; finding and reusing the useful content later is harder. ClipsX preserves multiple representations and supports explicit optional capabilities. The documentation owns complete setup instructions; marketing explains outcomes and the app provides contextual guide links. Model suggestions distinguish developer-reported use from unverified alternatives.

## Presentation

Developer documentation starts with an existing first-party package. The
developer marketing page shows an illustrative result and directs readers to
the Rewrite build guide. That guide owns prerequisites, build commands, local
import, a first-result exercise, and recovery. Contract reference and public
distribution remain separate from the first local run. Developer guides are
English; Japanese marketing links label that destination explicitly.

Documentation uses a restrained reading layout: Inter body text, a compact heading hierarchy, text-led navigation and task cards, modest corners, and violet actions. Decorative card and group icons are omitted; functional search, copy, theme, and navigation controls remain. `docs.json` owns theme and font configuration; `docs.css` adjusts Mintlify's layout and component hooks. Check those hooks against a rendered preview when updating Mintlify. English and Japanese share the presentation, with mobile navigation and scrollable code and tables preserved.

