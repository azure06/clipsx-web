create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create type private.billing_account_kind as enum ('personal', 'organization');
create type private.billing_account_status as enum ('active', 'closed');

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

alter table private.billing_accounts enable row level security;

create trigger set_billing_account_updated_at
before update on private.billing_accounts
for each row
execute function private.set_updated_at();

create or replace function private.create_personal_billing_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.billing_accounts (owner_user_id)
  values (new.id)
  on conflict do nothing;

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
