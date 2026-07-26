begin;

select plan(8);

select is(
  private.claim_stripe_webhook_event(false, 'evt_direct', 'product.updated', 'product', 'prod_direct', now(), 'request-one', 25),
  'claimed',
  'a new signed Stripe event is claimed'
);
select is(
  private.claim_stripe_webhook_event(false, 'evt_direct', 'product.updated', 'product', 'prod_direct', now(), 'request-two', 25),
  'in_progress',
  'a concurrent duplicate is not acknowledged as processed'
);
select ok(
  private.apply_stripe_webhook_projection(
    false, 'evt_direct', 'request-one', now(),
    jsonb_build_object('products', jsonb_build_array(jsonb_build_object(
      'id', 'prod_direct', 'name', 'Direct Pro', 'active', true, 'deleted', false, 'plan_code', 'pro'
    )), 'prices', '[]'::jsonb, 'customers', '[]'::jsonb, 'subscriptions', '[]'::jsonb,
      'subscription_items', '[]'::jsonb, 'invoices', '[]'::jsonb)
  ),
  'projection commits under the event claim'
);
select is(
  (select processing_state::text from private.billing_webhook_events where stripe_event_id = 'evt_direct'),
  'processed',
  'the event is marked processed in the same projection transaction'
);
select is(
  (select name from private.billing_products where stripe_product_id = 'prod_direct'),
  'Direct Pro',
  'the catalog projection is committed'
);
select is(
  private.claim_stripe_webhook_event(false, 'evt_direct', 'product.updated', 'product', 'prod_direct', now(), 'request-three', 25),
  'processed',
  'a processed duplicate is idempotently acknowledged'
);
select ok(
  private.fail_stripe_webhook_event(false, 'evt_direct', 'request-three', 'must not change processed event') = false,
  'a processed event cannot be moved back to failed'
);
select hasnt_function('private', 'claim_billing_webhook_events', array['text', 'integer', 'integer'], 'scheduled batch worker function is removed');

select * from finish();

rollback;
