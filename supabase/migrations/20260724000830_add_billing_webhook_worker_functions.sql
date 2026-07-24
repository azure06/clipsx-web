create or replace function private.claim_billing_webhook_events(
  p_worker_id text,
  p_max_events integer default 20,
  p_lease_seconds integer default 120
)
returns table (
  livemode boolean,
  stripe_event_id text,
  event_type text,
  object_type text,
  object_id text,
  stripe_event_created_at timestamptz,
  attempts integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(p_worker_id), '') is null then
    raise exception 'worker ID is required';
  end if;

  if p_max_events not between 1 and 100 then
    raise exception 'max events must be between 1 and 100';
  end if;

  if p_lease_seconds not between 30 and 900 then
    raise exception 'lease seconds must be between 30 and 900';
  end if;

  return query
  with candidates as (
    select events.livemode, events.stripe_event_id
    from private.billing_webhook_events as events
    where (
      events.processing_state in ('pending', 'failed')
      and events.available_at <= now()
    ) or (
      events.processing_state = 'processing'
      and events.lease_expires_at <= now()
    )
    order by events.available_at, events.received_at
    for update skip locked
    limit p_max_events
  ), claimed as (
    update private.billing_webhook_events as events
    set processing_state = 'processing',
        attempts = events.attempts + 1,
        locked_at = now(),
        locked_by = p_worker_id,
        lease_expires_at = now() + make_interval(secs => p_lease_seconds),
        last_attempt_at = now(),
        updated_at = now()
    from candidates
    where events.livemode = candidates.livemode
      and events.stripe_event_id = candidates.stripe_event_id
    returning events.*
  )
  select
    claimed.livemode,
    claimed.stripe_event_id,
    claimed.event_type,
    claimed.object_type,
    claimed.object_id,
    claimed.stripe_event_created_at,
    claimed.attempts
  from claimed;
end;
$$;

create or replace function private.complete_billing_webhook_event(
  p_livemode boolean,
  p_stripe_event_id text,
  p_worker_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.billing_webhook_events as events
  set processing_state = 'processed',
      processed_at = now(),
      locked_at = null,
      locked_by = null,
      lease_expires_at = null,
      last_error = null,
      updated_at = now()
  where events.livemode = p_livemode
    and events.stripe_event_id = p_stripe_event_id
    and events.processing_state = 'processing'
    and events.locked_by = p_worker_id
    and events.lease_expires_at > now();

  return found;
end;
$$;

create or replace function private.fail_billing_webhook_event(
  p_livemode boolean,
  p_stripe_event_id text,
  p_worker_id text,
  p_retry_after_seconds integer,
  p_error text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_retry_after_seconds not between 1 and 86400 then
    raise exception 'retry delay must be between 1 and 86400 seconds';
  end if;

  update private.billing_webhook_events as events
  set processing_state = 'failed',
      available_at = now() + make_interval(secs => p_retry_after_seconds),
      locked_at = null,
      locked_by = null,
      lease_expires_at = null,
      last_error = left(coalesce(p_error, 'Unknown worker failure'), 1000),
      updated_at = now()
  where events.livemode = p_livemode
    and events.stripe_event_id = p_stripe_event_id
    and events.processing_state = 'processing'
    and events.locked_by = p_worker_id
    and events.lease_expires_at > now();

  return found;
end;
$$;

revoke all on function private.claim_billing_webhook_events(text, integer, integer) from public;
revoke all on function private.complete_billing_webhook_event(boolean, text, text) from public;
revoke all on function private.fail_billing_webhook_event(boolean, text, text, integer, text) from public;

grant execute on function private.claim_billing_webhook_events(text, integer, integer) to service_role;
grant execute on function private.complete_billing_webhook_event(boolean, text, text) to service_role;
grant execute on function private.fail_billing_webhook_event(boolean, text, text, integer, text) to service_role;
