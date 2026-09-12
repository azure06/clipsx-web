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


-- Shared session invariant for privileged application transactions. A retained
-- session row alone is not authority after its deadline or account closure.
create function private.live_account_session(p_account_id uuid,p_session_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.sessions s join private.account_principals p on p.auth_user_id=s.user_id
    where s.id=p_session_id and s.user_id=p_account_id and p.closed_at is null
      and (s.not_after is null or s.not_after>now()));
$$;
revoke all on function private.live_account_session(uuid,uuid) from public,anon,authenticated;
grant execute on function private.live_account_session(uuid,uuid) to service_role;
