begin;

select plan(15);

select has_table('private', 'account_entitlements', 'current entitlement table exists');
select has_table('private', 'ai_allowance_periods', 'AI allowance period table exists');
select has_table('private', 'ai_usage_events', 'AI usage ledger exists');
select col_not_null('private', 'account_entitlements', 'status', 'entitlement status is required');
select col_not_null('private', 'ai_allowance_periods', 'grant_idempotency_key', 'allowance grants are idempotent');
select col_not_null('private', 'ai_usage_events', 'idempotency_key', 'usage events are idempotent');
select col_type_is('private', 'ai_allowance_periods', 'granted_units', 'bigint', 'allowance units preserve integer precision');
select has_column('private', 'billing_subscriptions', 'billing_cycle_anchor', 'subscription retains its billing anchor');
select has_column('private', 'billing_subscriptions', 'pause_collection_behavior', 'subscription distinguishes collection pauses');
select has_column('private', 'billing_webhook_events', 'available_at', 'webhook event has retry availability');
select has_column('private', 'billing_webhook_events', 'locked_at', 'webhook event has a worker lease time');
select has_column('private', 'billing_webhook_events', 'locked_by', 'webhook event identifies its worker');
select has_column('private', 'billing_webhook_events', 'lease_expires_at', 'webhook event can recover after worker failure');
select col_not_null('private', 'ai_usage_events', 'actor_user_id', 'usage remains attributable for future Team plans');
select hasnt_table('public', 'account_entitlements', 'entitlements are not in the public schema');

select * from finish();

rollback;
