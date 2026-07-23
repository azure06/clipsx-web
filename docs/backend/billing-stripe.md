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

Checkout runs server-side after resolving the authenticated user's personal
billing account. It creates or reuses the stored Stripe Customer ID, records
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
2. Insert `stripe_event_id` into `private.billing_webhook_events` atomically.
3. A duplicate returns HTTP 200 without side effects.
4. A successfully persisted new event also returns HTTP 200 immediately. The
   durable inbox, not the request lifetime, is the hand-off to processing.
5. A worker claims one pending event, retrieves the canonical Stripe object,
   and never assumes event delivery order.
6. In one database transaction, the worker upserts the relevant projection and
   recomputes the account entitlement/allowance effect.
7. The worker marks the event processed. On failure it records the error and
   attempt count, leaving the event available for retry and reconciliation.

Only a failure to verify or persist the inbox record returns non-2xx to Stripe.
That gives Stripe a chance to retry delivery without coupling delivery success
to a potentially slow canonical-object retrieval.

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
| `past_due` | Pro during configured grace window |
| `incomplete` | No Pro access until payment succeeds |
| `incomplete_expired`, `unpaid`, `canceled`, `paused` | Read-only retained cloud data |
| `cancel_at_period_end` | Pro until `paid_through`, then read-only |

An annual subscription's item period is one year, but allowance windows are
monthly. The first window opens after the qualifying payment. A scheduled job
opens each next monthly anniversary only while the entitlement remains active
or within the explicitly chosen grace policy.

## Reconciliation and operations

Webhooks only observe delivery attempts; they are not the only recovery path.

- A code-managed catalog bootstrap creates sandbox Products, Prices, lookup
  keys, and portal configuration idempotently.
- An initial backfill imports the relevant existing Stripe objects before the
  webhook endpoint is enabled.
- A scheduled reconciler compares local Customers, active Subscriptions, and
  recent Invoices against Stripe; it reuses the same projection functions as
  the webhook processor.
- A runbook lists pending events, replays them idempotently, investigates
  Stripe delivery failures, and records the resolution.
- Test and live rows never share unique identities: every projected object has
  `livemode` and all worker commands require an explicit environment.

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
