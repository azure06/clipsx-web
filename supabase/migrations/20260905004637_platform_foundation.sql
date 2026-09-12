-- Platform Foundation baseline. Append future changes as new migrations.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

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

-- Stable public-key/billing attribution survives removal of the Auth identity.
-- This contains no contact information; it is pseudonymous, not anonymous.
create table private.account_principals (
  id uuid primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table private.account_principals enable row level security;
revoke all on private.account_principals from public,anon,authenticated;
grant select on private.account_principals to service_role;
create function private.create_account_principal() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into private.account_principals(id,auth_user_id) values(new.id,new.id);
  return new;
end; $$;
revoke all on function private.create_account_principal() from public,anon,authenticated;
create trigger a_create_account_principal after insert on auth.users for each row execute function private.create_account_principal();
insert into private.account_principals(id,auth_user_id) select id,id from auth.users on conflict do nothing;
