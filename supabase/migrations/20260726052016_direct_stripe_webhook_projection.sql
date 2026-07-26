create or replace function private.claim_stripe_webhook_event(
  p_livemode boolean,
  p_stripe_event_id text,
  p_event_type text,
  p_object_type text,
  p_object_id text,
  p_stripe_event_created_at timestamptz,
  p_request_id text,
  p_lease_seconds integer default 25
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_state private.billing_webhook_processing_state;
  existing_lease timestamptz;
begin
  if p_lease_seconds not between 5 and 60 then
    raise exception 'lease seconds must be between 5 and 60';
  end if;

  insert into private.billing_webhook_events (
    livemode, stripe_event_id, event_type, object_type, object_id,
    stripe_event_created_at, processing_state, attempts, locked_at, locked_by,
    lease_expires_at, last_attempt_at
  ) values (
    p_livemode, p_stripe_event_id, p_event_type, p_object_type, p_object_id,
    p_stripe_event_created_at, 'processing', 1, now(), p_request_id,
    now() + make_interval(secs => p_lease_seconds), now()
  ) on conflict (livemode, stripe_event_id) do nothing;

  if found then return 'claimed'; end if;

  select processing_state, lease_expires_at
  into existing_state, existing_lease
  from private.billing_webhook_events
  where livemode = p_livemode and stripe_event_id = p_stripe_event_id
  for update;

  if existing_state = 'processed' then return 'processed'; end if;
  if existing_state = 'processing' and existing_lease > now() then return 'in_progress'; end if;

  update private.billing_webhook_events
  set processing_state = 'processing',
      attempts = attempts + 1,
      locked_at = now(), locked_by = p_request_id,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      last_attempt_at = now(), last_error = null, updated_at = now()
  where livemode = p_livemode and stripe_event_id = p_stripe_event_id;

  return 'claimed';
end;
$$;

create or replace function private.fail_stripe_webhook_event(
  p_livemode boolean, p_stripe_event_id text, p_request_id text, p_error text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.billing_webhook_events
  set processing_state = 'failed', locked_at = null, locked_by = null,
      lease_expires_at = null, last_error = left(coalesce(p_error, 'Projection failed'), 1000),
      updated_at = now()
  where livemode = p_livemode and stripe_event_id = p_stripe_event_id
    and processing_state = 'processing' and locked_by = p_request_id;
  return found;
end;
$$;

create or replace function private.apply_stripe_webhook_projection(
  p_livemode boolean,
  p_stripe_event_id text,
  p_request_id text,
  p_event_created_at timestamptz,
  p_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  product jsonb;
  price jsonb;
  customer jsonb;
  subscription jsonb;
  item jsonb;
  invoice jsonb;
  local_product_id uuid;
  local_price_id uuid;
  local_customer_id uuid;
  local_subscription_id uuid;
  billing_account uuid;
  affected_accounts uuid[] := array[]::uuid[];
  plan_uuid uuid;
begin
  if not exists (
    select 1 from private.billing_webhook_events
    where livemode = p_livemode and stripe_event_id = p_stripe_event_id
      and processing_state = 'processing' and locked_by = p_request_id
      and lease_expires_at > now()
  ) then
    return false;
  end if;

  for product in select value from jsonb_array_elements(coalesce(p_payload->'products', '[]'::jsonb)) loop
    select id into plan_uuid from private.plans where code = nullif(product->>'plan_code', '');
    insert into private.billing_products (
      stripe_product_id, livemode, plan_id, name, description, active,
      stripe_created_at, stripe_event_created_at, stripe_deleted_at
    ) values (
      product->>'id', p_livemode, plan_uuid, coalesce(product->>'name', ''), product->>'description',
      coalesce((product->>'active')::boolean, false), nullif(product->>'created_at', '')::timestamptz,
      p_event_created_at,
      case when coalesce((product->>'deleted')::boolean, false) then now() else null end
    ) on conflict (livemode, stripe_product_id) do update
      set plan_id = excluded.plan_id, name = excluded.name, description = excluded.description,
          active = excluded.active, stripe_event_created_at = excluded.stripe_event_created_at,
          stripe_deleted_at = excluded.stripe_deleted_at
      where private.billing_products.stripe_event_created_at is null
         or private.billing_products.stripe_event_created_at <= excluded.stripe_event_created_at;
  end loop;

  for price in select value from jsonb_array_elements(coalesce(p_payload->'prices', '[]'::jsonb)) loop
    select id into local_product_id from private.billing_products
    where livemode = p_livemode and stripe_product_id = price->>'product_id';
    if local_product_id is null then raise exception 'missing projected product for Stripe Price'; end if;
    insert into private.billing_prices (
      stripe_price_id, livemode, product_id, lookup_key, active, currency, unit_amount,
      billing_scheme, recurring_interval, recurring_interval_count, usage_type, tax_behavior,
      stripe_created_at, stripe_event_created_at
    ) values (
      price->>'id', p_livemode, local_product_id, price->>'lookup_key',
      coalesce((price->>'active')::boolean, false), price->>'currency',
      nullif(price->>'unit_amount', '')::bigint, coalesce(price->>'billing_scheme', 'per_unit'),
      price->>'recurring_interval', nullif(price->>'recurring_interval_count', '')::integer,
      price->>'usage_type', price->>'tax_behavior', nullif(price->>'created_at', '')::timestamptz,
      p_event_created_at
    ) on conflict (livemode, stripe_price_id) do update
      set product_id = excluded.product_id, lookup_key = excluded.lookup_key, active = excluded.active,
          currency = excluded.currency, unit_amount = excluded.unit_amount,
          billing_scheme = excluded.billing_scheme, recurring_interval = excluded.recurring_interval,
          recurring_interval_count = excluded.recurring_interval_count, usage_type = excluded.usage_type,
          tax_behavior = excluded.tax_behavior, stripe_event_created_at = excluded.stripe_event_created_at
      where private.billing_prices.stripe_event_created_at is null
         or private.billing_prices.stripe_event_created_at <= excluded.stripe_event_created_at;
  end loop;

  for customer in select value from jsonb_array_elements(coalesce(p_payload->'customers', '[]'::jsonb)) loop
    billing_account := nullif(customer->>'billing_account_id', '')::uuid;
    if billing_account is null then
      select billing_account_id into billing_account from private.billing_customers
      where livemode = p_livemode and stripe_customer_id = customer->>'id';
    end if;
    if billing_account is null then continue; end if;
    insert into private.billing_customers (
      billing_account_id, stripe_customer_id, livemode, stripe_created_at,
      stripe_event_created_at, stripe_deleted_at
    ) values (
      billing_account, customer->>'id', p_livemode, nullif(customer->>'created_at', '')::timestamptz,
      p_event_created_at,
      case when coalesce((customer->>'deleted')::boolean, false) then now() else null end
    ) on conflict (billing_account_id, livemode) do update
      set stripe_customer_id = excluded.stripe_customer_id,
          stripe_event_created_at = excluded.stripe_event_created_at,
          stripe_deleted_at = excluded.stripe_deleted_at
      where private.billing_customers.stripe_event_created_at is null
         or private.billing_customers.stripe_event_created_at <= excluded.stripe_event_created_at;
  end loop;

  for subscription in select value from jsonb_array_elements(coalesce(p_payload->'subscriptions', '[]'::jsonb)) loop
    billing_account := nullif(subscription->>'billing_account_id', '')::uuid;
    if billing_account is null then
      select billing_account_id into billing_account from private.billing_customers
      where livemode = p_livemode and stripe_customer_id = subscription->>'customer_id'
        and stripe_deleted_at is null;
    end if;
    if billing_account is null then continue; end if;
    select id into local_customer_id from private.billing_customers
    where billing_account_id = billing_account and livemode = p_livemode and stripe_deleted_at is null;
    if local_customer_id is null then raise exception 'missing projected customer for Stripe subscription'; end if;
    insert into private.billing_subscriptions (
      billing_account_id, customer_id, stripe_subscription_id, livemode, status, collection_method,
      cancel_at_period_end, cancel_at, canceled_at, ended_at, trial_start, trial_end,
      billing_cycle_anchor, latest_stripe_invoice_id, stripe_created_at, stripe_event_created_at
    ) values (
      billing_account, local_customer_id, subscription->>'id', p_livemode, subscription->>'status',
      subscription->>'collection_method', coalesce((subscription->>'cancel_at_period_end')::boolean, false),
      nullif(subscription->>'cancel_at', '')::timestamptz, nullif(subscription->>'canceled_at', '')::timestamptz,
      nullif(subscription->>'ended_at', '')::timestamptz, nullif(subscription->>'trial_start', '')::timestamptz,
      nullif(subscription->>'trial_end', '')::timestamptz, nullif(subscription->>'billing_cycle_anchor', '')::timestamptz,
      subscription->>'latest_invoice_id', nullif(subscription->>'created_at', '')::timestamptz, p_event_created_at
    ) on conflict (livemode, stripe_subscription_id) do update
      set status = excluded.status, collection_method = excluded.collection_method,
          cancel_at_period_end = excluded.cancel_at_period_end, cancel_at = excluded.cancel_at,
          canceled_at = excluded.canceled_at, ended_at = excluded.ended_at, trial_start = excluded.trial_start,
          trial_end = excluded.trial_end, billing_cycle_anchor = excluded.billing_cycle_anchor,
          latest_stripe_invoice_id = excluded.latest_stripe_invoice_id,
          stripe_event_created_at = excluded.stripe_event_created_at
      where private.billing_subscriptions.stripe_event_created_at is null
         or private.billing_subscriptions.stripe_event_created_at <= excluded.stripe_event_created_at
    returning id into local_subscription_id;
    affected_accounts := array_append(affected_accounts, billing_account);
  end loop;

  for item in select value from jsonb_array_elements(coalesce(p_payload->'subscription_items', '[]'::jsonb)) loop
    select id into local_subscription_id from private.billing_subscriptions
    where livemode = p_livemode and stripe_subscription_id = item->>'subscription_id';
    select id into local_price_id from private.billing_prices
    where livemode = p_livemode and stripe_price_id = item->>'price_id';
    if local_subscription_id is null or local_price_id is null then raise exception 'missing subscription or price for Stripe item'; end if;
    insert into private.billing_subscription_items (
      subscription_id, price_id, stripe_subscription_item_id, livemode, quantity,
      current_period_start, current_period_end, stripe_created_at, stripe_event_created_at
    ) values (
      local_subscription_id, local_price_id, item->>'id', p_livemode,
      coalesce(nullif(item->>'quantity', '')::integer, 1),
      nullif(item->>'period_start', '')::timestamptz, nullif(item->>'period_end', '')::timestamptz,
      nullif(item->>'created_at', '')::timestamptz, p_event_created_at
    ) on conflict (livemode, stripe_subscription_item_id) do update
      set price_id = excluded.price_id, quantity = excluded.quantity,
          current_period_start = excluded.current_period_start, current_period_end = excluded.current_period_end,
          stripe_event_created_at = excluded.stripe_event_created_at
      where private.billing_subscription_items.stripe_event_created_at is null
         or private.billing_subscription_items.stripe_event_created_at <= excluded.stripe_event_created_at;
  end loop;

  for invoice in select value from jsonb_array_elements(coalesce(p_payload->'invoices', '[]'::jsonb)) loop
    billing_account := nullif(invoice->>'billing_account_id', '')::uuid;
    if billing_account is null then
      select billing_account_id into billing_account from private.billing_customers
      where livemode = p_livemode and stripe_customer_id = invoice->>'customer_id';
    end if;
    if billing_account is null then continue; end if;
    select id into local_subscription_id from private.billing_subscriptions
    where livemode = p_livemode and stripe_subscription_id = nullif(invoice->>'subscription_id', '');
    insert into private.billing_invoices (
      billing_account_id, subscription_id, stripe_invoice_id, livemode, status, currency,
      amount_due, amount_paid, paid_at, next_payment_attempt, stripe_created_at, stripe_event_created_at
    ) values (
      billing_account, local_subscription_id, invoice->>'id', p_livemode, coalesce(invoice->>'status', 'unknown'),
      invoice->>'currency', coalesce(nullif(invoice->>'amount_due', '')::bigint, 0),
      coalesce(nullif(invoice->>'amount_paid', '')::bigint, 0), nullif(invoice->>'paid_at', '')::timestamptz,
      nullif(invoice->>'next_payment_attempt', '')::timestamptz, nullif(invoice->>'created_at', '')::timestamptz,
      p_event_created_at
    ) on conflict (livemode, stripe_invoice_id) do update
      set status = excluded.status, amount_paid = excluded.amount_paid, paid_at = excluded.paid_at,
          next_payment_attempt = excluded.next_payment_attempt, stripe_event_created_at = excluded.stripe_event_created_at
      where private.billing_invoices.stripe_event_created_at is null
         or private.billing_invoices.stripe_event_created_at <= excluded.stripe_event_created_at;
  end loop;

  foreach billing_account in array affected_accounts loop
    perform private.recompute_account_entitlement(billing_account);
  end loop;

  update private.billing_webhook_events
  set processing_state = 'processed', processed_at = now(), locked_at = null,
      locked_by = null, lease_expires_at = null, last_error = null, updated_at = now()
  where livemode = p_livemode and stripe_event_id = p_stripe_event_id
    and processing_state = 'processing' and locked_by = p_request_id;
  return found;
end;
$$;

revoke all on function private.claim_stripe_webhook_event(boolean, text, text, text, text, timestamptz, text, integer) from public, anon, authenticated;
revoke all on function private.fail_stripe_webhook_event(boolean, text, text, text) from public, anon, authenticated;
revoke all on function private.apply_stripe_webhook_projection(boolean, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function private.claim_stripe_webhook_event(boolean, text, text, text, text, timestamptz, text, integer) to service_role;
grant execute on function private.fail_stripe_webhook_event(boolean, text, text, text) to service_role;
grant execute on function private.apply_stripe_webhook_projection(boolean, text, text, timestamptz, jsonb) to service_role;

drop function private.claim_billing_webhook_events(text, integer, integer);
drop function private.complete_billing_webhook_event(boolean, text, text);
drop function private.fail_billing_webhook_event(boolean, text, text, integer, text);
