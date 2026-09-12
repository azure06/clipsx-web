-- Billing baseline. Append future changes as new migrations.

create type private.billing_account_kind as enum ('personal', 'organization');
create type private.billing_account_status as enum ('active', 'closed');
create type private.billing_webhook_processing_state as enum (
  'pending',
  'processing',
  'processed',
  'failed'
);
create type private.account_entitlement_status as enum ('active', 'grace', 'read_only');
create type private.ai_usage_event_kind as enum ('reserve', 'settle', 'refund', 'adjustment');

create table private.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  constraint billing_accounts_kind_matches_organization check ((kind = 'personal' and organization_id is null) or (kind = 'organization' and organization_id is not null)),
  kind private.billing_account_kind not null default 'personal',
  owner_user_id uuid not null references private.account_principals (id) on delete restrict,
  status private.billing_account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid references private.organizations (id) on delete restrict
);

comment on table private.billing_accounts is
  'Billing owner. Every current user has one personal account; organizations are reserved for future Team plans.';
comment on column private.billing_accounts.kind is
  'personal is implemented now. organization is reserved for a future Team billing owner.';
comment on column private.billing_accounts.owner_user_id is
  'The user that owns a personal account or administers a future organization account.';

create unique index billing_accounts_one_personal_account_per_user
  on private.billing_accounts (owner_user_id)
  where kind = 'personal';

create index billing_accounts_owner_user_id_idx
  on private.billing_accounts (owner_user_id);

create table private.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table private.plans is
  'Stable ClipsX plan identities. Stripe Products map to these plans; Prices do not define application access.';

create table private.plan_features (
  plan_id uuid not null references private.plans (id) on delete restrict,
  feature_key text not null check (feature_key ~ '^[a-z][a-z0-9_]*$'),
  value_jsonb jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan_id, feature_key)
);

comment on table private.plan_features is
  'Typed application configuration for a plan, such as a limit or enabled capability.';

create table private.billing_products (
  id uuid primary key default gen_random_uuid(),
  stripe_product_id text not null,
  livemode boolean not null,
  plan_id uuid references private.plans (id) on delete restrict,
  name text not null,
  description text,
  active boolean not null,
  stripe_created_at timestamptz,
  stripe_event_created_at timestamptz,
  stripe_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (livemode, stripe_product_id),
  unique (id, livemode)
);

comment on table private.billing_products is
  'Selective local projection of Stripe Products. plan_id is null for non-ClipsX products.';

create index billing_products_plan_id_idx
  on private.billing_products (plan_id);

create table private.billing_prices (
  id uuid primary key default gen_random_uuid(),
  stripe_price_id text not null,
  livemode boolean not null,
  product_id uuid not null,
  lookup_key text,
  active boolean not null,
  currency text not null check (currency ~ '^[a-z]{3}$'),
  unit_amount bigint check (unit_amount is null or unit_amount >= 0),
  billing_scheme text not null,
  recurring_interval text,
  recurring_interval_count integer,
  usage_type text,
  tax_behavior text,
  stripe_created_at timestamptz,
  stripe_event_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (livemode, stripe_price_id),
  unique (id, livemode),
  foreign key (product_id, livemode)
    references private.billing_products (id, livemode)
    on delete restrict,
  check (
    (recurring_interval is null and recurring_interval_count is null)
    or (recurring_interval is not null and recurring_interval_count >= 1)
  )
);

create unique index billing_prices_unique_lookup_key_per_mode
  on private.billing_prices (livemode, lookup_key)
  where lookup_key is not null;

create index billing_prices_product_livemode_idx
  on private.billing_prices (product_id, livemode);

comment on table private.billing_prices is
  'Selective local projection of Stripe Prices. Price amount and interval are commercial details, not access identity.';

create table private.billing_customers (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid not null references private.billing_accounts (id) on delete restrict,
  stripe_customer_id text not null,
  livemode boolean not null,
  stripe_created_at timestamptz,
  stripe_event_created_at timestamptz,
  stripe_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (billing_account_id, livemode),
  unique (livemode, stripe_customer_id),
  unique (id, billing_account_id, livemode)
);

create table private.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid not null references private.billing_accounts (id) on delete restrict,
  customer_id uuid not null,
  stripe_subscription_id text not null,
  livemode boolean not null,
  status text not null,
  collection_method text,
  cancel_at_period_end boolean not null default false,
  cancel_at timestamptz,
  canceled_at timestamptz,
  ended_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  billing_cycle_anchor timestamptz,
  pause_collection_behavior text,
  pause_collection_resumes_at timestamptz,
  latest_stripe_invoice_id text,
  stripe_created_at timestamptz,
  stripe_event_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (livemode, stripe_subscription_id),
  unique (id, livemode),
  unique (id, billing_account_id, livemode),
  foreign key (customer_id, billing_account_id, livemode)
    references private.billing_customers (id, billing_account_id, livemode)
    on delete restrict
);

create index billing_subscriptions_account_status_idx
  on private.billing_subscriptions (billing_account_id, status);

create index billing_subscriptions_customer_account_livemode_idx
  on private.billing_subscriptions (customer_id, billing_account_id, livemode);

create table private.billing_subscription_items (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null,
  price_id uuid not null,
  stripe_subscription_item_id text not null,
  livemode boolean not null,
  quantity integer not null default 1 check (quantity >= 0),
  active boolean not null default true,
  current_period_start timestamptz,
  current_period_end timestamptz,
  stripe_created_at timestamptz,
  stripe_event_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (livemode, stripe_subscription_item_id),
  foreign key (subscription_id, livemode)
    references private.billing_subscriptions (id, livemode)
    on delete restrict,
  foreign key (price_id, livemode)
    references private.billing_prices (id, livemode)
    on delete restrict,
  check (
    (current_period_start is null and current_period_end is null)
    or (current_period_start is not null and current_period_end > current_period_start)
  )
);

create index billing_subscription_items_subscription_livemode_idx
  on private.billing_subscription_items (subscription_id, livemode);

create index billing_subscription_items_price_livemode_idx
  on private.billing_subscription_items (price_id, livemode);

create table private.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid not null references private.billing_accounts (id) on delete restrict,
  subscription_id uuid,
  stripe_invoice_id text not null,
  livemode boolean not null,
  status text not null,
  currency text not null check (currency ~ '^[a-z]{3}$'),
  amount_due bigint not null check (amount_due >= 0),
  amount_paid bigint not null check (amount_paid >= 0),
  paid_at timestamptz,
  next_payment_attempt timestamptz,
  stripe_created_at timestamptz,
  stripe_event_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (livemode, stripe_invoice_id),
  foreign key (subscription_id, billing_account_id, livemode)
    references private.billing_subscriptions (id, billing_account_id, livemode)
    on delete restrict
);

create index billing_invoices_account_status_idx
  on private.billing_invoices (billing_account_id, status);

create index billing_invoices_subscription_account_livemode_idx
  on private.billing_invoices (subscription_id, billing_account_id, livemode)
  where subscription_id is not null;

create table private.billing_webhook_events (
  livemode boolean not null,
  stripe_event_id text not null,
  event_type text not null,
  object_type text not null,
  object_id text not null,
  stripe_event_created_at timestamptz not null,
  processing_state private.billing_webhook_processing_state not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  lease_expires_at timestamptz,
  last_attempt_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (livemode, stripe_event_id),
  check (
    (processing_state = 'processing'
      and locked_at is not null
      and locked_by is not null
      and lease_expires_at is not null)
    or
    (processing_state <> 'processing'
      and locked_at is null
      and locked_by is null
      and lease_expires_at is null)
  )
);

create index billing_webhook_events_available_idx
  on private.billing_webhook_events (available_at, received_at)
  where processing_state in ('pending', 'failed');

comment on table private.billing_webhook_events is
  'Durable Stripe webhook inbox. It stores routing and processing metadata, not raw event payloads.';

create table private.account_entitlements (
  billing_account_id uuid not null references private.billing_accounts (id) on delete restrict,
  livemode boolean not null,
  plan_id uuid not null references private.plans (id) on delete restrict,
  source_subscription_id uuid,
  status private.account_entitlement_status not null default 'active',
  effective_from timestamptz not null default now(),
  paid_through timestamptz,
  grace_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (billing_account_id, livemode),
  foreign key (source_subscription_id, billing_account_id, livemode)
    references private.billing_subscriptions(id, billing_account_id, livemode) on delete restrict,
  -- effective_from is the decision time; paid_through may be in the past.
  check (
    grace_until is null
    or (paid_through is not null and grace_until >= paid_through)
  )
);

comment on table private.account_entitlements is
  'The current ClipsX access decision derived from Stripe billing state. It is not a second billing source of truth.';

create index account_entitlements_plan_id_idx
  on private.account_entitlements (plan_id);

create index account_entitlements_source_subscription_id_idx
  on private.account_entitlements (source_subscription_id)
  where source_subscription_id is not null;

create table private.ai_allowance_periods (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid not null references private.billing_accounts (id) on delete restrict,
  plan_id uuid not null references private.plans (id) on delete restrict,
  source_subscription_item_id uuid references private.billing_subscription_items (id) on delete restrict,
  period_start timestamptz not null,
  period_end timestamptz not null,
  granted_units bigint not null check (granted_units >= 0),
  consumed_units bigint not null default 0 check (consumed_units between 0 and granted_units),
  grant_reason text not null,
  grant_idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (billing_account_id, grant_idempotency_key),
  unique (id, billing_account_id),
  check (period_end > period_start)
);

comment on table private.ai_allowance_periods is
  'Plan-included AI capacity for one account and time window. The idempotency key prevents duplicate monthly grants.';

create index ai_allowance_periods_plan_id_idx
  on private.ai_allowance_periods (plan_id);

create index ai_allowance_periods_source_subscription_item_id_idx
  on private.ai_allowance_periods (source_subscription_item_id)
  where source_subscription_item_id is not null;

create table private.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  allowance_period_id uuid not null,
  billing_account_id uuid not null,
  actor_user_id uuid not null references private.account_principals (id) on delete restrict,
  idempotency_key text not null,
  kind private.ai_usage_event_kind not null,
  delta_units bigint not null check (delta_units <> 0),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (billing_account_id, idempotency_key, kind),
  foreign key (allowance_period_id, billing_account_id)
    references private.ai_allowance_periods (id, billing_account_id)
    on delete restrict
);

comment on table private.ai_usage_events is
  'Append-only AI allowance ledger. It stores unit accounting only, never prompts or model output.';

create index ai_usage_events_allowance_account_idx
  on private.ai_usage_events (allowance_period_id, billing_account_id);

create index ai_usage_events_actor_user_id_idx
  on private.ai_usage_events (actor_user_id);

alter table private.billing_accounts enable row level security;
alter table private.plans enable row level security;
alter table private.plan_features enable row level security;
alter table private.billing_products enable row level security;
alter table private.billing_prices enable row level security;
alter table private.billing_customers enable row level security;
alter table private.billing_subscriptions enable row level security;
alter table private.billing_subscription_items enable row level security;
alter table private.billing_invoices enable row level security;
alter table private.billing_webhook_events enable row level security;
alter table private.account_entitlements enable row level security;
alter table private.ai_allowance_periods enable row level security;
alter table private.ai_usage_events enable row level security;

create trigger set_billing_account_updated_at
before update on private.billing_accounts
for each row execute function private.set_updated_at();

create trigger set_plans_updated_at
before update on private.plans
for each row execute function private.set_updated_at();

create trigger set_plan_features_updated_at
before update on private.plan_features
for each row execute function private.set_updated_at();

create trigger set_billing_products_updated_at
before update on private.billing_products
for each row execute function private.set_updated_at();

create trigger set_billing_prices_updated_at
before update on private.billing_prices
for each row execute function private.set_updated_at();

create trigger set_billing_customers_updated_at
before update on private.billing_customers
for each row execute function private.set_updated_at();

create trigger set_billing_subscriptions_updated_at
before update on private.billing_subscriptions
for each row execute function private.set_updated_at();

create trigger set_billing_subscription_items_updated_at
before update on private.billing_subscription_items
for each row execute function private.set_updated_at();

create trigger set_billing_invoices_updated_at
before update on private.billing_invoices
for each row execute function private.set_updated_at();

create trigger set_billing_webhook_events_updated_at
before update on private.billing_webhook_events
for each row execute function private.set_updated_at();

create trigger set_account_entitlements_updated_at
before update on private.account_entitlements
for each row execute function private.set_updated_at();

create trigger set_ai_allowance_periods_updated_at
before update on private.ai_allowance_periods
for each row execute function private.set_updated_at();

create trigger set_ai_usage_events_updated_at
before update on private.ai_usage_events
for each row execute function private.set_updated_at();

insert into private.plans (code, display_name)
values
  ('free', 'Free'),
  ('pro', 'Pro')
on conflict (code) do update
set display_name = excluded.display_name,
    updated_at = now();

create or replace function private.create_personal_billing_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_billing_account_id uuid;
begin
  insert into private.billing_accounts (owner_user_id)
  values (new.id)
  on conflict do nothing
  returning id into new_billing_account_id;

  if new_billing_account_id is not null then
    insert into private.account_entitlements (
      billing_account_id,
      livemode,
      plan_id,
      status,
      effective_from
    )
    select new_billing_account_id, modes.livemode, plans.id, 'active', now()
    from private.plans cross join (values (false), (true)) modes(livemode)
    where plans.code = 'free';
  end if;

  return new;
end;
$$;

revoke all on function private.create_personal_billing_account() from public;

create trigger create_personal_billing_account_after_auth_user_insert
after insert on auth.users
for each row
execute function private.create_personal_billing_account();

insert into private.billing_accounts (owner_user_id)
select id
from auth.users
on conflict do nothing;

insert into private.account_entitlements (
  billing_account_id,
  livemode,
  plan_id,
  status,
  effective_from
)
select billing_accounts.id, modes.livemode, plans.id, 'active', billing_accounts.created_at
from private.billing_accounts
join private.plans on plans.code = 'free'
cross join (values (false), (true)) modes(livemode)
on conflict (billing_account_id, livemode) do nothing;

revoke all on schema private from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;

grant usage on schema private to service_role;
grant select, insert, update, delete on all tables in schema private to service_role;

alter default privileges for role postgres in schema private
  grant select, insert, update, delete on tables to service_role;

create unique index billing_accounts_one_account_per_organization on private.billing_accounts (organization_id) where organization_id is not null;
create or replace function private.recompute_account_entitlement(p_billing_account_id uuid, p_livemode boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_subscription record;
  free_plan_id uuid;
  entitlement_status private.account_entitlement_status;
begin
  perform 1 from private.billing_accounts where id = p_billing_account_id for update;
  if not found or p_livemode is null then raise exception 'invalid_billing_account'; end if;
  if exists(select 1 from private.billing_accounts where id=p_billing_account_id and status='closed') then
    update private.account_entitlements set status='read_only' where billing_account_id=p_billing_account_id and livemode=p_livemode;
    return;
  end if;
  select id into free_plan_id from private.plans where code = 'free';

  select
    subscriptions.id as subscription_id,
    subscriptions.status as subscription_status,
    products.plan_id,
    max(items.current_period_end) as paid_through
  into selected_subscription
  from private.billing_subscriptions subscriptions
  join private.billing_subscription_items items
    on items.subscription_id = subscriptions.id and items.livemode = subscriptions.livemode
  join private.billing_prices prices
    on prices.id = items.price_id and prices.livemode = items.livemode
  join private.billing_products products
    on products.id = prices.product_id and products.livemode = prices.livemode
  where subscriptions.billing_account_id = p_billing_account_id
    and subscriptions.livemode = p_livemode
    and items.active and items.quantity > 0
    and products.plan_id is not null
  group by subscriptions.id, subscriptions.status, products.plan_id, subscriptions.stripe_event_created_at
  order by (subscriptions.status in ('active', 'trialing') and max(items.current_period_end) > now()) desc nulls last,
    subscriptions.stripe_created_at desc nulls last, subscriptions.created_at desc, subscriptions.id, products.plan_id
  limit 1;

  if selected_subscription.subscription_id is null then
    insert into private.account_entitlements (billing_account_id, livemode, plan_id, status, effective_from, paid_through, grace_until)
    values (p_billing_account_id, p_livemode, free_plan_id, 'active', now(), null, null)
    on conflict (billing_account_id, livemode) do update
      set plan_id = excluded.plan_id,
          source_subscription_id = null,
          status = excluded.status,
          effective_from = excluded.effective_from,
          paid_through = null,
          grace_until = null;
    return;
  end if;

  entitlement_status := case
    when selected_subscription.subscription_status in ('active', 'trialing') and selected_subscription.paid_through > now() then 'active'::private.account_entitlement_status
    else 'read_only'::private.account_entitlement_status
  end;

  insert into private.account_entitlements (
    billing_account_id, livemode, plan_id, source_subscription_id, status, effective_from, paid_through, grace_until
  ) values (
    p_billing_account_id,
    p_livemode,
    selected_subscription.plan_id,
    selected_subscription.subscription_id,
    entitlement_status,
    now(),
    selected_subscription.paid_through,
    null
  ) on conflict (billing_account_id, livemode) do update
    set plan_id = excluded.plan_id,
        source_subscription_id = excluded.source_subscription_id,
        status = excluded.status,
        effective_from = excluded.effective_from,
        paid_through = excluded.paid_through,
        grace_until = null;
end;
$$;

revoke all on function private.recompute_account_entitlement(uuid, boolean) from public, anon, authenticated;
grant execute on function private.recompute_account_entitlement(uuid, boolean) to service_role;
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
  if p_lease_seconds is null or p_lease_seconds not between 5 and 60 or nullif(p_request_id, '') is null then
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
  accepted_subscription_ids uuid[] := array[]::uuid[];
begin
  perform 1 from private.billing_webhook_events
    where livemode = p_livemode and stripe_event_id = p_stripe_event_id
      and processing_state = 'processing' and locked_by = p_request_id
      and lease_expires_at > clock_timestamp()
    for update;
  if not found then
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
    if local_subscription_id is not null then
      accepted_subscription_ids := array_append(accepted_subscription_ids, local_subscription_id);
      -- Retain removed item identities for history, exclude them from current access.
      update private.billing_subscription_items set active = false, stripe_event_created_at = p_event_created_at
      where subscription_id = local_subscription_id;
    end if;
    affected_accounts := array_append(affected_accounts, billing_account);
  end loop;

  for item in select value from jsonb_array_elements(coalesce(p_payload->'subscription_items', '[]'::jsonb)) loop
    select id into local_subscription_id from private.billing_subscriptions
    where livemode = p_livemode and stripe_subscription_id = item->>'subscription_id';
    if not (local_subscription_id = any(accepted_subscription_ids)) then continue; end if;
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
      set active = true, price_id = excluded.price_id, quantity = excluded.quantity,
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
    perform private.recompute_account_entitlement(billing_account, p_livemode);
  end loop;

  update private.billing_webhook_events
  set processing_state = 'processed', processed_at = now(), locked_at = null,
      locked_by = null, lease_expires_at = null, last_error = null, updated_at = now()
  where livemode = p_livemode and stripe_event_id = p_stripe_event_id
    and processing_state = 'processing' and locked_by = p_request_id;
  if not found then raise exception 'stripe_projection_lease_lost'; end if;
  return true;
end;
$$;

revoke all on function private.claim_stripe_webhook_event(boolean, text, text, text, text, timestamptz, text, integer) from public, anon, authenticated;
revoke all on function private.fail_stripe_webhook_event(boolean, text, text, text) from public, anon, authenticated;
revoke all on function private.apply_stripe_webhook_projection(boolean, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function private.claim_stripe_webhook_event(boolean, text, text, text, text, timestamptz, text, integer) to service_role;
grant execute on function private.fail_stripe_webhook_event(boolean, text, text, text) to service_role;
grant execute on function private.apply_stripe_webhook_projection(boolean, text, text, timestamptz, jsonb) to service_role;
