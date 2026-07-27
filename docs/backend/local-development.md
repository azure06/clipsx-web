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
- A tombstoned item never returns ciphertext during sync.

## Commit order

1. Documentation only.
2. Pinned local tooling and test harness.
3. Shared SQL foundations and billing accounts.
4. Stripe catalog/subscription projection.
5. Direct webhook processor and catalog bootstrap.
6. Entitlements and AI allowance ledger.
7. Device/recovery schema and policies.
8. Collections, key envelopes, sharing, item sync, and tombstones.
9. Website integration and end-to-end sandbox verification.

Each commit must leave the repository buildable and its applicable test suite
passing. Hosted Supabase migrations and live Stripe catalog changes occur only
after local verification and explicit review.

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests and pushes to `develop` and
`main`. It uses a clean `npm ci` installation, then checks unit tests,
typecheck, lint, and production build. A separate job starts local Supabase,
resets migrations, and runs the pgTAP/RLS suite.
