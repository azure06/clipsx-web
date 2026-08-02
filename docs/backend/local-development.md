# Local development, migrations, and verification

## Prerequisites

- Docker Desktop running before local Supabase commands.
- Node 22 or newer for current Supabase JavaScript support.
- Project-pinned Supabase CLI, Stripe SDK, and test tooling.
- Separate Stripe sandbox keys, webhook secret, and catalog from live mode.

The project has no local seed data. Database tests create their own fixtures,
so `supabase db reset --local` applies migrations only.

## Local browser-vault passkeys

Run the app with `npm run dev` and open `http://localhost:3000/en/vault/collections`.
`/en/vault` redirects there. A direct collection URL such as
`/en/vault/collections/{collectionId}` is expected to show the vault unlock
gate after a reload, then open the requested collection once unlocked.
The vault derives its WebAuthn relying-party ID from the active hostname, so a
local passkey is scoped to `localhost` and cannot unlock a production vault
record. Local development admission accepts only loopback enrollment origins;
production and staging must set the server-only comma-separated exact-origin
allowlist, for example:

```text
VAULT_ENROLLMENT_ORIGINS=https://clipsx.app,https://staging.clipsx.app
```

Do not use a wildcard or a client-exposed `NEXT_PUBLIC_` variable for this
setting.
The device-challenge endpoint returns a safe machine-readable CBOR error code
for malformed requests or challenge-storage failures. Every vault response
also includes `X-Vault-Request-Id`; the local vault UI shows a safe action and
the reference ID without exposing secrets.

Deployment verification uses a clean `supabase db reset --local`, database/RLS
tests, and a production build. Vault failures are correlated through
`X-Vault-Request-Id`; there is no browser-callable database diagnostic route.

No secret is committed. Local environment examples use variable names only.
Stripe secret/restricted keys, webhook signing secrets, and Supabase service
keys are server-only and never prefixed `NEXT_PUBLIC_`.

## Support email

The contact form sends messages through Resend. Set these server-only variables
in the ignored root `.env` file for local work and in Vercel for the matching
deployment environment:

```text
RESEND_API_KEY=re_replace_with_your_resend_api_key
RESEND_FROM="ClipsX <onboarding@resend.dev>"
RESEND_CONTACT_TO=support@example.com
```

Use `onboarding@resend.dev` only for local testing. Before public launch,
verify a ClipsX sending domain in Resend, replace `RESEND_FROM`, and set
`RESEND_CONTACT_TO` to the monitored support inbox. The browser never receives
the Resend API key.

## Migration workflow

1. Start the local stack.
2. Create each migration with `npx supabase migration new <descriptive-name>`.
3. Write the migration and SQL tests in the same checkpoint.
4. Run a clean local reset, apply migrations, run pgTAP/RLS tests, regenerate
   TypeScript types, then typecheck.
5. Review the schema/security advisors before committing.
6. Commit one coherent checkpoint. Do not combine billing projection, crypto
   schema, UI work, and unrelated cleanup.

Expected commands will be pinned when tooling is added:

```powershell
npm run supabase:start
npx supabase db reset --local
npx supabase test db
npm run stripe:bootstrap-catalog
npm run supabase:generate-types
npm run typecheck
npm run lint
```

## Test layers

| Layer | Purpose |
| --- | --- |
| SQL/pgTAP | constraints, indexes, triggers, RLS, RPC authorization, atomic allowance accounting, and tombstones |
| TypeScript unit tests | Stripe projections plus deterministic vault command/admission checks, including verified invitation transcripts and membership envelope sets |
| Stripe sandbox + CLI | raw signature verification, actual subscription lifecycle events, portal changes, failure cases |
| Stripe Test Clocks | annual renewal, monthly anniversary allowance, upgrade/downgrade, cancellation, and payment failure without waiting |
| App integration | authenticated checkout start, portal launch, safe billing summary, device revocation, collection sharing, and sync conflicts |

## Required scenarios by checkpoint

### Billing foundation

- A newly created user gets exactly one personal billing account.
- A second personal account for the same user is rejected.
- Test-mode Stripe identifiers cannot collide with live-mode identifiers.
- Private billing tables cannot be read by an authenticated browser client.

### Webhook projection

- Replaying a webhook event does not create a second entitlement or allowance.
- A stale event after a newer update cannot overwrite newer local state.
- A failed webhook projection remains visible and Stripe can retry it; the
  local replay command can also redeliver it through the signed endpoint.
- Product/Price archival stops new checkout selection but preserves existing
  subscription history.

### Allowance

- Concurrent AI requests cannot consume more than granted units.
- Retry of the same request ID is idempotent.
- A failed provider call produces a refund/adjustment entry.
- Annual Pro receives one allowance window per monthly anniversary.

### Encryption and RLS

- A user cannot select, insert, update, or delete another user's private rows.
- A recipient cannot access a collection before accepting an invitation.
- A removed member loses server-side access immediately.
- A revoked device session cannot call vault RPCs.
- A pending device cannot bootstrap, bind a session, or receive envelopes;
  `device-authorize` requires a bound active authorizer, the expected account
  head, matching retained proof, QR/SAS commitment, and exactly the current
  personal-collection envelope set in one transaction.
- Exercise pending enrollment with both PRF and passphrase protection. Reloading
  the pending browser must require local unlock before its QR can be restored;
  the SAS secret is stored only inside authenticated ciphertext.
- Recovery authorization tests must prove that the recovery command is signed by
  the phrase-derived key, that its device envelopes have a recovery sender, and
  that browser roles cannot invoke the private transaction directly.
- Device revocation must fail atomically unless every personal collection has
  its next epoch and exactly the remaining active-device and recovery-root
  envelope recipients; a revoked device receives no new envelope and cannot
  bind or submit a later command.
- Recovery-root rotation must require signatures from both the existing
  recovery root and a session-bound active device, cover each current personal
  collection exactly once, and make no state change when validation fails.
  Verify that browser roles have no execute privilege on the private rotation
  transaction.
- Verified sharing must keep the 32-byte invitation secret in the
  `#vault-invite` fragment/local protected state. Assert that serialized
  `invitation-create` bytes and `vault_collection_invitations` contain only
  domain-separated commitments.
- Invitation acceptance must come from the named recipient's active bound
  device and bind its current signing/encryption public keys. Inviter
  confirmation must match the exact acceptance command and transcript hash;
  expired, stale-head, TOFU, or account-session-only paths are rejected.
- Member activation must atomically accept the invitation, activate the
  invited lifecycle, create the clean next epoch, append `member-add`, and
  store exact active device/recovery envelope sets. The default historical
  boundary equals the joining epoch and stores no older envelope.
- Explicit historical access must name a contiguous retained epoch boundary
  and provide one signed envelope for each selected epoch and each active
  recipient endpoint. Missing, duplicate, earlier-than-authorized, or
  unrelated-account envelopes reject the entire transaction.
- Member removal must atomically make the lifecycle terminal and rotate before
  a later write. No new envelope may name any removed-account device or
  recovery root. Tests and support text must not claim deletion of material
  the former member already copied.
- A tombstoned item never returns ciphertext during sync.
- A signed note deletion requires both the collection and current revision
  heads, atomically removes revision ciphertext/key wraps, and emits an
  operation-linked tombstone that verified sync uses to remove the item.
- A note append rejects stale collection heads, wrong epoch, inactive
  membership/session, duplicate IDs, and direct RPC execution; a rejection
  leaves no note, revision, or operation row.
- A stale note-update `409` keeps a draft only in memory, refreshes verified
  bootstrap and collection sync, and supports keep-remote, reapply-local, and
  manual-merge actions. Lock, page exit, cross-tab lock, and vault teardown
  clear that draft and all rendered plaintext.

## Vault migration order

Vault migrations are feature-owned and rebuildable: read schema/RLS, trust
ledger, registration staging, device enrollment/session binding, device
authorization/revocation, recovery rotation, collection/item content,
collection sharing/rotation, and account sync. Do not append corrective grant
or upgrade migrations while the schema remains pre-production; amend the owning
feature migration and verify from a clean reset.

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests and pushes to `develop` and
`main`. It uses a clean `npm ci` installation, then checks unit tests,
typecheck, lint, and production build. A separate job starts local Supabase,
resets migrations, and runs the pgTAP/RLS suite.
