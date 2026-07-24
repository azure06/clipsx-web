begin;

select plan(12);

insert into private.billing_webhook_events (
  livemode,
  stripe_event_id,
  event_type,
  object_type,
  object_id,
  stripe_event_created_at
) values (
  false,
  'evt_worker_pending',
  'customer.subscription.updated',
  'subscription',
  'sub_worker_pending',
  now()
);

select is(
  (select count(*)::integer from private.claim_billing_webhook_events('worker-test', 1, 30)),
  1,
  'a pending webhook event is claimed once'
);
select is(
  (select processing_state::text from private.billing_webhook_events where stripe_event_id = 'evt_worker_pending'),
  'processing',
  'a claimed event is marked processing'
);
select is(
  (select attempts from private.billing_webhook_events where stripe_event_id = 'evt_worker_pending'),
  1,
  'claiming increments attempts'
);
select is(
  (select locked_by from private.billing_webhook_events where stripe_event_id = 'evt_worker_pending'),
  'worker-test',
  'claiming records the worker identity'
);
select ok(
  private.complete_billing_webhook_event(false, 'evt_worker_pending', 'worker-test'),
  'the lease owner can complete the event'
);
select is(
  (select processing_state::text from private.billing_webhook_events where stripe_event_id = 'evt_worker_pending'),
  'processed',
  'completion makes the event terminal'
);
select ok(
  not private.complete_billing_webhook_event(false, 'evt_worker_pending', 'other-worker'),
  'a completed event cannot be completed again'
);

insert into private.billing_webhook_events (
  livemode,
  stripe_event_id,
  event_type,
  object_type,
  object_id,
  stripe_event_created_at,
  processing_state,
  locked_at,
  locked_by,
  lease_expires_at
) values (
  false,
  'evt_worker_expired',
  'invoice.paid',
  'invoice',
  'in_worker_expired',
  now(),
  'processing',
  now() - interval '2 minutes',
  'crashed-worker',
  now() - interval '1 minute'
);

select is(
  (select count(*)::integer from private.claim_billing_webhook_events('recovery-worker', 1, 30)),
  1,
  'an expired lease can be recovered'
);
select is(
  (select attempts from private.billing_webhook_events where stripe_event_id = 'evt_worker_expired'),
  1,
  'recovering an expired first lease counts as an attempt'
);
select ok(
  private.fail_billing_webhook_event(false, 'evt_worker_expired', 'recovery-worker', 30, 'temporary failure'),
  'the lease owner can schedule a retry'
);
select is(
  (select processing_state::text from private.billing_webhook_events where stripe_event_id = 'evt_worker_expired'),
  'failed',
  'a failed projection remains retryable'
);
select ok(
  (select available_at > now() from private.billing_webhook_events where stripe_event_id = 'evt_worker_expired'),
  'a failed projection receives a future retry time'
);

select * from finish();

rollback;
