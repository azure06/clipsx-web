# Website operations

## Configuration and validation

Use reviewed HTTPS origins and exact Auth redirects. Keep service-role, provider, database and payment credentials server-only. Refer to [billing](../../../../docs/backend/billing.md), [settings sync](../../../../docs/backend/configuration-sync.md) and [authentication](../../../../docs/backend/authentication-and-account-closure.md) for their configuration and contracts.

Run relevant checks for the change; this list does not record passing evidence:

```sh
python scripts/test-database-baseline.py --advisors --generate-types
npm run test:unit
node --test scripts/verify-migration-history.test.mjs
npm run typecheck
npm run lint
npm run build
```

## Operations and deployment boundary

1. Keep vault preview disabled in production. Verify the intended project, HTTPS
   URL, email/auth redirects, exposed `private` schema with browser grants denied,
   Stripe live keys, catalog mappings and webhook destination.
2. Never run a production reset. Tag the deployed commit and set CI variable
   `MIGRATION_BASE_REF` to that immutable release.
3. For later releases, create forward migrations with Supabase CLI. Run
   `node scripts/verify-migration-history.mjs --base RELEASE_TAG`, restore a
   populated staging copy, apply only new migrations and verify preserved data.
   The guard protects history; it cannot prove arbitrary future migration logic.
4. Schedule `node --env-file=.env.local scripts/cleanup-vault.mjs` at least hourly
   wherever preview vault enrollment is enabled. Run/retry the existing Stripe
   replay script with the correct mode and webhook destination.
5. Administrative closure:
   `node --env-file=.env.local scripts/close-account.mjs --user UUID --confirm UUID`.
   Use operator-held service credentials. Matching Stripe keys are required for
   every customer mode. Cancellation webhooks must finish before closure; retry
   if they are still pending. The SQL transaction revokes access before Auth
   deletion; retrying finishes a failed final Auth deletion. Retained billing
   records/public keys are pseudonymous and must not be described as anonymous.

**Hosted acceptance requires fresh evidence for:** Auth provider/redirect configuration,
leaked-password protection, live Checkout/payment/cancellation/webhook replay,
desktop sync between two real devices, provider backup/PITR settings and a hosted
restore rehearsal. Verify table/schema grants and approval-catalog isolation. The local restore is real evidence, but does not
establish the hosted recovery objective.
No public-production deployment approval is inferred from local test success.

**Still unfinished for the full vault:** scoped external signer proof delivery,
complete invitation/approval/recovery trust-anchor ceremonies and cross-device
browser rehearsal. Enabling the preview flag does not resolve these items.
