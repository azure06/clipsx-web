create type private.organization_membership_role as enum ('owner', 'admin', 'member');
create type private.organization_membership_status as enum ('active', 'removed');

create table private.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_by_user_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.organization_memberships (
  organization_id uuid not null references private.organizations (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  role private.organization_membership_role not null default 'member',
  status private.organization_membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table private.billing_accounts
  add column organization_id uuid references private.organizations (id) on delete restrict;

create unique index billing_accounts_one_account_per_organization
  on private.billing_accounts (organization_id)
  where organization_id is not null;

alter table private.billing_accounts
  add constraint billing_accounts_kind_matches_organization
  check (
    (kind = 'personal' and organization_id is null)
    or (kind = 'organization' and organization_id is not null)
  );

create index organization_memberships_active_user_idx
  on private.organization_memberships (user_id, organization_id)
  where status = 'active';

create trigger set_organizations_updated_at
before update on private.organizations
for each row execute function private.set_updated_at();

create trigger set_organization_memberships_updated_at
before update on private.organization_memberships
for each row execute function private.set_updated_at();

alter table private.organizations enable row level security;
alter table private.organization_memberships enable row level security;

revoke all on private.organizations, private.organization_memberships from anon, authenticated;
grant select, insert, update, delete on private.organizations, private.organization_memberships to service_role;

comment on table private.organizations is
  'Future Team workspaces. A Team subscription belongs to the organization billing account, never directly to a member.';
comment on table private.organization_memberships is
  'Application membership and billing authority. Only active owners/admins may start Checkout or open the Billing Portal.';

create or replace function private.recompute_account_entitlement(p_billing_account_id uuid)
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
    and products.plan_id is not null
  group by subscriptions.id, subscriptions.status, products.plan_id, subscriptions.stripe_event_created_at
  order by subscriptions.stripe_event_created_at desc nulls last, subscriptions.created_at desc
  limit 1;

  if selected_subscription.subscription_id is null then
    insert into private.account_entitlements (billing_account_id, plan_id, status, effective_from, paid_through, grace_until)
    values (p_billing_account_id, free_plan_id, 'read_only', now(), null, null)
    on conflict (billing_account_id) do update
      set plan_id = excluded.plan_id,
          source_subscription_id = null,
          status = excluded.status,
          effective_from = excluded.effective_from,
          paid_through = null,
          grace_until = null;
    return;
  end if;

  entitlement_status := case
    when selected_subscription.subscription_status in ('active', 'trialing') then 'active'::private.account_entitlement_status
    else 'read_only'::private.account_entitlement_status
  end;

  insert into private.account_entitlements (
    billing_account_id, plan_id, source_subscription_id, status, effective_from, paid_through, grace_until
  ) values (
    p_billing_account_id,
    selected_subscription.plan_id,
    selected_subscription.subscription_id,
    entitlement_status,
    now(),
    selected_subscription.paid_through,
    null
  ) on conflict (billing_account_id) do update
    set plan_id = excluded.plan_id,
        source_subscription_id = excluded.source_subscription_id,
        status = excluded.status,
        effective_from = excluded.effective_from,
        paid_through = excluded.paid_through,
        grace_until = null;
end;
$$;

revoke all on function private.recompute_account_entitlement(uuid) from public, anon, authenticated;
grant execute on function private.recompute_account_entitlement(uuid) to service_role;
