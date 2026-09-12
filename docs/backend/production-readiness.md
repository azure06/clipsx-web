# Production readiness and rationale — 2026-09-12

**Billing and settings sync are the first-release candidate. The full encrypted
vault is not approved for production.** Vault pages and all seven API routes
default to disabled. `CLIPSX_VAULT_PREVIEW_ENABLED=true` is only for isolated
preview testing until scoped signer proofs and complete sharing ceremonies are
finished. This is an explicit release safeguard, not a claim that those workflows
were fixed by hiding them. The user was asked to confirm release scope; no answer
had arrived when this configuration was prepared.

No hosted database was changed or deployed. Existing local application data was
not reset. Baseline SQL was edited directly as authorized, with no new migration
files or dependencies.

## Problems, fixes, and rationale

| What was wrong | What changed | Rationale / evidence |
| --- | --- | --- |
| Expired paid periods violated the entitlement date constraint. | Coverage dates may precede the decision timestamp; expired coverage becomes read-only. | Cancellation and delayed projection must succeed, rather than leave stale access. SQL lifecycle regression passes. |
| Test and live subscriptions shared one entitlement row. | Entitlements use `(billing_account_id, livemode)`; reads and webhook admission use configured mode. | Test payments cannot grant or overwrite live access. SQL mode-isolation checks pass. |
| A canceled/newer subscription or missing period date could outrank valid paid coverage. | Eligible active/trialing coverage sorts first, with null dates last and stable tie-breakers. | An unrelated cancellation must not revoke valid paid access. Regression includes both valid and unknown-period subscriptions. |
| Removed subscription items could continue affecting entitlements. | Fresh subscription snapshots deactivate absent items; expanded item pages are fetched before projection. | Reconciliation needs a complete snapshot. Pagination unit test passes; stale subscription updates do not replace current items. |
| A worker could write after losing its event claim. | Lock the inbox row before any projection and abort if final ownership fails. | Claim ownership and projection commit form one transaction. Two overlapping workers are tested across lease expiry. |
| Crashed processing claims were omitted from replay. | Replay includes expired processing leases and exits unsuccessfully on replay failures. | Abandoned work must remain recoverable and automation must observe failures. |
| Incremental settings uploads could exceed snapshot bounds. | Enforce cumulative 1,000-record / 4 MiB limits under the profile lock, including tombstones. | Whole-request rollback preserves the desktop outbox; tombstones are not pruned into resurrection risk. SQL rollback test passes. |
| Invalid/duplicate snapshots and enrollment accumulation had lifecycle gaps. | Reject duplicate identities/null replace choice; initialize only with retained records; clean dead sessions and cap enrollment at 64. | Preserve explicit replacement semantics and bound account resources without adding unknown acknowledgement statuses. |
| Rotations left metadata encrypted with an old key; shared AAD used the wrong account. | Rotate metadata atomically and sign its ciphertext/nonce; use collection-scoped AAD for metadata and revisions. | Readers must authenticate the same shared ciphertext after rotation. Builder/admission and bootstrap tests pass. |
| Bootstrap could select the wrong envelope or verify a transition with its envelope sender. | Select exact current epoch and verify transition/envelope signers independently. | A device approving another device need not be the transition author. Regression opens that case. |
| Device approval/recovery/root replacement omitted historical keys. | Require exactly the retained authorized `(collection, epoch)` set; retain it in the worker and use the correct epoch for reads. | New devices need keys for old retained revisions. SQL history-set and cryptographic bootstrap tests pass; full ceremonies remain preview. |
| New collections stranded already-active devices. | Create signed envelopes for all active account devices using encryption keys bound to signed enrollment proofs; SQL checks the exact recipient set. | Existing devices should receive the new collection without re-enrollment. Key-decryption regression passes. |
| Recovery rotation attributed an old-root signature to the new root. | Store the old signer ID; verify active-root continuity and device co-signature. | The retained ledger must verify against the key that actually signed it. |
| Historical-key changes accidentally over-counted revocation rotations. | Revocation rotates once per collection, not once per historical epoch. | Final independent review found this regression; a real SQL revocation after three epochs now passes. |
| One shared collection exposed another account's full ledger. | Account sync is own-account-only. | Sharing does not authorize unrelated account history. Scoped external signer proofs remain unfinished, so vault stays preview-only. |
| Expired invitations blocked reinvitation. | Expire associated pending memberships before checking the live membership uniqueness rule. | Preserve invitation evidence while releasing the live membership slot. |
| Vault resource growth had no cumulative boundary. | Transactional serialized-byte counters, account/collection byte ceilings and table-specific record limits; expired registration cleanup. | Count retained records, including signed control records, and roll back quota failures atomically. Concurrent final-slot admission and exact counter rollback pass. |
| Auth deletion was blocked by billing/shared-history foreign keys. | Stable pseudonymous principals separate Auth identity from retained attribution; privileged closure revokes sessions, purges owned data, closes billing and then permits Auth deletion. | Removing an account must not destroy another member's verification history or financial records. Shared-recipient and owner-purge SQL tests pass. |
| Retained JWTs could outlive account closure. | Vault read policies require a live session and unclosed principal. | A valid token alone is insufficient after session revocation. Same-JWT before/after closure test passes. |
| A closing shared member still knew the old collection key. | Fence new encrypted writes until an owner-signed removal rotation completes. | The server cannot generate an E2EE rotation itself. SQL tests verify the fence and its release. |
| Lint and release checks were incomplete. | Fix JSX escaping and media-query subscription; add baseline, concurrency, restore and migration-history checks to CI. | Build/lint checks and repeatable database evidence should gate release rather than depend on manual inspection. |

Correction to an intermediate investigation: item ciphertext is already detached
from durable command bytes (`decodeVaultCommand` excludes transport label 11).
Deleting revision rows can reclaim item ciphertext. Signed collection metadata,
envelopes, commitments and attribution have separate retention requirements.

## Verification

- All eight baselines apply to a fresh scratch database.
- All 17 SQL test files pass.
- Real overlapping webhook workers pass across claim expiry.
- Concurrent capacity admission allows exactly one final-slot writer and leaves
  counters equal to retained bytes.
- A populated logical backup restores to a second scratch database with matching
  Auth/billing rows, webhook state and RLS policies.
- Supabase security advisors return no findings on the corrected scratch database.
- 79 unit tests pass; type-check and production build pass.
- Repository lint passes with 20 existing warnings and no errors.
- Migration guard test accepts a forward migration and rejects a rewritten
  released baseline.

Commands:

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
2. Apply this baseline once to the new project after reviewing the target and
   pending SQL. Never run a production reset. Tag the deployed commit and set CI
   variable `MIGRATION_BASE_REF` to that immutable release.
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

**Still unverified on the hosted project:** actual API grants/configuration,
live Checkout/payment/cancellation/webhook replay, desktop sync between two real
devices, provider backup/PITR settings and a hosted restore rehearsal. The local
restore is real evidence, but does not establish the hosted recovery objective.
No public-production deployment approval is inferred from local test success.

**Still unfinished for the full vault:** scoped external signer proof delivery,
complete invitation/approval/recovery trust-anchor ceremonies and cross-device
browser rehearsal. Enabling the preview flag does not resolve these items.
