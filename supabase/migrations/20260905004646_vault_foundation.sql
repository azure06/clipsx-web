-- Vault Foundation baseline. Append future changes as new migrations.

-- Vault v1 stores only public keys, signed protocol records, and ciphertext.
-- All state changes are intentionally reserved for the forthcoming command route.
create type public.vault_device_status as enum ('pending', 'active', 'revoked');
create type public.vault_member_role as enum ('owner', 'editor', 'viewer');
create type public.vault_member_status as enum ('invited', 'active', 'removed', 'expired');
create type public.vault_invitation_status as enum ('created', 'accepted', 'expired', 'cancelled');

create table public.vault_devices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references private.account_principals(id) on delete restrict,
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
  account_id uuid not null references private.account_principals(id) on delete restrict,
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

create table public.vault_collections (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null references private.account_principals(id) on delete restrict,
  encrypted_metadata bytea check (encrypted_metadata is null or octet_length(encrypted_metadata) >= 16),
  metadata_nonce bytea check (metadata_nonce is null or octet_length(metadata_nonce) = 12),
  metadata_algorithm text not null default 'aes-256-gcm',
  metadata_key_version integer not null default 1 check (metadata_key_version >= 1),
  associated_data_version integer not null default 1 check (associated_data_version >= 1),
  current_epoch_number integer not null default 1 check (current_epoch_number >= 1),
  current_epoch_transition_hash bytea check (current_epoch_transition_hash is null or octet_length(current_epoch_transition_hash) = 32),
  membership_log_head_hash bytea check (membership_log_head_hash is null or octet_length(membership_log_head_hash) = 32),
  crypto_format text not null default 'epoch-revision-key' check (crypto_format = 'epoch-revision-key'),
  migration_state text not null default 'complete' check (migration_state = 'complete'),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  requires_epoch_rotation boolean not null default false,
  check ((encrypted_metadata is null) = (metadata_nonce is null))
);

create table public.vault_collection_memberships (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.vault_collections(id) on delete cascade,
  account_id uuid not null references private.account_principals(id) on delete restrict,
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
  check ((status in ('active', 'removed')) = (joined_at is not null)),
  check ((status = 'removed') = (removed_at is not null and removed_epoch is not null)),
  check (removed_epoch is null or removed_epoch > joined_epoch)
);
create unique index vault_collection_memberships_one_live on public.vault_collection_memberships(collection_id, account_id) where status in ('invited', 'active');
create index vault_collection_memberships_account_active_idx on public.vault_collection_memberships(account_id, collection_id) where status = 'active';

create table public.vault_collection_invitations (
  id uuid primary key,
  collection_id uuid not null references public.vault_collections(id) on delete cascade,
  membership_id uuid not null unique references public.vault_collection_memberships(id) on delete restrict,
  inviter_device_id uuid not null references public.vault_devices(id) on delete restrict,
  recipient_account_id uuid not null references private.account_principals(id) on delete restrict,
  requested_role public.vault_member_role not null check (requested_role <> 'owner'),
  verification_mode text not null check (verification_mode = 'verified'),
  status public.vault_invitation_status not null default 'created',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by_device_id uuid references public.vault_devices(id) on delete restrict,
  invitation_key_commitment bytea not null unique check (octet_length(invitation_key_commitment) = 32),
  verification_commitment bytea not null unique check (octet_length(verification_commitment) = 32),
  invitation_payload bytea not null,
  invitation_operation_hash bytea not null unique check (octet_length(invitation_operation_hash) = 32),
  inviter_signature bytea not null check (octet_length(inviter_signature) = 64),
  acceptance_payload bytea,
  acceptance_payload_hash bytea unique,
  acceptance_transcript_hash bytea,
  acceptance_signature bytea,
  confirmation_payload bytea,
  confirmation_payload_hash bytea unique,
  confirmation_signature bytea,
  created_at timestamptz not null default now(),
  check ((acceptance_payload is null) = (acceptance_payload_hash is null)),
  check ((acceptance_payload is null) = (acceptance_signature is null)),
  check (acceptance_payload_hash is null or octet_length(acceptance_payload_hash) = 32),
  check ((acceptance_payload is null) = (acceptance_transcript_hash is null)),
  check (acceptance_transcript_hash is null or octet_length(acceptance_transcript_hash) = 32),
  check (acceptance_signature is null or octet_length(acceptance_signature) = 64),
  check ((confirmation_payload is null) = (confirmation_payload_hash is null)),
  check ((confirmation_payload is null) = (confirmation_signature is null)),
  check (confirmation_payload_hash is null or octet_length(confirmation_payload_hash) = 32),
  check (confirmation_signature is null or octet_length(confirmation_signature) = 64),
  check ((status = 'accepted') = (accepted_at is not null and accepted_by_device_id is not null))
);
create index vault_collection_invitations_recipient_pending_idx
  on public.vault_collection_invitations(recipient_account_id, expires_at)
  where status = 'created';

create table public.vault_collection_epochs (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.vault_collections(id) on delete cascade,
  epoch_number integer not null check (epoch_number >= 1),
  created_by_device_id uuid not null references public.vault_devices(id) on delete restrict,
  rotation_reason text not null,
  previous_epoch_hash bytea check (previous_epoch_hash is null or octet_length(previous_epoch_hash) = 32),
  membership_state_hash bytea not null check (octet_length(membership_state_hash) = 32),
  recipient_set_commitment bytea not null check (octet_length(recipient_set_commitment) = 32),
  transition_payload bytea not null,
  transition_signature bytea not null check (octet_length(transition_signature) = 64),
  transition_hash bytea not null unique check (octet_length(transition_hash) = 32),
  algorithm text not null default 'hpke-x25519-hkdf-sha256-aes-256-gcm',
  key_version integer not null default 1 check (key_version >= 1),
  protocol_version integer not null default 1 check (protocol_version = 1),
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
  sender_device_id uuid references public.vault_devices(id) on delete restrict,
  sender_recovery_key_id uuid references public.vault_recovery_keys(id) on delete restrict,
  encapsulation bytea not null check (octet_length(encapsulation) = 32),
  ciphertext bytea not null check (octet_length(ciphertext) >= 16),
  nonce bytea check (nonce is null or octet_length(nonce) = 12),
  algorithm text not null, key_version integer not null check (key_version >= 1), protocol_version integer not null check (protocol_version = 1),
  envelope_payload bytea not null,
  envelope_payload_hash bytea not null check (octet_length(envelope_payload_hash) = 32),
  signature bytea not null check (octet_length(signature) = 64),
  created_at timestamptz not null default now(),
  foreign key (collection_id, epoch_number) references public.vault_collection_epochs(collection_id, epoch_number) on delete cascade,
  unique (collection_id, epoch_number, recipient_device_id, key_version),
  check ((sender_device_id is null) <> (sender_recovery_key_id is null))
);

create table public.vault_collection_operations (
  operation_id uuid primary key,
  collection_id uuid not null references public.vault_collections(id) on delete cascade,
  sequence_number bigint not null check (sequence_number >= 1),
  operation_type text not null check (operation_type in (
    'collection-create', 'item-append', 'item-delete',
    'invitation-create', 'invitation-accept', 'invitation-confirm',
    'member-add', 'member-remove', 'epoch-rotate'
  )),
  canonical_payload bytea not null,
  previous_operation_hash bytea check (previous_operation_hash is null or octet_length(previous_operation_hash) = 32),
  operation_hash bytea not null unique check (octet_length(operation_hash) = 32),
  author_device_id uuid references public.vault_devices(id) on delete restrict,
  recovery_key_id uuid references public.vault_recovery_keys(id) on delete restrict,
  signature bytea not null check (octet_length(signature) = 64),
  protocol_version integer not null check (protocol_version = 1),
  created_at timestamptz not null default now(),
  unique (collection_id, sequence_number),
  check ((author_device_id is null) <> (recovery_key_id is null))
);

create table public.vault_notes (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.vault_collections(id) on delete cascade,
  created_by_device_id uuid not null references public.vault_devices(id) on delete restrict,
  current_revision integer not null default 0 check (current_revision >= 0),
  current_revision_hash bytea check (current_revision_hash is null or octet_length(current_revision_hash) = 32),
  created_at timestamptz not null default now(), deleted_at timestamptz,
  check ((current_revision = 0) = (current_revision_hash is null))
);

create table public.vault_note_revisions (
  id uuid primary key default gen_random_uuid(), note_id uuid not null references public.vault_notes(id) on delete cascade,
  collection_id uuid not null references public.vault_collections(id) on delete cascade,
  revision_number integer not null check (revision_number >= 1), collection_epoch integer not null check (collection_epoch >= 1),
  encrypted_content bytea not null check (octet_length(encrypted_content) between 16 and 1048576), content_nonce bytea not null check (octet_length(content_nonce) = 12),
  wrapped_revision_key bytea not null check (octet_length(wrapped_revision_key) >= 16), key_wrap_nonce bytea not null check (octet_length(key_wrap_nonce) = 12),
  encryption_algorithm text not null default 'aes-256-gcm', key_wrap_algorithm text not null default 'aes-256-gcm',
  key_version integer not null check (key_version >= 1), protocol_version integer not null check (protocol_version = 1), associated_data_version integer not null check (associated_data_version >= 1),
  previous_revision_hash bytea check (previous_revision_hash is null or octet_length(previous_revision_hash) = 32),
  ciphertext_hash bytea not null check (octet_length(ciphertext_hash) = 32),
  wrapped_revision_key_hash bytea not null check (octet_length(wrapped_revision_key_hash) = 32),
  revision_hash bytea not null unique check (octet_length(revision_hash) = 32),
  author_device_id uuid not null references public.vault_devices(id) on delete restrict, author_signature bytea not null check (octet_length(author_signature) = 64),
  operation_id uuid not null unique, operation_type text not null check (operation_type in ('create', 'update', 'merge', 'delete')),
  created_at timestamptz not null default now(), logical_clock bigint not null check (logical_clock >= 0),
  unique (note_id, revision_number), foreign key (collection_id, collection_epoch) references public.vault_collection_epochs(collection_id, epoch_number) on delete restrict
);
create index vault_note_revisions_collection_sync_idx on public.vault_note_revisions(collection_id, revision_number, created_at);

create table public.vault_tombstones (
  note_id uuid primary key references public.vault_notes(id) on delete restrict,
  collection_id uuid not null references public.vault_collections(id) on delete cascade,
  deleted_by_device_id uuid not null references public.vault_devices(id) on delete restrict,
  delete_operation_id uuid not null unique references public.vault_collection_operations(operation_id) on delete restrict,
  last_revision_hash bytea not null check (octet_length(last_revision_hash) = 32),
  deleted_at timestamptz not null default now()
);
create index vault_tombstones_collection_sync_idx on public.vault_tombstones(collection_id, deleted_at);

-- Read-only RLS. The command route will use a private transaction to mutate.
create or replace function private.can_read_vault_collection(p_collection_id uuid, p_account_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vault_collection_memberships m where m.collection_id = p_collection_id and m.account_id = p_account_id and m.status = 'active')
$$;
revoke all on function private.can_read_vault_collection(uuid, uuid) from public, anon, authenticated;
grant execute on function private.can_read_vault_collection(uuid, uuid) to authenticated;

alter table public.vault_devices enable row level security;
alter table public.vault_recovery_keys enable row level security;
alter table public.vault_collections enable row level security;
alter table public.vault_collection_memberships enable row level security;
alter table public.vault_collection_invitations enable row level security;
alter table public.vault_collection_epochs enable row level security;
alter table public.vault_device_epoch_envelopes enable row level security;
alter table public.vault_collection_operations enable row level security;
alter table public.vault_notes enable row level security;
alter table public.vault_note_revisions enable row level security;
alter table public.vault_tombstones enable row level security;

create policy vault_devices_read_own on public.vault_devices for select to authenticated using ((select auth.uid()) = account_id);
create policy vault_recovery_keys_read_own on public.vault_recovery_keys for select to authenticated using ((select auth.uid()) = account_id);
create policy vault_collections_read_member on public.vault_collections for select to authenticated using (
  private.can_read_vault_collection(id, (select auth.uid()))
);
create policy vault_memberships_read_member on public.vault_collection_memberships for select to authenticated using (
  private.can_read_vault_collection(collection_id, (select auth.uid()))
);
create policy vault_invitations_read_party on public.vault_collection_invitations for select to authenticated using (
  (
    recipient_account_id = (select auth.uid())
    or private.can_read_vault_collection(collection_id, (select auth.uid()))
  )
);
create policy vault_epochs_read_member on public.vault_collection_epochs for select to authenticated using (
  private.can_read_vault_collection(collection_id, (select auth.uid()))
);
create policy vault_device_envelopes_read_recipient on public.vault_device_epoch_envelopes for select to authenticated using (
  recipient_device_id in (
    select d.id from public.vault_devices d
    where d.account_id = (select auth.uid()) and d.status = 'active'
  )
);
create policy vault_collection_operations_read_member on public.vault_collection_operations for select to authenticated using (
  private.can_read_vault_collection(collection_id, (select auth.uid()))
);
create policy vault_notes_read_member on public.vault_notes for select to authenticated using (
  private.can_read_vault_collection(collection_id, (select auth.uid()))
);
create policy vault_note_revisions_read_member on public.vault_note_revisions for select to authenticated using (
  private.can_read_vault_collection(collection_id, (select auth.uid()))
);
create policy vault_tombstones_read_member on public.vault_tombstones for select to authenticated using (
  private.can_read_vault_collection(collection_id, (select auth.uid()))
);

revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate on public.vault_devices, public.vault_recovery_keys, public.vault_collections, public.vault_collection_memberships, public.vault_collection_invitations, public.vault_collection_epochs, public.vault_device_epoch_envelopes, public.vault_collection_operations, public.vault_notes, public.vault_note_revisions, public.vault_tombstones from authenticated;
grant select on public.vault_devices, public.vault_recovery_keys, public.vault_collections, public.vault_collection_memberships, public.vault_collection_invitations, public.vault_collection_epochs, public.vault_device_epoch_envelopes, public.vault_collection_operations, public.vault_notes, public.vault_note_revisions, public.vault_tombstones to authenticated;

-- Trust history is append-only. The future command route verifies canonical
-- CBOR and Ed25519 before it calls its private transaction functions.
create table public.vault_device_authorizations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references private.account_principals(id) on delete restrict,
  device_id uuid not null unique references public.vault_devices(id) on delete restrict,
  authorized_by_device_id uuid references public.vault_devices(id) on delete restrict,
  recovery_key_id uuid references public.vault_recovery_keys(id) on delete restrict,
  authorization_method text not null check (authorization_method in ('qr', 'short-auth-string', 'out-of-band', 'recovery')),
  authorization_payload bytea not null,
  authorization_payload_hash bytea not null unique check (octet_length(authorization_payload_hash) = 32),
  proof_of_possession_payload bytea not null,
  proof_of_possession_signature bytea not null check (octet_length(proof_of_possession_signature) = 64),
  signature bytea not null check (octet_length(signature) = 64),
  created_at timestamptz not null default now(),
  check ((authorized_by_device_id is null) <> (recovery_key_id is null))
);
create index vault_device_authorizations_account_idx on public.vault_device_authorizations(account_id, created_at);

create table public.vault_account_operations (
  operation_id uuid primary key,
  account_id uuid not null references private.account_principals(id) on delete restrict,
  sequence_number bigint not null check (sequence_number >= 1),
  operation_type text not null check (operation_type in (
    'device-register', 'device-authorize', 'device-revoke',
    'recovery-rotate',
    'collection-create', 'item-append', 'item-delete', 'invitation-create',
    'invitation-accept', 'invitation-confirm', 'member-add', 'member-remove',
    'epoch-rotate', 'epoch-envelope-grant'
  )),
  canonical_payload bytea not null,
  previous_operation_hash bytea check (previous_operation_hash is null or octet_length(previous_operation_hash) = 32),
  operation_hash bytea not null unique check (octet_length(operation_hash) = 32),
  author_device_id uuid references public.vault_devices(id) on delete restrict,
  recovery_key_id uuid references public.vault_recovery_keys(id) on delete restrict,
  signature bytea not null check (octet_length(signature) = 64),
  protocol_version integer not null check (protocol_version = 1),
  created_at timestamptz not null default now(),
  unique (account_id, sequence_number),
  check ((author_device_id is null) <> (recovery_key_id is null))
);

create table public.vault_recovery_epoch_envelopes (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null,
  epoch_number integer not null,
  recovery_key_id uuid not null references public.vault_recovery_keys(id) on delete restrict,
  sender_device_id uuid references public.vault_devices(id) on delete restrict,
  sender_recovery_key_id uuid references public.vault_recovery_keys(id) on delete restrict,
  encapsulation bytea not null check (octet_length(encapsulation) = 32),
  ciphertext bytea not null check (octet_length(ciphertext) >= 16),
  nonce bytea check (nonce is null or octet_length(nonce) = 12),
  algorithm text not null,
  key_version integer not null check (key_version >= 1),
  protocol_version integer not null check (protocol_version = 1),
  envelope_payload bytea not null,
  envelope_payload_hash bytea not null check (octet_length(envelope_payload_hash) = 32),
  signature bytea not null check (octet_length(signature) = 64),
  created_at timestamptz not null default now(),
  foreign key (collection_id, epoch_number) references public.vault_collection_epochs(collection_id, epoch_number) on delete cascade,
  unique (collection_id, epoch_number, recovery_key_id, key_version),
  check ((sender_device_id is null) <> (sender_recovery_key_id is null))
);

alter table public.vault_device_authorizations enable row level security;
alter table public.vault_account_operations enable row level security;
alter table public.vault_recovery_epoch_envelopes enable row level security;

create policy vault_device_authorizations_read_own on public.vault_device_authorizations for select to authenticated using ((select auth.uid()) = account_id);
create policy vault_account_operations_read_own on public.vault_account_operations for select to authenticated using ((select auth.uid()) = account_id);
create policy vault_recovery_epoch_envelopes_read_recipient on public.vault_recovery_epoch_envelopes for select to authenticated using (
  recovery_key_id in (select k.id from public.vault_recovery_keys k where k.account_id = (select auth.uid()) and k.status = 'active')
);

revoke all on public.vault_device_authorizations, public.vault_account_operations, public.vault_recovery_epoch_envelopes from anon, authenticated;
grant select on public.vault_device_authorizations, public.vault_account_operations, public.vault_recovery_epoch_envelopes to authenticated;
