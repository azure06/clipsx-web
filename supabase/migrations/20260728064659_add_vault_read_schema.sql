-- Vault v1 stores only public keys, signed protocol records, and ciphertext.
-- All state changes are intentionally reserved for the forthcoming command route.
create type public.vault_device_status as enum ('pending', 'active', 'revoked');
create type public.vault_member_role as enum ('owner', 'editor', 'viewer');
create type public.vault_member_status as enum ('invited', 'active', 'removed');

create table public.vault_devices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 128),
  client_type text not null check (client_type = 'browser'),
  platform text not null check (length(platform) between 1 and 128),
  enrollment_origin text not null,
  key_protection_profile text not null check (key_protection_profile in ('webauthn-prf-wrapped', 'vault-passphrase-wrapped')),
  client_crypto_capabilities jsonb not null,
  encryption_public_key bytea not null check (octet_length(encryption_public_key) = 32),
  signing_public_key bytea not null check (octet_length(signing_public_key) = 32),
  encryption_algorithm text not null check (encryption_algorithm = 'hpke-x25519-hkdf-sha256-aes-256-gcm'),
  signing_algorithm text not null check (signing_algorithm = 'ed25519'),
  key_version integer not null check (key_version >= 1),
  status public.vault_device_status not null default 'pending',
  auth_session_id uuid,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  unique (account_id, id),
  check (encryption_public_key <> signing_public_key),
  check ((status = 'revoked') = (revoked_at is not null))
);

create table public.vault_recovery_keys (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  encryption_public_key bytea not null check (octet_length(encryption_public_key) = 32),
  signing_public_key bytea not null check (octet_length(signing_public_key) = 32),
  key_version integer not null check (key_version >= 1),
  status text not null check (status in ('active', 'revoked')),
  authorization_payload bytea not null,
  authorization_signature bytea not null check (octet_length(authorization_signature) = 64),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (account_id, key_version),
  check (encryption_public_key <> signing_public_key),
  check ((status = 'revoked') = (revoked_at is not null))
);

create unique index vault_recovery_keys_one_active_per_account on public.vault_recovery_keys(account_id) where status = 'active';
create index vault_devices_active_account_idx on public.vault_devices(account_id) where status = 'active';
create unique index vault_devices_one_active_session_idx
  on public.vault_devices(auth_session_id)
  where auth_session_id is not null and status = 'active';

create table public.vault_collections (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null references auth.users(id) on delete restrict,
  encrypted_metadata bytea,
  metadata_nonce bytea check (metadata_nonce is null or octet_length(metadata_nonce) = 12),
  metadata_algorithm text not null default 'aes-256-gcm',
  metadata_key_version integer not null default 1 check (metadata_key_version >= 1),
  associated_data_version integer not null default 1 check (associated_data_version >= 1),
  current_epoch_number integer not null default 1 check (current_epoch_number >= 1),
  current_epoch_transition_hash bytea,
  membership_log_head_hash bytea,
  crypto_format text not null default 'epoch-revision-key' check (crypto_format = 'epoch-revision-key'),
  migration_state text not null default 'complete' check (migration_state = 'complete'),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((encrypted_metadata is null) = (metadata_nonce is null))
);

create table public.vault_collection_memberships (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.vault_collections(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  role public.vault_member_role not null,
  status public.vault_member_status not null,
  joined_at timestamptz,
  removed_at timestamptz,
  joined_epoch integer not null check (joined_epoch >= 1),
  removed_epoch integer,
  history_access_from_epoch integer not null check (history_access_from_epoch >= 1),
  invited_by_device_id uuid references public.vault_devices(id) on delete restrict,
  membership_operation_id uuid not null,
  check (history_access_from_epoch <= joined_epoch),
  check ((status = 'active') = (joined_at is not null)),
  check ((status = 'removed') = (removed_at is not null and removed_epoch is not null)),
  check (removed_epoch is null or removed_epoch > joined_epoch)
);
create unique index vault_collection_memberships_one_live on public.vault_collection_memberships(collection_id, account_id) where status in ('invited', 'active');
create index vault_collection_memberships_account_active_idx on public.vault_collection_memberships(account_id, collection_id) where status = 'active';

create table public.vault_collection_epochs (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.vault_collections(id) on delete cascade,
  epoch_number integer not null check (epoch_number >= 1),
  created_by_device_id uuid not null references public.vault_devices(id) on delete restrict,
  rotation_reason text not null,
  previous_epoch_hash bytea,
  membership_state_hash bytea not null,
  recipient_set_commitment bytea not null,
  transition_payload bytea not null,
  transition_signature bytea not null check (octet_length(transition_signature) = 64),
  transition_hash bytea not null unique,
  algorithm text not null default 'hpke-x25519-hkdf-sha256-aes-256-gcm',
  key_version integer not null check (key_version >= 1),
  protocol_version integer not null check (protocol_version = 1),
  state text not null check (state in ('created', 'current', 'superseded')),
  created_at timestamptz not null default now(),
  unique (collection_id, epoch_number)
);
create unique index vault_collection_epochs_one_current on public.vault_collection_epochs(collection_id) where state = 'current';

create table public.vault_device_epoch_envelopes (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.vault_collections(id) on delete cascade,
  epoch_number integer not null,
  recipient_device_id uuid not null references public.vault_devices(id) on delete restrict,
  sender_device_id uuid not null references public.vault_devices(id) on delete restrict,
  encapsulation bytea not null, ciphertext bytea not null, nonce bytea,
  algorithm text not null, key_version integer not null check (key_version >= 1), protocol_version integer not null check (protocol_version = 1),
  envelope_payload_hash bytea not null, signature bytea not null check (octet_length(signature) = 64),
  created_at timestamptz not null default now(),
  foreign key (collection_id, epoch_number) references public.vault_collection_epochs(collection_id, epoch_number) on delete cascade,
  unique (collection_id, epoch_number, recipient_device_id, key_version)
);

create table public.vault_notes (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.vault_collections(id) on delete cascade,
  created_by_device_id uuid not null references public.vault_devices(id) on delete restrict,
  current_revision integer not null default 0 check (current_revision >= 0),
  current_revision_hash bytea,
  created_at timestamptz not null default now(), deleted_at timestamptz,
  check ((current_revision = 0) = (current_revision_hash is null))
);

create table public.vault_note_revisions (
  id uuid primary key default gen_random_uuid(), note_id uuid not null references public.vault_notes(id) on delete cascade,
  collection_id uuid not null references public.vault_collections(id) on delete cascade,
  revision_number integer not null check (revision_number >= 1), collection_epoch integer not null check (collection_epoch >= 1),
  encrypted_content bytea not null check (octet_length(encrypted_content) <= 1048576), content_nonce bytea not null check (octet_length(content_nonce) = 12),
  wrapped_revision_key bytea not null, key_wrap_nonce bytea not null check (octet_length(key_wrap_nonce) = 12),
  encryption_algorithm text not null default 'aes-256-gcm', key_wrap_algorithm text not null default 'aes-256-gcm',
  key_version integer not null check (key_version >= 1), protocol_version integer not null check (protocol_version = 1), associated_data_version integer not null check (associated_data_version >= 1),
  previous_revision_hash bytea, ciphertext_hash bytea not null, wrapped_revision_key_hash bytea not null, revision_hash bytea not null unique,
  author_device_id uuid not null references public.vault_devices(id) on delete restrict, author_signature bytea not null check (octet_length(author_signature) = 64),
  operation_id uuid not null unique, operation_type text not null check (operation_type in ('create', 'update', 'merge', 'delete')),
  created_at timestamptz not null default now(), logical_clock bigint not null check (logical_clock >= 0),
  unique (note_id, revision_number), foreign key (collection_id, collection_epoch) references public.vault_collection_epochs(collection_id, epoch_number) on delete restrict
);
create index vault_note_revisions_collection_sync_idx on public.vault_note_revisions(collection_id, revision_number, created_at);

-- Read-only RLS. The command route will use a private transaction to mutate.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create or replace function private.can_read_vault_collection(p_collection_id uuid, p_account_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vault_collection_memberships m where m.collection_id = p_collection_id and m.account_id = p_account_id and m.status = 'active')
$$;
revoke all on function private.can_read_vault_collection(uuid, uuid) from public, anon, authenticated;

create or replace function private.has_active_bound_vault_device(
  p_account_id uuid,
  p_session_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vault_devices d
    join auth.sessions s on s.id = d.auth_session_id and s.user_id = d.account_id
    where d.account_id = p_account_id
      and d.status = 'active'
      and d.auth_session_id::text = p_session_id
  )
$$;

revoke all on function private.has_active_bound_vault_device(uuid, text)
  from public, anon, authenticated;

alter table public.vault_devices enable row level security;
alter table public.vault_recovery_keys enable row level security;
alter table public.vault_collections enable row level security;
alter table public.vault_collection_memberships enable row level security;
alter table public.vault_collection_epochs enable row level security;
alter table public.vault_device_epoch_envelopes enable row level security;
alter table public.vault_notes enable row level security;
alter table public.vault_note_revisions enable row level security;

create policy vault_devices_read_own on public.vault_devices for select to authenticated using ((select auth.uid()) = account_id);
create policy vault_recovery_keys_read_own on public.vault_recovery_keys for select to authenticated using ((select auth.uid()) = account_id);
create policy vault_collections_read_member on public.vault_collections for select to authenticated using (
  private.has_active_bound_vault_device((select auth.uid()), auth.jwt() ->> 'session_id')
  and private.can_read_vault_collection(id, (select auth.uid()))
);
create policy vault_memberships_read_member on public.vault_collection_memberships for select to authenticated using (
  private.has_active_bound_vault_device((select auth.uid()), auth.jwt() ->> 'session_id')
  and private.can_read_vault_collection(collection_id, (select auth.uid()))
);
create policy vault_epochs_read_member on public.vault_collection_epochs for select to authenticated using (
  private.has_active_bound_vault_device((select auth.uid()), auth.jwt() ->> 'session_id')
  and private.can_read_vault_collection(collection_id, (select auth.uid()))
);
create policy vault_device_envelopes_read_recipient on public.vault_device_epoch_envelopes for select to authenticated using (
  private.has_active_bound_vault_device((select auth.uid()), auth.jwt() ->> 'session_id')
  and recipient_device_id in (
    select d.id from public.vault_devices d
    where d.account_id = (select auth.uid()) and d.status = 'active'
  )
);
create policy vault_notes_read_member on public.vault_notes for select to authenticated using (
  private.has_active_bound_vault_device((select auth.uid()), auth.jwt() ->> 'session_id')
  and private.can_read_vault_collection(collection_id, (select auth.uid()))
);
create policy vault_note_revisions_read_member on public.vault_note_revisions for select to authenticated using (
  private.has_active_bound_vault_device((select auth.uid()), auth.jwt() ->> 'session_id')
  and private.can_read_vault_collection(collection_id, (select auth.uid()))
);

revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate on public.vault_devices, public.vault_recovery_keys, public.vault_collections, public.vault_collection_memberships, public.vault_collection_epochs, public.vault_device_epoch_envelopes, public.vault_notes, public.vault_note_revisions from authenticated;
grant select on public.vault_devices, public.vault_recovery_keys, public.vault_collections, public.vault_collection_memberships, public.vault_collection_epochs, public.vault_device_epoch_envelopes, public.vault_notes, public.vault_note_revisions to authenticated;
