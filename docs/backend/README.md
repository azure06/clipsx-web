# ClipsX backend guide

This directory is the design source of truth for the code-managed Supabase
backend. It precedes the migrations deliberately: a database table is easier
to create than to safely remove after users have encrypted data and paid
subscriptions.

## Reading order

1. [Execution plan](../plan.md) is the plain-language launch plan
   and current progress tracker.
2. [Architecture](architecture.md) describes the trust boundaries and flows.
3. [Vault protocol v1](vault-protocol-v1.md) freezes the browser/server wire
   protocol, cryptographic profile, and test-vector contract.
4. [Vault workspace](vault-workspace.md) documents implemented generic items,
   formats, local settings, and browser-approval behavior.
5. [Vault key lifecycle](vault-key-lifecycle.md) is the visual guide to vault
   keys, recovery, encryption, and revocation flows.
6. [Vault flow review and operating guide](vault-flow-review.md) maps the
   implemented lifecycle, user rationale, diagnostics, and deployment checks.
7. [Data model](data-model.md) is the implementation-facing table and column
   dictionary.
8. [Stripe billing](billing-stripe.md) defines the Stripe projection,
   entitlement rules, reconciliation, and operational scenarios.
9. [Local development](local-development.md) defines the migration and test
   workflow.
10. [Sources](sources.md) lists the primary documentation behind the design.

## Locked v1 decisions

- Launch Free and Pro only; Pro has monthly and annual prices.
- Stripe is the source of truth for billing. Supabase holds an idempotent,
  repairable projection used by ClipsX at request time.
- Every user owns a personal `billing_account`; all billing and allowance rows
  point to it rather than directly to `auth.users`.
- A future Team plan can introduce organization billing accounts without
  rewriting personal billing or AI-usage history.
- Hosted AI, AI credits, allowances, and usage overages are inactive in v1.
  The schema remains reserved for a future product decision.
- All application-owned tables have `created_at` and `updated_at`.
- User ciphertext is end-to-end encrypted and is deleted immediately on item
  deletion; a non-secret tombstone remains for sync.

No migration is authoritative until it has passed the local reset and test
workflow described in this directory.
