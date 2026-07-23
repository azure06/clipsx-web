create type private.account_entitlement_status as enum ('active', 'grace', 'read_only');
create type private.ai_usage_event_kind as enum ('reserve', 'settle', 'refund', 'adjustment');

alter table private.billing_subscriptions
  add column billing_cycle_anchor timestamptz,
  add column pause_collection_behavior text,
  add column pause_collection_resumes_at timestamptz;

alter table private.billing_webhook_events
  add column available_at timestamptz not null default now(),
  add column locked_at timestamptz,
  add column locked_by text,
  add column lease_expires_at timestamptz,
  add column last_attempt_at timestamptz;

alter table private.billing_webhook_events
  add constraint billing_webhook_events_processing_lease_check check (
    (processing_state = 'processing'
      and locked_at is not null
      and locked_by is not null
      and lease_expires_at is not null)
    or
    (processing_state <> 'processing'
      and locked_at is null
      and locked_by is null
      and lease_expires_at is null)
  );

drop index private.billing_webhook_events_pending_idx;
create index billing_webhook_events_available_idx
  on private.billing_webhook_events (available_at, received_at)
  where processing_state in ('pending', 'failed');

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

alter table private.billing_products
  add constraint billing_products_id_livemode_key unique (id, livemode);

alter table private.billing_prices
  add constraint billing_prices_id_livemode_key unique (id, livemode);

alter table private.billing_prices
  add constraint billing_prices_product_livemode_fkey
    foreign key (product_id, livemode)
    references private.billing_products (id, livemode)
    on delete restrict;

alter table private.billing_customers
  add constraint billing_customers_id_account_livemode_key
    unique (id, billing_account_id, livemode);

alter table private.billing_subscriptions
  add constraint billing_subscriptions_id_livemode_key unique (id, livemode),
  add constraint billing_subscriptions_id_account_livemode_key
    unique (id, billing_account_id, livemode),
  add constraint billing_subscriptions_customer_account_livemode_fkey
    foreign key (customer_id, billing_account_id, livemode)
    references private.billing_customers (id, billing_account_id, livemode)
    on delete restrict;

alter table private.billing_subscription_items
  add constraint billing_subscription_items_subscription_livemode_fkey
    foreign key (subscription_id, livemode)
    references private.billing_subscriptions (id, livemode)
    on delete restrict,
  add constraint billing_subscription_items_price_livemode_fkey
    foreign key (price_id, livemode)
    references private.billing_prices (id, livemode)
    on delete restrict;

alter table private.billing_invoices
  add constraint billing_invoices_subscription_account_livemode_fkey
    foreign key (subscription_id, billing_account_id, livemode)
    references private.billing_subscriptions (id, billing_account_id, livemode)
    on delete restrict;

alter table private.account_entitlements enable row level security;
alter table private.ai_allowance_periods enable row level security;
alter table private.ai_usage_events enable row level security;

create trigger set_account_entitlements_updated_at
before update on private.account_entitlements
for each row execute function private.set_updated_at();

create trigger set_ai_allowance_periods_updated_at
before update on private.ai_allowance_periods
for each row execute function private.set_updated_at();

create trigger set_ai_usage_events_updated_at
before update on private.ai_usage_events
for each row execute function private.set_updated_at();

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
