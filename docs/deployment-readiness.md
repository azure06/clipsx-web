# ClipsX deployment readiness roadmap

This is the working checklist for taking the ClipsX website to a public paid
launch. Mark items complete only after the code, documentation, and relevant
production verification are complete.

## Launch scope

- Public paid launch on Vercel with hosted Supabase and Stripe.
- Desktop installers are published as versioned GitHub Release assets from the
  separate ClipsX desktop repository.
- The website owns product content, download, authentication, account,
  browser vault access, billing, and support entry points.
- Team billing is deferred.
- AI is implemented by the desktop product; the website only describes
  capabilities verified in the released desktop app.

## 1. Product and legal truth

- [ ] Review every English and Japanese page; fix encoding, missing
  translations, and claims that do not match the released desktop app.
- [ ] Reconcile the homepage, features, pricing, FAQ, and blog with the real
  Free and Pro feature set: local history, semantic/image search, OCR, Office
  clips, password handling, sync, sharing, and AI.
- [ ] Replace the Privacy Policy template with reviewed legal text covering the
  legal entity, controller/contact details, Supabase and Stripe, account and
  billing data, encrypted content, retention, deletion, and recovery limits.
- [ ] Replace the Terms template with reviewed subscription, renewal,
  cancellation, refund, acceptable-use, warranty, liability, governing-law,
  and support terms.
- [ ] Do not market hosted AI, Team features, AI credits, or other planned
  functionality as available until the desktop release supports it.

## 2. Browser E2EE vault

Browser vault access is part of v1, but it is a separate E2EE client—not a
consequence of being Pro. Billing authorizes the service tier; locally held key
material authorizes decryption.

- [ ] Implement the encrypted-vault tables, RLS policies, narrow RPCs, and
  device/session checks described in [`backend/architecture.md`](backend/architecture.md)
  and [`backend/data-model.md`](backend/data-model.md).
- [ ] Add browser-device enrollment after sign-in: generate a Web Crypto key
  pair, store the private `CryptoKey` as non-extractable in IndexedDB, and
  register only the public key with Supabase.
- [ ] Support two local-only key acquisition paths:
  - trusted-device approval, where a current desktop device creates a
    collection-key envelope for the browser public key;
  - recovery-code restoration, where the browser decrypts recovery material
    locally and creates an envelope for its own public key.
- [ ] Deliver an initial read-only vault viewer for the signed-in user's own
  passwords and encrypted notes. Decrypt only in the browser; never send
  plaintext, the recovery code, or private key material to Supabase or logs.
- [ ] Keep vault routes free of third-party scripts and analytics, apply a
  strict CSP, prevent XSS, clear in-memory plaintext on lock/sign-out, and
  provide explicit browser-device revocation.
- [ ] Test normal browser enrollment, trusted-device approval, recovery,
  browser sign-out, lost-browser revocation, rejected cross-user access, and
  the case where the user has no trusted device or recovery code.

`CryptoKey` persistence in IndexedDB protects against key export and keeps the
server zero-knowledge. It does not protect against malicious JavaScript running
on the ClipsX origin, so CSP, dependency discipline, and XSS prevention are
release requirements.

## 3. Accounts, billing, and support

- [ ] Complete hosted Supabase and Google OAuth setup for web and desktop
  callbacks, email confirmation, password reset, sign-out, and expired-session
  behavior. See [`web-auth-todo.md`](web-auth-todo.md).
- [ ] Block Checkout when a billing account has an active, trialing, past-due,
  or pending subscription; send the user to Stripe Customer Portal instead.
- [ ] Ensure entitlement selection prefers a valid active subscription so a
  newer failed subscription cannot remove existing Pro access.
- [ ] Allow a new Checkout session only after all prior subscriptions are in a
  terminal state; show meaningful pricing errors for every rejected request.
- [ ] Verify monthly and annual purchase, cancellation, refund, payment
  failure, webhook retry, replay, and re-subscription with Stripe sandbox and
  Test Clocks.
- [ ] Send contact-form submissions to a monitored support inbox, add abuse
  protection, and report success only after delivery is accepted.

## 4. Downloads, blog, and site completion

- [ ] Replace placeholder download configuration with the real desktop GitHub
  Release repository, version, platform artifact names, checksums, and signing
  guidance.
- [ ] Verify Windows, macOS, and Linux links against a published release;
  provide a clear unavailable-release state rather than a broken link.
- [ ] Publish the three planned localized blog articles: local-first privacy,
  local semantic/image search, and rich Office clip preservation.
- [ ] Add localized article routes, metadata, canonical URLs, internal links,
  and sitemap coverage.
- [ ] Complete the final copy review for account status, pricing, cancellation,
  refunds, support, privacy, download instructions, and AI descriptions.

## 5. Engineering and deployment gate

- [ ] Resolve all ESLint errors and keep lint, unit tests, typecheck, and
  production builds passing.
- [ ] Run local Supabase reset and pgTAP/RLS tests for each database change.
- [ ] Add CI for dependency installation, unit tests, typecheck, lint, and
  production build; add database verification when the CI environment is ready.
- [ ] Apply and verify hosted Supabase migrations before enabling production
  traffic.
- [ ] Configure Vercel, Supabase, Stripe, Google OAuth, webhook, support-email,
  and desktop deep-link production environment variables.
- [ ] Bootstrap and review the live Stripe catalog only after prices, refund
  policy, and tax obligations are confirmed; register the production webhook.
- [ ] Record rollback, Stripe webhook replay, support escalation, and account
  recovery procedures.

## Launch acceptance

Launch only after all applicable checklist items are complete and the team has
manually verified:

- [ ] English and Japanese public pages render correctly.
- [ ] Web and desktop login work with production OAuth configuration.
- [ ] Download links install the intended signed desktop release.
- [ ] A user can create, recover, revoke, and safely view their own E2EE browser
  vault without the server receiving plaintext.
- [ ] A user cannot access another user's vault or use an unapproved/revoked
  browser device.
- [ ] Checkout cannot create duplicate subscriptions and Stripe lifecycle
  changes update local access correctly.
- [ ] Contact messages reach the monitored support inbox.
- [ ] Legal pages, release notes, production configuration, monitoring, and
  rollback guidance are current.
