# Production SQL review — 2026-09-11

Verdict: **not ready for the intended paid launch with the encrypted vault.** The baseline is executable and has useful access controls, but passing the current tests does not establish correct billing lifecycle, key lifecycle, or production upgrade behavior.

Reviewed commit: `1412347`, with a clean working tree before this report. Scope: all eight migrations and thirteen SQL test files, configuration, backend design documents, CI, and the application callers needed to assess the SQL contracts. This is a database readiness review, not an independent cryptographic audit of the entire application.

The initial review made no application changes. The subsequent authorized correction pass edits baseline SQL and application code; no hosted project was queried or deployed. See correction status below.

## Verification performed

- Ran the existing SQL suite against the running local Supabase database: **13 files, 167 assertions, PASS**.
- Created a separate empty local PostgreSQL database, installed pgcrypto/pgTAP and copied the local Auth schema without user data, then applied all eight migrations in order, each transactionally. All applied successfully. This validates a clean SQL baseline; it is not a full hosted-environment rehearsal.
- Ran the same 167 assertions against that fresh baseline: **PASS**.
- Ran additional isolated SQL probes for expired subscriptions, competing subscriptions, account deletion, cross-account history access, new-device epoch coverage, and expired invitations.
- Ran a two-connection webhook lease-takeover reproduction. The stale worker committed a product change despite returning `false`.
- Checked the Supabase changelog, RLS and migration guidance, and installed CLI help. The checks below are based on source and observed behavior, not an assumption that a table or function name implies its behavior.

The extra SQL fixtures were synthetic. The scratch database was removed after review. Existing local application data was not reset.

## Findings

### 1. P1 — Expired subscriptions can prevent entitlement updates entirely

Sources: `supabase/migrations/20260905004644_billing.sql`, lines 277–290 and 495–562.

`account_entitlements` requires `paid_through >= effective_from`. Recomputing an entitlement sets `effective_from = now()` while retaining the selected subscription item's actual period end, including for canceled or otherwise inactive subscriptions.

Once that period end is in the past, an ordinary downgrade or delayed webhook fails the constraint. Because recomputation is inside the projection transaction, the webhook's projection rolls back too. Retrying does not repair the condition; an earlier active entitlement can remain in the database.

**Reproduced:** a canceled subscription with a period ending yesterday caused SQLSTATE `23514`, constraint `account_entitlements_check`, from `recompute_account_entitlement`.

Required change: define whether `effective_from` is the decision timestamp or a coverage-start timestamp. An inactive entitlement must be able to retain a historical paid-through date. Fix the constraint/recomputation consistently and test cancellation after period end, delayed delivery, nonpayment, and replay.

### 2. P1 — A webhook worker that loses its lease can still commit changes

Sources: `20260905004644_billing.sql`, lines 642–677 and 826–834; `src/lib/stripe/supabase-projector.ts`, lines 150–158.

`apply_stripe_webhook_projection` checks lease ownership without locking the inbox row. It subsequently mutates projection tables, then conditionally marks the event processed. If another worker acquires the expired lease in between, the final update affects zero rows and the function returns `false`. Returning `false` does not roll back the earlier writes. The TypeScript caller throws only after the RPC transaction has committed.

**Reproduced:** claim a five-second lease, block the old worker on the product table, let the lease expire, claim it as a new worker, and release the table lock. The old worker returned `f`; its product name update remained committed.

Required change: fence projection writes by locking/validating the claimed inbox row in the same transaction, and make any failed final ownership assertion abort the transaction. Add a real overlapping-worker test, including a worker blocked past lease expiry.

### 3. P1 — Epoch rotation does not preserve readable collection metadata

Sources: `20260905004654_vault_sharing.sql`, lines 349–369 and 538–556; `20260905004649_vault_devices.sql`, lines 377–382; `src/lib/vault/browser-collection-create.ts`, line 56; `src/lib/vault/browser-vault-bootstrap.ts`, lines 86–97.

Collection metadata is encrypted with the initial epoch key. Member addition/removal and device revocation advance the epoch and distribute a fresh key, but do not replace `encrypted_metadata` or `metadata_nonce`. Bootstrap decrypts that unchanged metadata using the current epoch key. A correctly rotated key cannot decrypt it.

There is also an account-binding mismatch for sharing: creation authenticates metadata with the owner's account ID; bootstrap uses the reader's account ID. Another member cannot authenticate the same ciphertext with that different associated data.

**Validation:** traced encryption, persisted columns, all three rotation paths, and bootstrap decryption. This was source-validated, not a complete browser ceremony reproduction.

Required change: define an explicit metadata encryption epoch/key and stable associated-data identity. Either re-encrypt metadata atomically with every relevant rotation or use an independently wrapped metadata key with appropriate recipient policy. Test reload after member add/remove and device revocation, and opening the collection as the recipient.

### 4. P1 — Device enrollment and recovery do not cover the keys existing data needs

Sources: `20260905004651_vault_content.sql`, lines 67–87; `20260905004649_vault_devices.sql`, lines 222–246, 280–297, and 425–445; `20260905004646_vault_foundation.sql`, lines 362–364; `src/app/api/vault/bootstrap/route.ts`, lines 46–91.

There are two related gaps:

- Creating a collection installs one device envelope for its creator. Other already-active devices on the same account receive no envelope. Their bootstrap nevertheless includes the collection and fails when the envelope is absent.
- Approving a new device accepts exactly one current-epoch envelope per collection. It does not deliver the historical epoch keys needed for retained notes written before a rotation. Recovery authorization has the same restriction. Recovery-root rotation also replaces only current-epoch recovery envelopes and revokes the old root; the normal recovery-envelope policy only admits active roots.

**Reproduced:** with a collection containing epochs 1 and 2 and an owner authorized from epoch 1, approval succeeded while the new device's available epoch set was only `{2}`. The missing historical-key behavior is not a claim that the ciphertext was deleted; it means the new device lacks its decryption key. The new-collection and recovery-root cases were source-validated.

Required change: provision every eligible active device on collection creation, and provision retained epochs according to `history_access_from_epoch` during approval/recovery. If another explicit history-grant workflow is intended, implement it before these flows are offered as complete. Test a saved note that remains unchanged across a rotation and then recover/enroll on a fresh browser.

### 5. P2 — Sharing one collection exposes unrelated account-operation metadata

Sources: `20260905004649_vault_devices.sql`, lines 479–534; `src/app/api/vault/account-sync/route.ts`, lines 163–207.

`read_vault_account_sync_page` allows a cross-account read after checking shared collection membership. Its actual operation query filters only by the target account, returning the target's whole account log, including collection creation and note append/delete operations for unrelated collections. The route returns those canonical payloads. A target who has been removed from the shared collection is still eligible for this lookup by its remaining members.

**Reproduced:** a member of one collection retrieved a synthetic unrelated-operation payload from the owner's account log. This establishes metadata disclosure; it does not establish plaintext/key disclosure or break the note encryption.

Required change: distinguish account authorization proofs from private content activity. Expose only the proof needed to verify the shared collection. Because the existing log is hash-linked, merely filtering arbitrary entries may break verification; settle the proof/log design and document the intended cross-account metadata visibility before freezing the protocol.

### 6. P2 — An expired invitation permanently blocks ordinary re-invitation

Sources: `20260905004654_vault_sharing.sql`, lines 40–45 and 124–126; `20260905004646_vault_foundation.sql`, line 89.

Creating an invitation inserts an `invited` membership. Acceptance rejects expired invitations, but no implemented cancellation/expiry transition releases that membership. Creating a replacement rejects any existing `invited` membership, and the unique live-membership index enforces the same rule. Merely changing the invitation status does not release the membership.

**Reproduced:** created an invitation, expired its timestamp, then attempted a fresh invitation with new IDs and commitments. The replacement returned `false`.

Required change: implement an atomic expiration/cancellation lifecycle for both invitation and pending membership, preserving the desired evidence. Test expiry followed by re-invitation and cancellation after acceptance evidence but before activation.

### 7. P2 — Entitlement precedence follows the most recent event, not the active subscription

Source: `20260905004644_billing.sql`, lines 510–528.

Recomputation considers all subscriptions for the account and selects by `stripe_event_created_at`. It does not prefer an active/trialing subscription or select an authoritative billing mode. A recent update to an old canceled subscription can override a valid newer active subscription. Test/live object identities are separated, but the final entitlement query merges their candidates.

**Reproduced:** an account with an active subscription and a more recently updated canceled subscription became `read_only`, with both periods still in the future. This is independent of finding 1.

Required change: define deterministic subscription precedence and production billing-mode isolation. Test cancel/resubscribe plus a late event for the old subscription. The subscription-item projector also only upserts items; define how removed items stop participating in current entitlement calculations while retaining any necessary history.

## Threat-model assessment

The overall separation is sensible, but the implementation is not complete enough to approve the intended vault launch.

| Actor or boundary | Existing protection | Assessment |
| --- | --- | --- |
| Unauthenticated Data API caller | Revoked client privileges; RLS on application tables; restricted mutation RPCs | Good foundation. Keep explicit allow/deny tests. |
| Authenticated user attacking another account | Owner/member read predicates; configuration sync uses an RLS-constrained executor | Good direction, with the cross-account operation-log disclosure above. |
| Stolen account session without vault keys | Cryptographic mutation admission in the server route; ciphertext reads do not imply decryption | Intentionally different from vault unlock. Test both access paths. |
| Removed member or revoked device | Atomic membership/device changes and epoch-key replacement | Key distribution, readable metadata, and retained-history behavior need correction. |
| Duplicate, delayed, or overlapping Stripe delivery | Durable inbox, timestamps, claim identity, transactional projection | Lease fencing and entitlement lifecycle are demonstrably incorrect. |
| Service role, database owner, application release pipeline | Privileged code can change server state; browser signatures and checkpoints must detect invalid history | This is a trusted server mutation boundary, not database-enforced cryptographic verification. SQL alone cannot prove the E2EE claim. |
| Malicious authenticated account consuming resources | Per-command/per-record bounds exist | No complete total storage/revision/device quota or cleanup policy was found. |

The server verifies signatures before calling privileged vault transactions; those SQL functions do not independently verify Ed25519 or bind every opaque payload to its columns. That can be a deliberate architecture, but grants, route admission, and browser verification are all part of the security boundary. Do not grant the mutation RPCs to browser roles.

The absence of direct `service_role` reads on public vault tables is not reported as a defect: the inspected routes read through user RLS and mutate through explicitly granted private definer functions. RLS bypass and object privileges are separate concerns.

The architecture document itself lists unfinished authorization-chain sync, checkpoints, delivery hardening and staging rehearsal. Some companion descriptions are stale: `models.md` refers to a missing `vault-protocol-v1.md`, describes narrower recovery-rotation scope than the SQL implements, and describes retaining revision rows where `delete_vault_note` deletes them. Resolve these discrepancies when fixing the protocol and lifecycle contracts.

## Completeness and production operations

The schema covers the major current domains: configuration sync, billing accounts/catalog/subscriptions/invoices/webhook inbox/entitlements, workspaces reserved for later use, vault devices/recovery, collections/members/invitations/epochs/envelopes, notes/revisions, and signed operation/tombstone records. The missing work is primarily correct lifecycle and operations, not a need to invent more top-level tables.

Before public production use:

- **Account and collection teardown:** every new Auth user automatically receives a billing account whose owner FK restricts user deletion. A probe confirmed deleting even a new synthetic user fails with `billing_accounts_owner_user_id_fkey`. Collection ownership, device references and retained history need a deliberate deletion/anonymization sequence. Full account deletion is explicitly deferred in the current docs; the database is not ready to promise it. Preserve billing records as required rather than adding blanket cascades.
- **Resource limits and retention:** establish cumulative quotas and cleanup for configuration records/tombstones, vault revisions, device-registration challenges and pending enrollments. `apply_batch` limits one batch but not accumulated keys; `replace_profile`'s 1,000-record ceiling is not enforced by incremental uploads. A one-megabyte revision limit is not an account storage limit. Decide where concurrency-safe quota accounting belongs. Plan-feature/AI tables are reserved, not proof of enforcement.
- **Hosted configuration:** verify the actual project version, extensions, role permissions and exposed schemas. The application currently calls private RPCs through PostgREST; hosted API configuration must permit that schema while its grants continue to deny browser callers. Local `config.toml` alone is not evidence that hosted settings match.
- **Recovery operations:** choose and verify backups/PITR as appropriate, define acceptable data loss and recovery time, and actually restore into a separate environment. Include signed-history/checkpoint behavior after restoring an older database. Recovery phrases do not restore ciphertext missing from the database.
- **Test coverage:** add behavioral tests for these findings and a role matrix covering anonymous, unrelated user, invited member, viewer, editor, owner, removed member, revoked device, and service role. Add real concurrency tests. Several current files mostly assert that objects/privileges exist; collection creation's seven assertions do not perform a successful creation at all.

Team billing, AI allowance consumption and attachments are documented as deferred. They do not need speculative completed schemas before this launch if they stay unavailable and unadvertised.

## Updating production without rebuilding it

The eight timestamped baselines already support an append-only migration approach. They do **not** need to be rerunnable or recreated for each release. Once applied to an environment that matters, treat them as immutable and append changes.

Recommended release workflow:

1. Freeze the intended v1 protocol/lifecycle behavior and resolve the findings with new migrations plus matching code/tests/docs.
2. Maintain both a clean-install test and an upgrade test. CI currently starts/resets the database and tests the resulting schema; it does not prove that an upgrade preserves populated production data.
3. For upgrade tests, start at the previous released migration version, populate representative users, paid and canceled subscriptions, old key epochs, shared collections, revisions, tombstones and sync cursors, then apply only the new migrations. Verify preserved records, privileges and application reads/writes.
4. Generate migration names with `supabase migration new <domain>_<change>`. Review the SQL, test it in staging, inspect pending changes with `supabase db push --dry-run`, then apply the approved release to the intended project. Confirm the target and migration history; do not use reset as a production deployment procedure.
5. Use expand/backfill/contract for incompatible changes: introduce the new structure, deploy compatible readers/writers, backfill and validate, then retire the old shape in a later release. Version signed payloads and ciphertext formats explicitly; SQL cannot rewrite signatures or re-encrypt data it cannot decrypt.
6. Establish a single migration deployer, lock/statement timeout policy, backup/restore rehearsal and forward-repair procedure. Check generated types and actual API behavior after deployment.

This follows [Supabase's migration workflow](https://supabase.com/docs/guides/deployment/database-migrations). Explicit grants and role-based behavioral tests should follow the [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

**Go decision:** the current baseline is suitable for continued local/staging work. Approve public production only after the relevant findings are fixed or the affected features are explicitly removed from launch scope, and after a populated upgrade plus hosted restore/API rehearsal passes. No database recreation is required to make those fixes.

## Correction status (2026-09-12)

Implemented directly in existing baselines and callers:

- Expired entitlement projection, paid-subscription selection including unknown
  period dates, separate test/live entitlements, removed item handling, webhook
  mode validation, and replay of expired worker claims.
- Inbox row locking before projection and transaction abort on lost final claim.
- Cumulative settings-sync record/byte bounds, atomic quota rollback, enrollment
  session cleanup/cap, duplicate snapshot rejection, explicit replacement choice,
  and initialization only when records exist.
- Collection-scoped encryption AAD, fresh signed metadata on epoch rotations,
  exact bootstrap envelope epoch, and separate transition signer verification.
- Own-account-only ledger reads and expired invitation membership release.
- Database types generated from the corrected scratch baseline.

Validation:

- `python scripts/test-database-baseline.py --generate-types`: all eight baselines
  apply to a new empty database; all 15 SQL test files pass. A subsequent run with
  the missing-period subscription regression also passes. Existing development
  data is not reset. No new dependencies or migration files were added.
- `npm run test:unit`: 32 files, 74 tests pass. Corrected the cross-tab lock test
  setup to unlock/create its worker before asserting that locking terminates it.
- `npm run typecheck` and `npm run build`: pass.
- `npm run lint`: fails with four errors in unchanged UI files (three unescaped
  JSX entities in VaultOnboardingClient.tsx and synchronous effect state update
  in useMediaQuery.ts), plus 20 warnings. No lint error is in the patch.
- Fresh read-only candidate security review identified nullable period sorting;
  fixed with NULLS LAST and regression fixture. No additional concrete bypass
  was reported in changed sync quota/session, invitation, lease or metadata paths.

The expired-claim SQL test verifies no projection writes. A dedicated automated
lease-overlap regression is still needed. Metadata changes pass builder/admission
unit tests; this is not a complete cross-device browser ceremony rehearsal.

Remaining launch blockers: historical epoch delivery on approval/recovery/root
rotation; new-collection distribution to already-active devices; scoped external
signer proofs for shared collections; account deletion/anonymization lifecycle;
vault cumulative storage/retention maintenance; hosted upgrade and restore
rehearsal. These are not claimed fixed. Billing/settings checks do not certify
those separate vault workflows. Once a baseline is deployed, subsequent schema
changes must use forward migrations; editing an applied file will not upgrade
a production database. No deployment was performed.
