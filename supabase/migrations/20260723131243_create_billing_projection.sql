create type private.billing_webhook_processing_state as enum (
  'pending',
  'processing',
  'processed',
  'failed'
);

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
  unique (livemode, stripe_product_id)
);

comment on table private.billing_products is
  'Selective local projection of Stripe Products. plan_id is null for non-ClipsX products.';

create table private.billing_prices (
  id uuid primary key default gen_random_uuid(),
  stripe_price_id text not null,
  livemode boolean not null,
  product_id uuid not null references private.billing_products (id) on delete restrict,
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
  check (
    (recurring_interval is null and recurring_interval_count is null)
    or (recurring_interval is not null and recurring_interval_count >= 1)
  )
);

create unique index billing_prices_unique_lookup_key_per_mode
  on private.billing_prices (livemode, lookup_key)
  where lookup_key is not null;

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
  unique (livemode, stripe_customer_id)
);

create table private.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid not null references private.billing_accounts (id) on delete restrict,
  customer_id uuid not null references private.billing_customers (id) on delete restrict,
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
  latest_stripe_invoice_id text,
  stripe_created_at timestamptz,
  stripe_event_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (livemode, stripe_subscription_id)
);

create index billing_subscriptions_account_status_idx
  on private.billing_subscriptions (billing_account_id, status);

create table private.billing_subscription_items (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references private.billing_subscriptions (id) on delete restrict,
  price_id uuid not null references private.billing_prices (id) on delete restrict,
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
  check (
    (current_period_start is null and current_period_end is null)
    or (current_period_start is not null and current_period_end > current_period_start)
  )
);

create table private.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid not null references private.billing_accounts (id) on delete restrict,
  subscription_id uuid references private.billing_subscriptions (id) on delete restrict,
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
  unique (livemode, stripe_invoice_id)
);

create index billing_invoices_account_status_idx
  on private.billing_invoices (billing_account_id, status);

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
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (livemode, stripe_event_id)
);

create index billing_webhook_events_pending_idx
  on private.billing_webhook_events (received_at)
  where processing_state in ('pending', 'failed');

comment on table private.billing_webhook_events is
  'Durable Stripe webhook inbox. It stores routing and processing metadata, not raw event payloads.';

alter table private.plans enable row level security;
alter table private.plan_features enable row level security;
alter table private.billing_products enable row level security;
alter table private.billing_prices enable row level security;
alter table private.billing_customers enable row level security;
alter table private.billing_subscriptions enable row level security;
alter table private.billing_subscription_items enable row level security;
alter table private.billing_invoices enable row level security;
alter table private.billing_webhook_events enable row level security;

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

insert into private.plans (code, display_name)
values
  ('free', 'Free'),
  ('pro', 'Pro')
on conflict (code) do update
set display_name = excluded.display_name,
    updated_at = now();
