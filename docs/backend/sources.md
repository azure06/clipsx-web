# Primary references

The architecture is deliberately based on primary documentation, not on
assumptions about platform behavior. Re-check these before implementing an API
upgrade or enabling a new billing/tax feature.

## Stripe

- [Build a subscriptions integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions): local mapping of Customer, Product, Subscription, and status; Product-based access decisions.
- [Subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks): asynchronous lifecycle, status meanings, and invoice outcomes.
- [Webhook best practices](https://docs.stripe.com/webhooks): signature verification, duplicate delivery, unordered events, and canonical object retrieval.
- [Process undelivered events](https://docs.stripe.com/webhooks/process-undelivered-events): retry behavior and recovery process.
- [Manage Products and Prices](https://docs.stripe.com/products-prices/manage-prices): immutable price amounts, price archival, and lookup keys.
- [Dynamic payment methods](https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods): why Checkout must not hard-code `payment_method_types`.
- [Billing testing](https://docs.stripe.com/billing/testing): Stripe CLI, sandbox testing, and Test Clocks.
- [API keys](https://docs.stripe.com/keys): server-only secrets and restricted API keys.
- [Stripe Tax](https://docs.stripe.com/tax): registrations, tax codes, and automatic tax prerequisites.
- [Billing Credits](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits): metered-subscription dependency; intentionally not used in v1.
- [stripe-node changelog](https://github.com/stripe/stripe-node/blob/master/CHANGELOG.md): current SDK/API compatibility baseline.

## Supabase and Postgres

- [Supabase changelog](https://supabase.com/changelog): current platform changes, including Data API exposure behavior.
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): public-schema policy model.
- [Database testing](https://supabase.com/docs/guides/database/testing): local SQL/pgTAP workflow.
- [Supabase CLI](https://supabase.com/docs/reference/cli/introduction): migration, reset, testing, and type-generation commands.
- [PostgreSQL documentation](https://www.postgresql.org/docs/current/): database constraints, transaction isolation, indexes, and roles.
