# Stripe billing architecture

## Authority model

Stripe is authoritative for Products, Prices, Customers, Subscriptions, and
Invoices. ClipsX projects the business-relevant subset into `private` Postgres
tables so authorization is fast, auditable, and available without an API call
to Stripe on every request.

This is a projection, not a second billing engine. It does not create renewal
loops, calculate invoices, or store card data.

## Catalog model

- Free is a ClipsX-only plan and has no Stripe Product.
- Pro is one Stripe Product.
- Pro monthly and Pro annual are separate recurring Prices on that Product.
- Every future tier gets its own Stripe Product; monthly/annual/currency
  variants are Prices on that Product.
- Price amounts are not edited. A price change creates a Price, transfers the
  stable lookup key, and archives the old Price.

The product controls access semantics; the price controls amount and interval.
This means a price migration does not require changing entitlement code.

## Checkout and portal

Checkout runs server-side after resolving the authenticated user's selected,
authorized billing workspace. Personal checkout is enabled now; a future Team
checkout will require an organization owner or admin. It creates or reuses the
stored Stripe Customer ID, records
the local billing-account ID in Checkout metadata and client reference data,
and uses the configured Price ID.

The implementation must:

- omit `payment_method_types` so Stripe can use dynamic eligible payment
  methods;
- set a per-session `integration_identifier` compatible with the current
  Stripe API;
- never use `customer_email` or an email search as the durable Customer lookup;
- use the stored Customer ID for Customer Portal sessions;
- keep Stripe keys and webhook secrets server-only, preferably as narrowly
  scoped restricted API keys.

## Webhook processor

1. Read the unmodified raw request body and verify the Stripe signature.
2. Atomically claim `stripe_event_id` in `private.billing_webhook_events` with
   a short lease. This inserts a new event or reclaims an expired/failed one.
3. A duplicate that is already `processed` returns HTTP 200 without side
   effects. A concurrently processing duplicate returns HTTP 500, so Stripe
   retries rather than acknowledging uncommitted work.
4. The endpoint retrieves the canonical Stripe object and
   never assumes event delivery order.
5. One private database transaction applies the projection, recomputes the
   account entitlement, and marks the event processed.
6. A transient failure returns HTTP 500 so Stripe retries delivery. A duplicate
   only receives success after the original projection has committed.

Verification, claim, canonical retrieval, or projection failure returns non-2xx
to Stripe. That gives Stripe a chance to retry delivery without ever
acknowledging a result that has not committed.

For destructive Product events that cannot be retrieved, preserve the object
ID and mark the local catalog record inactive/deleted from the signed event.

### Required event subscriptions

| Event family | Local effect |
| --- | --- |
| Product and Price create/update/delete | Maintain catalog projection; catalog changes never alter existing entitlement history retroactively. |
| Customer create/update/delete | Maintain billing-account mapping and deletion state. |
| Subscription create/update/delete/paused/resumed | Project current status, selected Price/Product, item periods, cancellation, and trial state; recompute entitlement. |
| `invoice.paid` | Confirm/extend paid-through access and idempotently create the applicable allowance period. |
| Payment/finalization failure, void, uncollectible | Apply dunning/grace policy and surface support information. |
| Checkout complete/async success/expired | Correlate user intent and improve UX; subscription and invoice state remains authoritative. |

## Entitlement policy

| Stripe state | ClipsX access |
| --- | --- |
| `trialing`, `active` | Pro |
| `past_due` | Read-only immediately; no grace period in v1 |
| `incomplete` | No Pro access until payment succeeds |
| `incomplete_expired`, `unpaid`, `canceled`, `paused` | Read-only retained cloud data |
| `cancel_at_period_end` | Pro until `paid_through`, then read-only |

AI allowance tables exist for a future feature, but no allowance is granted,
consumed, or scheduled in v1. AI provider/model pricing and allowance policy
must be decided before those tables affect customer access or billing.

## Operations and recovery

Webhooks only observe delivery attempts; they are not the only recovery path.

- A code-managed catalog bootstrap creates sandbox Products, Prices, lookup
  keys, and portal configuration idempotently.
- A runbook lists pending or failed events, replays them idempotently through
  `npm run stripe:replay-pending`, investigates
  Stripe delivery failures, and records the resolution.
- Test and live rows never share unique identities: every projected object has
  `livemode` and all replay commands require an explicit environment.

### Runtime configuration

- `npm run stripe:bootstrap-catalog` creates or reuses the sandbox Product and
  monthly/annual Prices. It requires `STRIPE_PRO_CURRENCY`,
  `STRIPE_PRO_MONTHLY_AMOUNT_CENTS`, and `STRIPE_PRO_YEARLY_AMOUNT_CENTS`, and
  prints the two Price IDs to place in local configuration. It also sets the
  Product description, pricing-page URL, and monthly default Price. A product
  image is intentionally optional for sandbox testing and can be added later
  as a stable public HTTPS URL.
- No cron job is required. Stripe webhook delivery retries are the automatic
  retry mechanism; local support can replay pending events with
  `npm run stripe:replay-pending`.
- The browser never receives Stripe secret keys, webhook secrets, Price IDs as
  authority, or raw private billing rows. It receives only workspace and
  billing-summary APIs authorized from the Supabase user ID.

## Tax decision

`automatic_tax` is not enabled in v1. Before enabling it, a tax advisor must
confirm the jurisdictions where ClipsX is registered and the correct Stripe
product tax code. Stripe Tax configuration and legal registration are distinct
steps; registration creation is never automated by this application.

## Why credits are not included

Purchased AI credits add expiry, refunds, tax, entitlement precedence, ledger,
and billing-model complexity. Stripe Billing Credits also apply to metered
subscription items. ClipsX v1 instead grants a plan allowance and keeps a
general local usage ledger; a future higher tier can change the allowance
without redesigning this model.
