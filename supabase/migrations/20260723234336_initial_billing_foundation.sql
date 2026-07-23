create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

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

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

create table private.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  kind private.billing_account_kind not null default 'personal',
  owner_user_id uuid not null references auth.users (id) on delete restrict,
  status private.billing_account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  billing_account_id uuid primary key references private.billing_accounts (id) on delete restrict,
  plan_id uuid not null references private.plans (id) on delete restrict,
  source_subscription_id uuid references private.billing_subscriptions (id) on delete restrict,
  status private.account_entitlement_status not null default 'active',
  effective_from timestamptz not null default now(),
  paid_through timestamptz,
  grace_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (paid_through is null or paid_through >= effective_from),
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
  actor_user_id uuid not null references auth.users (id) on delete restrict,
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
      plan_id,
      status,
      effective_from
    )
    select new_billing_account_id, plans.id, 'active', now()
    from private.plans
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
  plan_id,
  status,
  effective_from
)
select billing_accounts.id, plans.id, 'active', billing_accounts.created_at
from private.billing_accounts
join private.plans on plans.code = 'free'
on conflict (billing_account_id) do nothing;

revoke all on schema private from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;

grant usage on schema private to service_role;
grant select, insert, update, delete on all tables in schema private to service_role;

alter default privileges for role postgres in schema private
  grant select, insert, update, delete on tables to service_role;
