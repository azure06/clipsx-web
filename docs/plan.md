# ClipsX execution plan

## Target

Launch a paid ClipsX website with working sign-in, subscriptions, desktop
downloads, support, and a private browser vault for saved passwords and notes.

## Progress and next work

Work through these steps in order. Do not start the public launch until every
step is complete.

| Step | Target | Status | Next work |
| --- | --- | --- | --- |
| 1. Reliable starting point | The project installs and passes its checks consistently. | Done. | Move to Step 2: create the test environment. |
| 2. Test environment | A safe test version of Supabase, Google sign-in, Stripe, email, and Vercel. | Done. | Move to Step 3: build the private browser vault. |
| 3. Private browser vault | Users can safely view their own saved passwords and notes in the browser. | Not started. | Build encrypted storage, device approval, recovery, sign-out, and lost-device access removal. |
| 4. Subscription safety | Customers cannot create duplicate subscriptions or lose access because of a failed payment update. | Partly built. | Add the missing checks, then test purchase, cancellation, refund, payment failure, and retry cases. |
| 5. Public website | The download, legal, help, blog, and contact pages are complete and accurate. | Partly built. | Connect real downloads, send contact messages to support, publish articles, and finish both English and Japanese pages. |
| 6. Final launch choices | The real product limits, prices, legal terms, refund policy, supported platforms, and release details are approved. | Not started. | Make these choices after the app and desktop release are ready to review. |
| 7. Launch rehearsal | The staging site behaves like the public site and the team can recover from problems. | Not started. | Run the full sign-in, vault, billing, download, and support checks; record rollback and support steps. |
| 8. Public launch | Production is configured and verified. | Not started. | Apply production settings, publish the signed desktop release, run a small real-world test, then open the site. |

## Step-by-step checklist

### 1. Confirm the reliable starting point

- [x] Run the local checks: unit tests, database tests, type checking, linting,
  and production build.
- [x] Add the GitHub Actions workflow.
- [x] Open the latest GitHub Actions run for `develop` and confirm both jobs
  pass: website checks and database checks.
- [x] Fix any GitHub-only failure before moving on.

The verified run is [CI run 30242126783](https://github.com/azure06/clipsx-web/actions/runs/30242126783).

**Done when:** local and GitHub checks are green.

### 2. Create the test environment

- [x] Create a separate Supabase project for testing; do not use production.
- [x] Apply the current database changes to that project.
- [x] Set up Google sign-in for the website and desktop app.
- [x] Create Stripe test products and prices, then add the signed webhook.
- [x] Choose Resend and add support-message delivery in the website.
- [x] Add `RESEND_API_KEY`, `RESEND_FROM`, and `RESEND_CONTACT_TO` in Vercel.
- [x] Create a Vercel preview or staging site with test-only settings.
- [x] Set `NEXT_PUBLIC_SITE_URL` with `https://` included.
- [x] Test website sign-in, desktop sign-in, one Stripe test event, and one
  contact message.

**Done:** the test environment is configured and the checks above have passed.

### 3. Build the private browser vault

- [ ] Implement the frozen [vault protocol v1](backend/vault-protocol-v1.md),
  including its cross-runtime test vectors and browser compatibility checks.
- [x] Add the browser-safe v1 cryptographic primitives and unit coverage for
  deterministic CBOR, AES-GCM, HKDF, Ed25519, HPKE, and BIP-39 recovery
  encoding. Route, storage, and WebAuthn integration remain pending.
- [ ] Add database tables and access rules for devices, collections, encrypted
  items, keys, invitations, and deleted-item markers.
- [x] Add core browser-readable vault tables, RLS, and direct-browser mutation
  revocation. Signed write transactions, invitations, tombstones, and
  recovery-wrapper tables follow with the command-route feature.
- [x] Add the recovery-root, device-authorization, account-operation, and
  recovery-envelope trust ledgers required before accepting signed writes.
- [ ] Add tests proving a user cannot see another user's vault or use a removed
  device.
- [ ] Add browser-device setup. The browser keeps its private key locally and
  sends only its public key to the server.
- [ ] Add approval from an existing trusted device.
- [ ] Add recovery using a recovery code without sending that code to the
  server.
- [ ] Build a read-only browser page for passwords and encrypted notes.
- [ ] Expand the browser vault from read-only access to encrypted create,
  update, delete, conflict merge, and verified collection-sharing flows.
- [ ] Clear opened content when the user locks or signs out.
- [ ] Add a way to remove a lost browser device.
- [ ] Test normal setup, recovery, sign-out, lost-device removal, and blocked
  access by another user.

**Done when:** a user can safely view and recover their own vault, and nobody
else can access it.

### 4. Finish subscription safety

- [ ] When a customer already has a subscription, send them to the Stripe
  billing page instead of creating another subscription.
- [ ] Keep Pro access when an older valid subscription exists and a newer
  payment attempt fails.
- [ ] Show useful errors when payment setup, checkout, or the billing page is
  unavailable.
- [ ] Test monthly and yearly purchase, cancellation, refund, payment failure,
  webhook retry, replay, and subscribing again after cancellation.
- [ ] Write down who handles failed payments and how to replay a missed Stripe
  event.

**Done when:** duplicate subscriptions are blocked and every payment case has
been tested with Stripe test data.

### 5. Finish the public website

- [ ] Replace download placeholders with real signed desktop files, checksums,
  and install instructions.
- [ ] Show a clear message when a download is not available.
- [ ] Connect the contact form to the support inbox and add spam protection.
- [ ] Write and publish the three planned blog articles in English and Japanese.
- [ ] Add correct titles, sharing details, page links, and sitemap entries.
- [ ] Review every English and Japanese page for broken text, missing
  translation, and unsupported claims.
- [ ] Keep legal-page drafts ready for the final launch choices in Step 6.

**Done when:** the whole public site works technically and every page can be
reviewed against the final product.

### 6. Make final launch choices

- [ ] Decide what Free and Pro include, including storage and sharing limits.
- [ ] Decide the final monthly and yearly prices and currency.
- [ ] Confirm which desktop platforms and release files are supported.
- [ ] Approve the company details, privacy notice, terms, refunds, and tax
  approach.
- [ ] Compare the finished desktop app with every website claim.
- [ ] Remove any claim about AI, Team features, or credits that is not ready.
- [ ] Publish the final English and Japanese pricing, legal, and feature copy.

**Done when:** the public website says exactly what the released product does
and what customers pay for.

### 7. Rehearse the launch

- [ ] Test the full journey in the staging site: sign-up, sign-in, desktop
  handoff, vault, purchase, cancellation, contact, and download.
- [ ] Test a lost browser device and account recovery.
- [ ] Test a failed payment and replaying a Stripe event.
- [ ] Write simple steps for rollback, customer support, payment problems, and
  account recovery.
- [ ] Record the date and result of every test.

**Done when:** the team can run the site and recover from the expected failures.

### 8. Launch publicly

- [ ] Apply the checked database changes to production.
- [ ] Add production settings for Vercel, Supabase, Google, Stripe, email, and
  the desktop app.
- [ ] Add the live Stripe webhook and final prices.
- [ ] Publish the signed desktop release.
- [ ] Run one controlled real payment and sign-in check.
- [ ] Turn on public access and monitor the first customer requests.

**Done when:** real users can sign in, pay, download, contact support, and use
the browser vault safely.

## Already done

- Local unit tests, database tests, type checking, linting, and production
  build pass.
- A GitHub Actions workflow runs those checks for new changes.
- The local database reset no longer expects a missing seed file.
- The billing foundation and desktop sign-in handoff are implemented.

## Important rules

- Never send saved-item plaintext, recovery codes, or private keys to the
  server or logs.
- Use test accounts and test payment data until Step 8.
- Keep AI, Team features, and credit packs out of public claims unless they are
  actually released.

## Detailed technical references

- [Architecture](backend/architecture.md)
- [Vault protocol v1](backend/vault-protocol-v1.md)
- [Data model](backend/data-model.md)
- [Billing](backend/billing-stripe.md)
- [Local development and tests](backend/local-development.md)
