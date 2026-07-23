# ClipsX backend guide

This directory is the design source of truth for the code-managed Supabase
backend. It precedes the migrations deliberately: a database table is easier
to create than to safely remove after users have encrypted data and paid
subscriptions.

## Reading order

1. [Product goal](product-goal.md) explains what ClipsX will and will not do.
2. [Architecture](architecture.md) describes the trust boundaries and flows.
3. [Data model](data-model.md) is the implementation-facing table and column
   dictionary.
4. [Stripe billing](billing-stripe.md) defines the Stripe projection,
   entitlement rules, reconciliation, and operational scenarios.
5. [Local development](local-development.md) defines the migration and test
   workflow.
6. [Sources](sources.md) lists the primary documentation behind the design.

## Locked v1 decisions

- Launch Free and Pro only; Pro has monthly and annual prices.
- Stripe is the source of truth for billing. Supabase holds an idempotent,
  repairable projection used by ClipsX at request time.
- Every user owns a personal `billing_account`; all billing and allowance rows
  point to it rather than directly to `auth.users`.
- A future Team plan can introduce organization billing accounts without
  rewriting personal billing or AI-usage history.
- AI allowance is included with plans. There are no credit packs or usage
  overages in v1.
- Annual plans receive allowance on each monthly anniversary, not upfront.
- All application-owned tables have `created_at` and `updated_at`.
- User ciphertext is end-to-end encrypted and is deleted immediately on item
  deletion; a non-secret tombstone remains for sync.

No migration is authoritative until it has passed the local reset and test
workflow described in this directory.
