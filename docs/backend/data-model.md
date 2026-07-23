# Data model and column dictionary

All application-owned tables have `created_at timestamptz not null default
now()` and `updated_at timestamptz not null default now()`. A shared trigger
updates the latter on mutation. Append-only tables retain both fields; they are
normally equal.

## Schemas

| Schema | Purpose | Browser access |
| --- | --- | --- |
| `public` | encrypted vault rows and safe user-facing RPCs | Explicit grants plus RLS |
| `private` | Stripe projection, accounting support, and worker internals | API-enabled for `service_role` only; no browser grants |

## Billing and plans

| Table | Important columns and meaning |
| --- | --- |
| `plans` | `id`: internal immutable ID; `code`: stable product code (`free`, `pro`); `display_name`: UI label; `active`: whether new assignments are allowed. |
| `plan_features` | `plan_id`: owner plan; `feature_key`: stable capability name; `value_jsonb`: typed configurable limit or boolean. This prevents feature limits from being scattered through code. |
| `billing_accounts` | `id`: billing owner ID; `kind`: `personal` now, `organization` later; `owner_user_id`: creator/owner; `status`: active or closed. Every user has one personal account. |
| `billing_customers` | `billing_account_id`: local owner; `stripe_customer_id`: stable Stripe identity; `livemode`: prevents test/live collisions; `deleted_at`: Stripe deletion marker. Email is not the identity key. |
| `billing_products` | `stripe_product_id`: Stripe Product; `plan_id`: ClipsX plan represented by that Product; `name`, `description`, `active`: display/catalog state; `stripe_created_at`, `stripe_event_created_at`: source timing. |
| `billing_prices` | `stripe_price_id`: immutable commercial version; `product_id`: parent Product; `lookup_key`: stable deployment-safe handle; `currency`, `unit_amount`, `recurring_interval`, `interval_count`: what is charged; `active`: sale eligibility; `tax_behavior`: future tax configuration. |
| `billing_subscriptions` | `stripe_subscription_id`: Stripe lifecycle object; `billing_account_id`, `customer_id`: local ownership; `status`: Stripe status; `cancel_at_period_end`, `cancel_at`, `canceled_at`, `ended_at`: cancellation semantics; `trial_start`, `trial_end`: trial window. |
| `billing_subscription_items` | `stripe_subscription_item_id`: item identity; `subscription_id`: parent; `price_id`: selected billing variant; `quantity`: future seat-compatible quantity; `current_period_start`, `current_period_end`: access/billing period, held at Stripe item level. |
| `billing_invoices` | `stripe_invoice_id`: invoice identity; `billing_account_id`, `subscription_id`: association; `status`, `amount_due`, `amount_paid`, `currency`, `paid_at`, `next_payment_attempt`: dunning/support information. No payment-method details are copied. |
| `billing_webhook_events` | `stripe_event_id`: idempotency key; `event_type`, `object_type`, `object_id`: routing; `livemode`: environment boundary; `stripe_event_created_at`: source ordering; `state`, `attempts`, `last_error`, `processed_at`: durable processing state. |
| `account_entitlements` | `billing_account_id`: one current access record; `plan_id`: effective plan; `source_subscription_id`: Stripe-derived origin; `status`: active, grace, or read-only; `effective_from`, `paid_through`, `grace_until`: authorization timeline. |
| `ai_allowance_periods` | `billing_account_id`: allowance owner; `source_subscription_item_id`: plan basis; `period_start`, `period_end`: monthly window; `granted_units`, `consumed_units`: capacity accounting; `grant_reason`: initial, renewal, or adjustment. |
| `ai_usage_events` | `billing_account_id`: payer; `actor_user_id`: future Team member attribution; `allowance_period_id`: charged window; `request_id`: idempotent application action; `kind`: reserve, settle, refund; `delta_units`: signed accounting change; `occurred_at`: business timestamp. Prompts and AI output are never stored. |

### Why `billing_account_id` exists

Today it means “this user's personal billing account.” In the future, a Team
can own an organization account and subscriptions/allowances can move to that
account without rewriting subscriptions, invoices, or usage history. Team
membership and allocation policy are intentionally omitted until they are a
real product requirement.

## Encrypted vault

| Table | Important columns and meaning |
| --- | --- |
| `devices` | `user_id`: owner; `public_key`: X25519 recipient key; `auth_session_id`: Supabase session to invalidate on revocation; `status`, `last_seen_at`, `revoked_at`: device lifecycle. Private keys never enter this table. |
| `recovery_key_backups` | `user_id`: owner; `format_version`: decoder choice; `encrypted_recovery_key`: recovery material encrypted locally using the recovery code. Recovery code plaintext is never stored. |
| `collections` | `owner_user_id`: creator; `encrypted_metadata`: encrypted display data; `current_key_version`: active collection key; `rotation_required_at`: signals future-only rotation after membership changes. |
| `collection_members` | `collection_id`, `user_id`: membership identity; `role`: owner/editor/viewer policy; `status`: pending/active/removed; `accepted_at`, `removed_at`: audit timeline. |
| `collection_invitations` | `collection_id`, `inviter_user_id`, `recipient_user_id`: sharing relationship; `status`, `expires_at`, `accepted_at`, `revoked_at`: invitation lifecycle. |
| `collection_key_versions` | `collection_id`, `version`: immutable key-generation identity; `algorithm`: crypto decoder; `created_by_user_id`: audit actor. |
| `collection_key_envelopes` | `collection_id`, `key_version`: wrapped collection key; `recipient_device_id` or recovery recipient: intended decryptor; `encrypted_key`: versioned encrypted envelope. |
| `vault_items` | `collection_id`: authorization scope; `key_version`: collection key used to wrap item key; `ciphertext`: encrypted content; `wrapped_item_key`: item key encrypted by collection key; `content_type`: decoder choice; `version`: optimistic write version; `created_by_user_id`, `updated_by_user_id`: audit. |
| `vault_tombstones` | `item_id`: deleted item identity; `collection_id`: synchronization scope; `deleted_by_user_id`, `deleted_at`: deletion event. Ciphertext and wrapped keys are absent. |

## Required constraints and indexes

- Unique personal billing account per user and unique Stripe IDs per `livemode`.
- Unique subscription item and webhook event IDs per `livemode`.
- Unique allowance period for one billing account and monthly time window.
- Unique AI event identity for a request and event kind.
- Foreign keys from every Stripe projection child to its local parent where the
  relationship is known; deletion is restricted, not cascaded through history.
- Partial indexes for active subscriptions/entitlements and pending webhook
  events; composite keyset indexes for collection item sync.
- Check constraints for allowed states, nonnegative quantity, nonnegative
  allowance totals, valid time ranges, and exactly one envelope recipient type.
