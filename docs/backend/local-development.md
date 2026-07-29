# Local development, migrations, and verification

## Prerequisites

- Docker Desktop running before local Supabase commands.
- Node 22 or newer for current Supabase JavaScript support.
- Project-pinned Supabase CLI, Stripe SDK, and test tooling.
- Separate Stripe sandbox keys, webhook secret, and catalog from live mode.

The project has no local seed data. Database tests create their own fixtures,
so `supabase db reset --local` applies migrations only.

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
| TypeScript unit tests | Stripe event-to-projection mapping, stale/duplicate handling, entitlement status calculation, and date-window calculation |
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

## Commit order

1. Documentation only.
2. Pinned local tooling and test harness.
3. Shared SQL foundations and billing accounts.
4. Stripe catalog/subscription projection.
5. Direct webhook processor and catalog bootstrap.
6. Entitlements and AI allowance ledger.
7. Freeze vault record fixtures, session binding, and the complete
   device/recovery ledger schema.
8. Add worker-isolated unlock, verified bootstrap/sync, collection creation,
   encrypted item persistence, read UI, conflicts, and tombstones as separate
   vault sub-feature commits.
9. Add epoch rotation, device approval/revocation, phrase recovery,
   recovery-root rotation, verified invitations, membership changes, and their
   envelope transactions as separate vault sub-feature commits.
10. Add vault CSP/runtime hardening and complete browser/staging verification.

Each commit must leave the repository buildable and its applicable test suite
passing. Hosted Supabase migrations and live Stripe catalog changes occur only
after local verification and explicit review.

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests and pushes to `develop` and
`main`. It uses a clean `npm ci` installation, then checks unit tests,
typecheck, lint, and production build. A separate job starts local Supabase,
resets migrations, and runs the pgTAP/RLS suite.
