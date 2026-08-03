-- Trust history is append-only. The future command route verifies canonical
-- CBOR and Ed25519 before it calls its private transaction functions.
create table public.vault_device_authorizations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
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
  account_id uuid not null references auth.users(id) on delete cascade,
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
