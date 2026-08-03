# ClipsX Execution Plan

## Product

ClipsX is a local-first clipboard manager. Clipboard history stays on the
device. Users can deliberately save notes and login records into an encrypted
vault for cross-device access and sharing. Raw clipboard history is never
uploaded automatically — only items the user explicitly saves to the vault.

## How the desktop app reaches the vault

The desktop app hosts the vault inside an embedded webview rather than
opening it in an external browser tab. Because of that:

- **Embedding the vault in a webview is core to the product, not a
  post-launch nice-to-have** — it needs its security review (CSP, no
  third-party scripts, no unintended script injection from the host app) done
  as part of the MVP, not deferred.
- **A JS bridge for "send this clip to the vault"** is lower-risk than a
  general native integration, as long as the bridge only hands plaintext into
  the already-authorized, already-unlocked webview and lets the webview do the
  normal encrypt-and-sign write it would do for a manual paste. The native
  host never touches keys or ciphertext. On that basis, this is reasonable to
  include in the MVP.
- **Offline access via a PWA/service-worker is a different, bigger problem**
  and should stay out of the MVP: real offline vault access means the desktop
  app would need to become its own authorized vault device with its own keys
  and an encrypted local cache — a separate security design, not a caching
  shortcut. A service worker also runs against the hardening the vault
  webview needs (no stale or tampered cached script, no silently-served old
  version while unlocked). If offline is wanted later, the path is "desktop
  app as its own vault device," not a PWA wrapper around the current webview.

## MVP scope

### In scope for launch

- Desktop clipboard history, search, previews, supported local formats.
- Website account, billing, downloads, support, English/Japanese pages.
- Browser vault: notes and login/password records — create, edit, search,
  copy, trash, restore, permanent delete.
- Recovery phrase enrollment (generation, display, offline-storage warning).
- Recovery execution — actually regaining access using the phrase after
  losing every device. (This is a distinct flow from enrollment: enrollment
  just shows/prints the phrase; execution is the "I lost all my devices, let
  me back in" flow. Worth calling out because it's easy to mark "recovery"
  done after building only the enrollment half.)
- Trusted-device approval, device list, and account-session management.
- Verified collection sharing and member removal.
- Automatic vault locking and safe handling of copied secrets.
- Responsive vault dashboard (desktop + narrow windows).
- Vault embedded in the desktop app's webview, plus a "send clip to vault"
  bridge (see above).

### Deferred past launch, with reasoning

- **AI features/credits/pricing** — not built yet; no reason to rush this in.
- **Team organizations / advanced collaboration** — adds real scope (roles,
  org-level billing) beyond what a single-owner-per-collection model supports.
- **File attachments in the vault** — needs its own key-per-attachment and
  retention design; unrelated to notes/logins working well.
- **Full revision-history browser** — the data needed for conflict handling
  is kept regardless; a full history UI is a viewer on top of that, not a
  security dependency.
- **Native offline vault access / desktop-as-its-own-vault-device** — see
  reasoning above; this is real, separate security work, not a shortcut.
- **Account passkey login** (separate from vault unlock, which does use
  passkeys/PRF) — only worth adding once the current device-approval
  double-prompt issues are stable; Google/email sign-in is a fine launch
  substitute.
- **"End-to-end encrypted" as a marketing claim** — hold off until the
  underlying protocol work below (multi-device sync, rollback checkpoints,
  teardown, delivery hardening, compatibility testing) is actually verified,
  not just implemented. Describe the vault as "encrypted with per-device
  keys" until then.

---

## Work plan

### 1. CI and test environment

- [x] Unit tests, database tests, type checking, linting, production build pass locally and in CI.
- [x] Separate Supabase test project, Google sign-in, Stripe test mode, Resend, Vercel staging all configured and tested end-to-end.
- [ ] Keep staging data/credentials fully separate from production.
- [ ] Document a safe staging reset procedure.

### 2. Freeze scope

- [ ] Remove AI features, credits, and claims from roadmap, billing, and copy; disable any unfinished AI routes/flags/secrets.
- [ ] Apply the product framing above consistently across app, vault, and website copy.
- [ ] Decide Free vs. Pro feature boundaries, and whether Office-format preservation ships at launch.
- [ ] Agree on one place (a flag, a doc) that says whether the "end-to-end encrypted" claim is currently true, and have all public copy defer to it.

### 3. Browser vault

**Protocol and sync**
- [x] Billing, encrypted notes/tombstones, device authorization, recovery authorization, verified invitations, and atomic member add/remove are implemented at the protocol/backend level.
- [ ] Multi-device authorization-chain sync, rollback checkpoints, cross-runtime test vectors, and browser-compatibility checks.
- [ ] Lock/logout/route-exit/worker teardown, delivery and update hardening.
- [ ] Staging acceptance suite covering all of the above.

**Device and session lifecycle**
- [ ] A changed or lost account session must never make an existing local vault device unusable; the encrypted device bundle must not be tied to a session token.
- [ ] Sign-out locks the vault without deleting the local device bundle; signing back in re-discovers and unlocks it.
- [ ] Cover this for both local-protection profiles — passkey/PRF and the passphrase fallback — not just one.
- [ ] Test refresh, expiry, sign-out/in, browser restart, new tab, cookie deletion, IndexedDB deletion.

**Trusted-device approval**
- [ ] Auto-detect approval/rejection/cancellation/expiration; resume correctly after reload.
- [ ] No duplicate or unexplained passkey prompts from rerenders or concurrent requests.

**Item workflows**
- [ ] Create/edit/search/copy notes and login records as immutable authenticated revisions.
- [ ] Clear saving/saved/offline/conflict states; never show an unaccepted draft as synchronized.

**Trash and deletion**
- [ ] Move to trash, trash view, restore, and a separate explicit permanent delete with confirmation.
- [ ] Make clear that deletion can't erase copies already downloaded elsewhere.

**Sharing**
- [ ] Invitation creation, link delivery, acceptance, and safety-number/QR verification.
- [ ] Owner chooses whether new members get old history (default: no).
- [ ] Members page showing pending/active/removed, with removal triggering key rotation.

**Devices and sessions (UI)**
- [ ] Device list (active/pending/revoked, platform, last activity), rename, cancel, revoke, "forget this browser."
- [ ] Session list separate from device list, with sign-out of one or all others; never describe session sign-out as cryptographic device revocation.

**Locking and secret handling**
- [ ] Configurable inactivity auto-lock (sensible default, e.g. 10 min).
- [ ] Masked passwords with explicit reveal/copy, and a best-effort (not guaranteed) clipboard-clear after copy.

**Recovery**
- [ ] Enrollment: mandatory 24-word phrase, shown once at enrollment, print-friendly, clear loss warning.
- [ ] Execution: the actual flow to enter the phrase, verify it, enroll a replacement device, and revoke/rotate the lost device — tested without ever sending the phrase to the server.

**Ownership and account deletion**
- [ ] Define the signed protocol operations for ownership transfer and for account deletion (revoke devices, leave shared collections, delete personal collections, cancel subscription) before building UI on top of them.
- [ ] Ownership transfer to another active member, never automatic.
- [ ] Account deletion blocks while the user still owns a shared collection with other members, requires recent auth and explicit confirmation, and explains irreversible consequences up front.

**Dashboard**
- [ ] Responsive layout for desktop and narrow windows.
- [ ] Clear empty/loading/error/offline/locked/conflict states across unlock, search, edit, copy, share, trash, settings.

**Account passkey login**
- [ ] Deferrable — ship only once vault-unlock passkey issues are stable and only if it doesn't delay launch.

**Webview and delivery hardening**
- [ ] Strict nonce-based CSP, no third-party scripts, Trusted Types where supported, `Cache-Control: no-store`, no service worker on vault routes.
- [ ] Dependency pinning; no plaintext vault data in telemetry/analytics/crash reports.
- [ ] New builds don't activate while the vault is unlocked.
- [ ] Correct enrollment-origin configuration for production and staging.
- [ ] Security review of the desktop webview embedding and the clip-to-vault bridge specifically.

### 4. Desktop clipboard app

- [ ] Reliable capture, history, search/filters, supported clip types, favorites/pins/snippets (if included), pause capture, clear history.
- [ ] App exclusions and sensitive-app exclusions; no plaintext clipboard content in logs or crash reports.
- [ ] Reliable sign-in and entitlement refresh; signed installers and update behavior.
- [ ] Format-by-format renderer support: list every captured format, mark it fully-rendered / preview-only / metadata-only / unsupported, add a safe fallback for unknown formats, avoid building many new specialized renderers before launch.
- [ ] Embedded vault webview reachable from the app, plus the clip-to-vault bridge (see integration model above).

### 5. Subscription safety

- [ ] Existing subscribers are redirected to the Stripe billing portal instead of creating a duplicate subscription.
- [ ] Older valid subscription stays active if a newer payment attempt fails.
- [ ] Test monthly/yearly purchase, cancellation, refund, payment failure/recovery, webhook retry/replay, resubscription.
- [ ] Document missed-event replay and failed-payment support process.

### 6. Public website

- [ ] Real signed downloads with checksums and install instructions; clear unavailable-platform messaging.
- [ ] Contact form wired to support with spam protection.
- [ ] English/Japanese pages complete: titles, sharing metadata, links, sitemap.
- [ ] No AI or Team claims; clear statement that only deliberately saved items sync, not raw clipboard history.
- [ ] Every page checked against the "end-to-end encrypted" claim decision from step 2.

### 7. Final launch choices

- [ ] Free/Pro boundaries, storage/collection/sharing/device limits, pricing and currencies.
- [ ] Supported platforms, release channels.
- [ ] Company details, privacy notice, terms, refunds, taxes, retention policy.
- [ ] Recovery execution actually demonstrated (not just designed) before sign-off.
- [ ] Every website claim checked against the real desktop app and vault.

### 8. Rehearsal

- [ ] Sign-up/sign-in, desktop sign-in handoff.
- [ ] Vault setup, lock, a real simulated all-devices-lost recovery, sharing, trash, device removal.
- [ ] Purchase/cancel/failed-payment/webhook replay.
- [ ] Downloads and update installation; support contact delivery.
- [ ] Account deletion and ownership transfer.
- [ ] Network-interruption failure cases.
- [ ] Written rollback, payment-support, account-recovery, and incident steps.
- [ ] Dated record of every rehearsal run.

### 9. Public launch

- [ ] Production config for Vercel, Supabase, Google, Stripe, email, desktop.
- [ ] Live Stripe webhook and final prices; signed desktop releases published.
- [ ] One controlled real payment, one production sign-in + vault check.
- [ ] Limited real-user release with monitoring, then open access.

---

## Rules

- Never send vault plaintext, recovery phrases, or private keys to the server or logs.
- Never upload raw clipboard history automatically.
- Use test accounts and payments until production launch.
- Don't claim device revocation erases already-downloaded data.
- Don't claim clipboard clearing is guaranteed — it's best-effort.
- Don't call the vault "end-to-end encrypted" publicly until the step-2 decision says so.
- Don't treat "recovery" as done from enrollment alone — execution is a separate, required flow.
- Don't build ownership-transfer or account-deletion UI before their signed protocol operations are defined.
- Don't start native (non-webview) desktop vault integration before the browser protocol and compatibility tests are complete.