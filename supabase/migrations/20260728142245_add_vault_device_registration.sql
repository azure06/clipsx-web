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
