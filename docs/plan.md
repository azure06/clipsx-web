# ClipsX Roadmap

ClipsX is a local-first clipboard manager. Clipboard history stays on the
device; only items deliberately saved to the encrypted vault are available
across devices or shared.

`[x]` means implemented or already verified. `[ ]` means required before the
initial release unless it appears under Post-launch.

## Initial release

### Release environment

- [x] Unit, database, type, lint, and production-build checks run locally and
  in CI.
- [x] Separate Supabase test project, Google sign-in, Stripe test mode, Resend,
  and Vercel staging are configured and tested end-to-end.
- [ ] Keep staging credentials and data fully separate from production.
- [ ] Document a safe staging reset and recovery procedure.

### Encrypted browser vault

- [x] The protocol/backend support encrypted notes and tombstones.
- [ ] Create, edit, search, copy, trash, restore, and permanently delete notes
  and login/password records as immutable authenticated revisions.
- [ ] Show saving, saved, offline, locked, conflict, empty, loading, and error
  states; never present an unaccepted local draft as synchronized.
- [ ] Make permanent deletion an explicit confirmation, and explain that it
  cannot erase copies another authorized device already downloaded.

### Verified sync

- [x] Billing, device authorization, recovery authorization, verified
  invitations, and atomic member add/remove are implemented at the
  protocol/backend level.
- [ ] Persist verified account and collection checkpoints locally, then fetch
  and verify only operations after the checkpoint. Rebuild from complete
  verified history when a checkpoint is missing, stale, or rejected.
- [ ] Add authorization-chain sync, rollback checkpoints, cross-runtime test
  vectors, and browser-compatibility checks.
- [ ] Investigate and fix `Verified account sync is required before collection
  sync.` Collection sync must establish verified account state whenever the
  worker was recreated after lock, reload, navigation, backgrounding, session
  refresh, or retry; add non-sensitive diagnostics and regression tests.

### Vault access and trusted devices

- [ ] Keep the encrypted local browser-device bundle through sign-out, so later
  sign-in rediscovers and unlocks it instead of making the device unusable.
- [ ] Cover passkey/PRF and passphrase unlock profiles through refresh, expiry,
  sign-out/in, restart, new tab, cookie deletion, and IndexedDB deletion.
- [x] Pending-device approval, rejection, cancellation, and expiration are
  detected and resumed correctly after reload.
- [ ] Prevent duplicate or unexplained passkey prompts from rerenders and
  concurrent requests.
- [ ] Provide active/pending/revoked device list, rename, cancel, revoke, and
  forget-browser actions; show account sessions separately, with sign-out of
  one or all other sessions.

### Recovery and secret handling

- [ ] Show the mandatory, print-friendly 24-word BIP-39 recovery phrase once
  during enrollment, with clear offline-storage and loss guidance. Twenty-four
  words are the standard checksummed representation of 256-bit recovery
  entropy.
- [x] All-devices-lost recovery verifies the phrase locally, enrolls a
  replacement device, and revokes/rotates the lost device without sending the
  phrase to the server.
- [x] Configurable inactivity auto-lock is available.
- [x] Passwords are masked by default with deliberate reveal/copy and optional
  best-effort clipboard clearing.

### Sharing, ownership, and account lifecycle

- [ ] Create, deliver, accept, and verify invitations through a safety number
  or QR flow; show pending, active, and removed members.
- [ ] Let the owner choose whether a new member receives old history; default
  to no. Removing a member must rotate the collection key.
- [ ] Define signed ownership-transfer and account-deletion operations before
  exposing their UI.
- [ ] Allow explicit ownership transfer to an active member. Account deletion
  must revoke devices, leave shared collections, delete personal collections,
  cancel billing, require recent authentication and confirmation, and block
  while the account owns a shared collection with others.

### Vault experience and desktop integration

- [ ] Support desktop, narrow windows, and current mobile browsers with
  touch-friendly controls and complete unlock, search, edit, copy, share,
  trash, and settings states. Initial mobile support is responsive web, not a
  native app.
- [ ] Consolidate semantic CSS variables for vault canvas, surfaces, borders,
  text, and accents so later palette experiments or alignment with the desktop
  clipboard app happen in one place.
- [ ] Embed the vault in the desktop webview and add an explicit clip-to-vault
  bridge. It supplies plaintext only to the already unlocked, authorized
  webview, which performs the normal encrypted write; the native host never
  receives vault keys or ciphertext.
- [ ] Apply a nonce-based CSP, no third-party vault scripts, Trusted Types
  where supported, `Cache-Control: no-store`, no service worker on vault
  routes, dependency pinning, no plaintext telemetry, and safe update behavior
  while unlocked. Review the webview and bridge before release.

### Desktop clipboard app

- [ ] Deliver reliable capture, history, search/filters, previews, supported
  clip types, favorites/pins/snippets if included, pause capture, and clear
  history.
- [ ] Support app and sensitive-app exclusions; keep plaintext clipboard data
  out of logs and crash reports.
- [ ] Publish a format-support inventory marking every captured format as fully
  rendered, preview-only, metadata-only, or unsupported, with a safe fallback
  for unknown formats.
- [ ] Complete sign-in and entitlement refresh, signed installers, updates,
  and vault webview access.

### Billing, website, and support

- [ ] Redirect existing subscribers to the Stripe billing portal and preserve a
  valid older subscription when a newer payment attempt fails.
- [ ] Test monthly/yearly purchase, cancellation, refund, failed-payment
  recovery, webhook retry/replay, and resubscription; document missed-event
  replay and failed-payment support.
- [ ] Publish signed downloads with checksums and installation instructions,
  unavailable-platform messaging, and a spam-protected support contact.
- [ ] Complete English/Japanese content, titles, sharing metadata, links, and
  sitemap. Remove unfinished AI/Team claims and state that raw clipboard
  history is never uploaded automatically.
- [ ] Check every public encryption claim against the verified protocol work;
  do not claim end-to-end encryption before that verification is complete.

### Production readiness

- [ ] Decide Free/Pro boundaries, storage/collection/sharing/device limits,
  prices, currencies, supported platforms, and release channels.
- [ ] Complete company details, privacy notice, terms, refunds, taxes, and
  retention policy.
- [ ] Run and record staging acceptance for sign-up/sign-in, desktop handoff,
  vault setup/lock, all-devices-lost recovery, cross-device sync, sharing,
  trash, device removal, ownership transfer, account deletion, payments,
  webhooks, downloads, support delivery, and network interruption.
- [ ] Document rollback, payment-support, account-recovery, and incident
  procedures.
- [ ] Verify production configuration for Vercel, Supabase, Google, Stripe,
  email, and desktop; publish signed releases and activate the live webhook.
- [ ] Perform one controlled production payment and one production sign-in plus
  vault check before limited release and monitored expansion.

## Post-launch

### Offline vault / PWA

- [ ] Design offline access as a separate authorized-device capability with
  encrypted local storage, key lifecycle and revocation handling,
  integrity-safe delivery, and recovery behavior. A service-worker cache alone
  is not offline vault support and must not serve stale or unsafe code while
  the vault is unlocked.

### Native vault clients

- [ ] Evaluate native mobile clients and desktop-as-an-authorized-vault-device
  after browser protocol, sync, and compatibility work is proven.

### Expanded vault features

- [ ] Add file attachments, revision-history browser, team organizations and
  advanced roles, account passkey login, and AI/credits/pricing features when
  their security and product design is ready.

### Protocol and delivery maturity

- [ ] Extend rollback checkpoints, cross-runtime vectors, browser compatibility
  coverage, and update/delivery protections; validate any expanded encryption
  marketing claim.

## Release acceptance coverage

- [ ] Test verified delta sync for creation, edits, deletion, membership/key
  rotation, stale or missing checkpoints, invalid anchors, and full rebuild.
- [ ] Reproduce and prevent the verified-account-sync error through lock,
  worker termination, reload, route changes, backgrounding, session expiry,
  sign-out/in, IndexedDB deletion, and concurrent refreshes.
- [ ] Test valid and invalid 24-word BIP-39 phrases without transmitting or
  logging phrase material.
- [ ] Test responsive vault workflows on supported phone viewport sizes and
  narrow desktop windows.
