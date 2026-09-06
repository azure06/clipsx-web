-- Workspaces baseline. Append future changes as new migrations.

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
