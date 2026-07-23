begin;

select plan(14);

select has_table('private', 'plans', 'plans table exists');
select has_table('private', 'plan_features', 'plan features table exists');
select has_table('private', 'billing_products', 'Stripe Product projection exists');
select has_table('private', 'billing_prices', 'Stripe Price projection exists');
select has_table('private', 'billing_customers', 'Stripe Customer projection exists');
select has_table('private', 'billing_subscriptions', 'Stripe Subscription projection exists');
select has_table('private', 'billing_subscription_items', 'Stripe Subscription Item projection exists');
select has_table('private', 'billing_invoices', 'Stripe Invoice projection exists');
select has_table('private', 'billing_webhook_events', 'webhook inbox exists');
select col_not_null('private', 'billing_webhook_events', 'stripe_event_created_at', 'webhook events retain Stripe event time');
select col_not_null('private', 'billing_subscription_items', 'quantity', 'subscription item quantity is explicit');
select col_type_is('private', 'billing_prices', 'unit_amount', 'bigint', 'Price amount preserves Stripe integer precision');
select ok(has_schema_privilege('service_role', 'private', 'usage'), 'service role can use the private schema');
select ok(not has_schema_privilege('authenticated', 'private', 'usage'), 'authenticated users cannot use the private schema');

select * from finish();

rollback;
