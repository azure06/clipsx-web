begin;
select plan(8);
insert into auth.users(id) values ('14000000-0000-0000-0000-000000000001');
create temporary table billing_fixture as select id as account from private.billing_accounts where owner_user_id='14000000-0000-0000-0000-000000000001';
insert into private.billing_products(id,stripe_product_id,livemode,plan_id,name,active)
select '14000000-0000-0000-0000-000000000002','prod_lifecycle',true,id,'Lifecycle',true from private.plans where code='pro';
insert into private.billing_prices(id,stripe_price_id,livemode,product_id,active,currency,billing_scheme)
values ('14000000-0000-0000-0000-000000000003','price_lifecycle',true,'14000000-0000-0000-0000-000000000002',true,'usd','per_unit');
insert into private.billing_customers(id,billing_account_id,stripe_customer_id,livemode)
select '14000000-0000-0000-0000-000000000004',account,'cus_lifecycle',true from billing_fixture;
insert into private.billing_subscriptions(id,billing_account_id,customer_id,stripe_subscription_id,livemode,status,stripe_event_created_at)
select '14000000-0000-0000-0000-000000000005',account,'14000000-0000-0000-0000-000000000004','sub_expired',true,'canceled',now() from billing_fixture;
insert into private.billing_subscription_items(subscription_id,price_id,stripe_subscription_item_id,livemode,current_period_start,current_period_end)
values ('14000000-0000-0000-0000-000000000005','14000000-0000-0000-0000-000000000003','si_expired',true,now()-interval '31 days',now()-interval '1 day');
select lives_ok('select private.recompute_account_entitlement(account,true) from billing_fixture','expired subscriptions can be projected');
select is((select status::text from private.account_entitlements where billing_account_id=(select account from billing_fixture) and livemode), 'read_only','expired canceled subscription is read-only');
select ok((select paid_through < effective_from from private.account_entitlements where billing_account_id=(select account from billing_fixture) and livemode),'historical coverage date is retained');
insert into private.billing_subscriptions(id,billing_account_id,customer_id,stripe_subscription_id,livemode,status,stripe_event_created_at)
select '14000000-0000-0000-0000-000000000006',account,'14000000-0000-0000-0000-000000000004','sub_active',true,'active',now()-interval '1 day' from billing_fixture;
insert into private.billing_subscription_items(subscription_id,price_id,stripe_subscription_item_id,livemode,current_period_start,current_period_end)
values ('14000000-0000-0000-0000-000000000006','14000000-0000-0000-0000-000000000003','si_active',true,now()-interval '1 day',now()+interval '29 days');
insert into private.billing_subscriptions(id,billing_account_id,customer_id,stripe_subscription_id,livemode,status)
select '14000000-0000-0000-0000-000000000007',account,'14000000-0000-0000-0000-000000000004','sub_unknown_period',true,'active' from billing_fixture;
insert into private.billing_subscription_items(subscription_id,price_id,stripe_subscription_item_id,livemode)
values ('14000000-0000-0000-0000-000000000007','14000000-0000-0000-0000-000000000003','si_unknown_period',true);
select private.recompute_account_entitlement(account,true) from billing_fixture;
select is((select status::text from private.account_entitlements where billing_account_id=(select account from billing_fixture) and livemode),'active','active subscription wins over a newer canceled event');
select is((select source_subscription_id from private.account_entitlements where billing_account_id=(select account from billing_fixture) and livemode),'14000000-0000-0000-0000-000000000006'::uuid,'active subscription is the source');
select private.recompute_account_entitlement(account,false) from billing_fixture;
select is((select source_subscription_id from private.account_entitlements where billing_account_id=(select account from billing_fixture) and not livemode),null::uuid,'test mode cannot consume live subscriptions');
select is((select source_subscription_id from private.account_entitlements where billing_account_id=(select account from billing_fixture) and livemode),'14000000-0000-0000-0000-000000000006'::uuid,'test recompute cannot overwrite live entitlement');
select private.claim_stripe_webhook_event(false,'evt_expired_lease','product.updated','product','prod_stale',now(),'old',5);
update private.billing_webhook_events set lease_expires_at=now()-interval '1 second' where stripe_event_id='evt_expired_lease';
select ok(not private.apply_stripe_webhook_projection(false,'evt_expired_lease','old',now(),'{"products":[{"id":"prod_stale","name":"stale","active":true}]}') and not exists(select from private.billing_products where stripe_product_id='prod_stale'),'expired worker makes no projection writes');
select * from finish();
rollback;
