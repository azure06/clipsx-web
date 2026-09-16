# Pricing page

`/[locale]/pricing` is a server-rendered, localized plan overview and feature
inventory. Its neutral heading is “Plans and features.” The current Free plan
is shown at $0 / ¥0 with no subscription required. The paid plan is explicitly
planned and unavailable; price, additional benefits, and launch date are unset.
There is no checkout action, billing-period selector, trial, discount, or
promised paid entitlement on this page. Acquisition links to `/download`.

## Content and presentation

`src/config/pricing.ts` owns 15 current Free features across capture/preview,
search/Recall, organization/reuse, and settings/data. Each includes an explanation
and setup or platform requirements. The route owns English/Japanese page copy,
metadata, plan summaries, future-plan status, and native expandable FAQs.
`pricing.module.css` scopes the styling, including system light/dark themes,
focus indicators, header-offset anchor targets, and reduced-motion scrolling.

Desktop tables display feature, Free inclusion, and requirements. On narrow
screens each row stacks its requirement below the name and inclusion status;
explicit table roles preserve semantics after CSS layout changes. All content
is server-rendered; anchor navigation and FAQ disclosure need no client component.

The former unused plan configuration and `PricingPage` translation namespaces
were replaced/removed: their sample paid prices, Office trials, visual search,
hosted AI, refund terms, and paid sync claims did not describe the current offer.
This is presentation data, not a billing entitlement policy. Stripe configuration,
checkout gating, existing subscriptions, and account billing are unchanged.

## Claim boundaries

Feature descriptions follow `../clipsx/docs/ARCHITECTURE.md`,
`SEMANTIC_SEARCH_ARCHITECTURE.md`, and `RELEASE.md`:

- All listed features are part of the current Free plan, not paid trials.
- Meaning Search requires an optional local embedding model; Recall requires
  a generation model. Models and hardware have their own requirements.
- OCR, capture formats, sharing, and native behavior depend on the platform
  and available providers. “Included” is not installed-build certification.
- Extensions require compatible packages and permission approval.
- Settings/extension-choice sync is opt-in and requires an account. It does
  not sync clipboard history, files, or local models.
- Optional hosted services are a possible future direction, not a confirmed
  paid feature list. No future price, quota, or launch date is promised.

## Verification

Run `npm run typecheck`, `npm run lint`, and `npm run build`. Review both locales
at 320/390, 768, and 1440 CSS pixels in light and dark themes. Check the four
feature-group anchors, planned-tier link, all feature links, download route,
FAQ click/keyboard disclosure, focus visibility, and no horizontal overflow.
Confirm one h1 and main landmark, 15 included rows, localized metadata, and no
paid checkout, stale prices, unlimited-capacity claims, or promised cloud history.
