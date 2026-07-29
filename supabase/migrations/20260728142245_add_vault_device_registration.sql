create table private.vault_device_registration_challenges (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  device_encryption_public_key bytea not null check (octet_length(device_encryption_public_key) = 32),
  challenge_hash bytea not null check (octet_length(challenge_hash) = 32),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index vault_device_registration_challenges_account_expiry_idx
  on private.vault_device_registration_challenges(account_id, expires_at)
  where consumed_at is null;

create trigger set_vault_device_registration_challenge_updated_at
before update on private.vault_device_registration_challenges
for each row execute function private.set_updated_at();

alter table private.vault_device_registration_challenges enable row level security;
revoke all on private.vault_device_registration_challenges from public, anon, authenticated;

-- Pending registrations retain only public material and the two possession
-- proofs. They cannot be used for reads, writes, bootstrap, or session binding.
create table private.vault_pending_device_registrations (
  device_id uuid primary key,
  account_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 128),
  platform text not null check (length(platform) between 1 and 128),
  enrollment_origin text not null,
  protection_profile text not null check (protection_profile in ('webauthn-prf-wrapped', 'vault-passphrase-wrapped')),
  capabilities jsonb not null,
  encryption_public_key bytea not null check (octet_length(encryption_public_key) = 32),
  signing_public_key bytea not null check (octet_length(signing_public_key) = 32),
  proof_payload bytea not null,
  proof_signature bytea not null check (octet_length(proof_signature) = 64),
  proof_hash bytea not null unique check (octet_length(proof_hash) = 32),
  sas_commitment bytea not null check (octet_length(sas_commitment) = 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  check (encryption_public_key <> signing_public_key), check (expires_at > created_at)
);
create trigger set_vault_pending_device_registration_updated_at
before update on private.vault_pending_device_registrations
for each row execute function private.set_updated_at();
alter table private.vault_pending_device_registrations enable row level security;
revoke all on private.vault_pending_device_registrations from public, anon, authenticated;
