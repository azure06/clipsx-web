-- Vault Devices baseline. Append future changes as new migrations.

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
-- proofs. They cannot be used for reads, writes, bootstrap, or envelopes.
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

create or replace function private.consume_vault_device_registration_challenge(
  p_account_id uuid,
  p_challenge_id uuid,
  p_device_encryption_public_key bytea,
  p_challenge_response_hash bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  challenge private.vault_device_registration_challenges%rowtype;
begin
  select * into challenge
  from private.vault_device_registration_challenges
  where id = p_challenge_id and account_id = p_account_id
  for update;

  if not found or challenge.consumed_at is not null or challenge.expires_at <= now()
     or challenge.device_encryption_public_key <> p_device_encryption_public_key
     or challenge.challenge_hash <> p_challenge_response_hash then
    return false;
  end if;

  update private.vault_device_registration_challenges
  set consumed_at = now()
  where id = challenge.id;
  return true;
end;
$$;

revoke all on function private.consume_vault_device_registration_challenge(uuid, uuid, bytea, bytea) from public, anon, authenticated;

create function private.register_pending_vault_device(
  p_account_id uuid, p_session_id uuid, p_challenge_id uuid, p_challenge_response_hash bytea,
  p_device_id uuid, p_display_name text, p_platform text, p_enrollment_origin text, p_protection_profile text,
  p_capabilities jsonb, p_device_encryption_public_key bytea, p_device_signing_public_key bytea,
  p_proof_payload bytea, p_proof_signature bytea, p_proof_hash bytea, p_sas_commitment bytea
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 1));
  if not exists (select 1 from auth.sessions where id = p_session_id and user_id = p_account_id)
    or not exists (select 1 from public.vault_devices where account_id = p_account_id and status = 'active')
    or exists (select 1 from public.vault_devices where id = p_device_id)
    or exists (select 1 from private.vault_pending_device_registrations where device_id = p_device_id) then return false; end if;
  if not private.consume_vault_device_registration_challenge(p_account_id, p_challenge_id, p_device_encryption_public_key, p_challenge_response_hash) then return false; end if;
  insert into private.vault_pending_device_registrations (
    device_id, account_id, display_name, platform, enrollment_origin, protection_profile, capabilities,
    encryption_public_key, signing_public_key, proof_payload, proof_signature, proof_hash, sas_commitment
  ) values (p_device_id, p_account_id, p_display_name, p_platform, p_enrollment_origin, p_protection_profile,
    p_capabilities, p_device_encryption_public_key, p_device_signing_public_key, p_proof_payload, p_proof_signature, p_proof_hash, p_sas_commitment);
  return true;
end; $$;
revoke all on function private.register_pending_vault_device(uuid, uuid, uuid, bytea, uuid, text, text, text, text, jsonb, bytea, bytea, bytea, bytea, bytea, bytea) from public, anon, authenticated;

create or replace function private.register_initial_vault_device(
  p_account_id uuid,
  p_session_id uuid,
  p_challenge_id uuid,
  p_challenge_response_hash bytea,
  p_device_id uuid,
  p_display_name text,
  p_platform text,
  p_enrollment_origin text,
  p_protection_profile text,
  p_capabilities jsonb,
  p_device_encryption_public_key bytea,
  p_device_signing_public_key bytea,
  p_recovery_key_id uuid,
  p_recovery_encryption_public_key bytea,
  p_recovery_signing_public_key bytea,
  p_authorization_payload bytea,
  p_authorization_payload_hash bytea,
  p_device_proof_payload bytea,
  p_device_proof_signature bytea,
  p_operation_id uuid,
  p_command_payload bytea,
  p_command_hash bytea,
  p_recovery_command_signature bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 1));

  if exists (select 1 from public.vault_recovery_keys where account_id = p_account_id)
     or exists (select 1 from public.vault_devices where account_id = p_account_id and status = 'active')
     or not exists (select 1 from auth.sessions where id = p_session_id and user_id = p_account_id) then
    return false;
  end if;

  if not private.consume_vault_device_registration_challenge(
    p_account_id, p_challenge_id, p_device_encryption_public_key, p_challenge_response_hash
  ) then
    return false;
  end if;

  insert into public.vault_recovery_keys (
    id, account_id, encryption_public_key, signing_public_key, key_version, status,
    authorization_payload, authorization_signature
  ) values (
    p_recovery_key_id, p_account_id, p_recovery_encryption_public_key, p_recovery_signing_public_key,
    1, 'active', p_command_payload, p_recovery_command_signature
  );

  insert into public.vault_devices (
    id, account_id, display_name, client_type, platform, enrollment_origin,
    key_protection_profile, client_crypto_capabilities, encryption_public_key,
    signing_public_key, encryption_algorithm, signing_algorithm, key_version, status
  ) values (
    p_device_id, p_account_id, p_display_name, 'browser', p_platform, p_enrollment_origin,
    p_protection_profile, p_capabilities, p_device_encryption_public_key,
    p_device_signing_public_key, 'hpke-x25519-hkdf-sha256-aes-256-gcm', 'ed25519', 1, 'active'
  );

  insert into public.vault_device_authorizations (
    account_id, device_id, recovery_key_id, authorization_method, authorization_payload,
    authorization_payload_hash, proof_of_possession_payload,
    proof_of_possession_signature, signature
  ) values (
    p_account_id, p_device_id, p_recovery_key_id, 'recovery', p_authorization_payload,
    p_authorization_payload_hash, p_device_proof_payload,
    p_device_proof_signature, p_recovery_command_signature
  );

  insert into public.vault_account_operations (
    operation_id, account_id, sequence_number, operation_type, canonical_payload,
    operation_hash, recovery_key_id, signature, protocol_version
  ) values (
    p_operation_id, p_account_id, 1, 'device-register', p_command_payload,
    p_command_hash, p_recovery_key_id, p_recovery_command_signature, 1
  );

  return true;
end;
$$;

revoke all on function private.register_initial_vault_device(uuid, uuid, uuid, bytea, uuid, text, text, text, text, jsonb, bytea, bytea, uuid, bytea, bytea, bytea, bytea, bytea, bytea, uuid, bytea, bytea, bytea) from public, anon, authenticated;

grant execute on function private.consume_vault_device_registration_challenge(uuid, uuid, bytea, bytea) to service_role;
grant execute on function private.register_pending_vault_device(uuid, uuid, uuid, bytea, uuid, text, text, text, text, jsonb, bytea, bytea, bytea, bytea, bytea, bytea) to service_role;
grant execute on function private.register_initial_vault_device(uuid, uuid, uuid, bytea, uuid, text, text, text, text, jsonb, bytea, bytea, uuid, bytea, bytea, bytea, bytea, bytea, bytea, uuid, bytea, bytea, bytea) to service_role;

-- Complete retained key set, bounded by the member's authorized history.
create function private.vault_required_epochs(p_account_id uuid)
returns table(collection_id uuid, epoch_number integer)
language sql stable security definer set search_path = '' as $$
  select ce.collection_id, ce.epoch_number
  from public.vault_collection_epochs ce
  join public.vault_collections c on c.id = ce.collection_id
  join public.vault_collection_memberships m on m.collection_id = c.id
  where m.account_id = p_account_id and m.status = 'active' and c.deleted_at is null
    and ce.epoch_number between m.history_access_from_epoch and c.current_epoch_number;
$$;
revoke all on function private.vault_required_epochs(uuid) from public, anon, authenticated;

create function private.authorize_pending_vault_device(
  p_account_id uuid, p_session_id uuid, p_authorizer_device_id uuid, p_device_id uuid,
  p_expected_previous_operation_hash bytea, p_authorization_payload bytea, p_authorization_payload_hash bytea,
  p_pending_command_hash bytea, p_sas_hash bytea, p_envelopes jsonb, p_operation_id uuid,
  p_command_hash bytea, p_signature bytea
) returns boolean language plpgsql security definer set search_path = '' as $$
declare pending private.vault_pending_device_registrations%rowtype; current_operation public.vault_account_operations%rowtype; envelope jsonb; affected_collection_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 1));
  for affected_collection_id in
    select c.id from public.vault_collections c
    join public.vault_collection_memberships m on m.collection_id = c.id
    where m.account_id = p_account_id and m.status = 'active' and c.deleted_at is null
    order by c.id
  loop
    perform pg_advisory_xact_lock(hashtextextended(affected_collection_id::text, 2));
  end loop;
  select * into pending from private.vault_pending_device_registrations where device_id = p_device_id and account_id = p_account_id and expires_at > now() for update;
  select * into current_operation from public.vault_account_operations where account_id = p_account_id order by sequence_number desc limit 1 for update;
  if not found or pending.device_id is null or current_operation.operation_hash <> p_expected_previous_operation_hash or pending.proof_hash <> p_pending_command_hash
    or pending.sas_commitment <> p_sas_hash or octet_length(p_sas_hash) <> 32 or octet_length(p_authorization_payload_hash) <> 32 or octet_length(p_command_hash) <> 32 or octet_length(p_signature) <> 64
    or not exists (select 1 from auth.sessions where id = p_session_id and user_id = p_account_id)
    or not exists (select 1 from public.vault_devices where id = p_authorizer_device_id and account_id = p_account_id and status = 'active')
    or exists (select 1 from public.vault_account_operations where operation_id = p_operation_id) then return false; end if;
  -- Every retained authorized epoch receives exactly one signed envelope.
  if coalesce(jsonb_typeof(p_envelopes), '') <> 'array'
    or jsonb_array_length(p_envelopes) <> (
      select count(*) from private.vault_required_epochs(p_account_id)
    )
    or (select count(distinct (e->>'collection_id', e->>'epoch_number')) from jsonb_array_elements(p_envelopes) e) <> jsonb_array_length(p_envelopes)
    or exists (select 1 from jsonb_array_elements(p_envelopes) e where not exists (
      select 1 from private.vault_required_epochs(p_account_id) ce
      where ce.collection_id::text = e->>'collection_id' and ce.epoch_number = (e->>'epoch_number')::integer
    )) then return false; end if;
  insert into public.vault_devices (id, account_id, display_name, client_type, platform, enrollment_origin, key_protection_profile, client_crypto_capabilities, encryption_public_key, signing_public_key, encryption_algorithm, signing_algorithm, key_version, status)
  values (pending.device_id, pending.account_id, pending.display_name, 'browser', pending.platform, pending.enrollment_origin, pending.protection_profile, pending.capabilities, pending.encryption_public_key, pending.signing_public_key, 'hpke-x25519-hkdf-sha256-aes-256-gcm', 'ed25519', 1, 'active');
  insert into public.vault_device_authorizations (account_id, device_id, authorized_by_device_id, authorization_method, authorization_payload, authorization_payload_hash, proof_of_possession_payload, proof_of_possession_signature, signature)
  values (p_account_id, p_device_id, p_authorizer_device_id, 'qr', p_authorization_payload, p_authorization_payload_hash, pending.proof_payload, pending.proof_signature, p_signature);
  for envelope in select * from jsonb_array_elements(p_envelopes) loop
    insert into public.vault_device_epoch_envelopes (collection_id, epoch_number, recipient_device_id, sender_device_id, encapsulation, ciphertext, algorithm, key_version, protocol_version, envelope_payload, envelope_payload_hash, signature)
    values ((envelope->>'collection_id')::uuid, (envelope->>'epoch_number')::integer, p_device_id, p_authorizer_device_id, decode(envelope->>'encapsulation','base64'), decode(envelope->>'ciphertext','base64'), 'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1, decode(envelope->>'payload','base64'), extensions.digest(decode(envelope->>'payload','base64'),'sha256'), decode(envelope->>'signature','base64'));
  end loop;
  insert into public.vault_account_operations (operation_id, account_id, sequence_number, operation_type, canonical_payload, previous_operation_hash, operation_hash, author_device_id, signature, protocol_version)
  values (p_operation_id, p_account_id, current_operation.sequence_number + 1, 'device-authorize', p_authorization_payload, current_operation.operation_hash, p_command_hash, p_authorizer_device_id, p_signature, 1);
  delete from private.vault_pending_device_registrations where device_id = p_device_id;
  return true;
end; $$;
revoke all on function private.authorize_pending_vault_device(uuid, uuid, uuid, uuid, bytea, bytea, bytea, bytea, bytea, jsonb, uuid, bytea, bytea) from public, anon, authenticated;

create function private.authorize_pending_vault_device_with_recovery(
  p_account_id uuid, p_session_id uuid, p_recovery_key_id uuid, p_device_id uuid,
  p_expected_previous_operation_hash bytea, p_authorization_payload bytea, p_authorization_payload_hash bytea,
  p_pending_command_hash bytea, p_envelopes jsonb, p_operation_id uuid, p_command_hash bytea, p_signature bytea
) returns boolean language plpgsql security definer set search_path = '' as $$
declare pending private.vault_pending_device_registrations%rowtype; current_operation public.vault_account_operations%rowtype; envelope jsonb; affected_collection_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 1));
  for affected_collection_id in
    select c.id from public.vault_collections c
    join public.vault_collection_memberships m on m.collection_id = c.id
    where m.account_id = p_account_id and m.status = 'active' and c.deleted_at is null
    order by c.id
  loop
    perform pg_advisory_xact_lock(hashtextextended(affected_collection_id::text, 2));
  end loop;
  select * into pending from private.vault_pending_device_registrations where device_id = p_device_id and account_id = p_account_id and expires_at > now() for update;
  select * into current_operation from public.vault_account_operations where account_id = p_account_id order by sequence_number desc limit 1 for update;
  if not found or pending.device_id is null or current_operation.operation_hash <> p_expected_previous_operation_hash
    or pending.proof_hash <> p_pending_command_hash or octet_length(p_authorization_payload_hash) <> 32
    or octet_length(p_command_hash) <> 32 or octet_length(p_signature) <> 64
    or not exists (select 1 from auth.sessions where id = p_session_id and user_id = p_account_id)
    or not exists (select 1 from public.vault_recovery_keys where id = p_recovery_key_id and account_id = p_account_id and status = 'active')
    or exists (select 1 from public.vault_account_operations where operation_id = p_operation_id) then return false; end if;
  if coalesce(jsonb_typeof(p_envelopes), '') <> 'array'
    or jsonb_array_length(p_envelopes) <> (
      select count(*) from private.vault_required_epochs(p_account_id)
    )
    or (select count(distinct (e->>'collection_id', e->>'epoch_number')) from jsonb_array_elements(p_envelopes) e) <> jsonb_array_length(p_envelopes)
    or exists (select 1 from jsonb_array_elements(p_envelopes) e where not exists (
      select 1 from private.vault_required_epochs(p_account_id) ce
      where ce.collection_id::text = e->>'collection_id' and ce.epoch_number = (e->>'epoch_number')::integer
    )) then return false; end if;
  insert into public.vault_devices (id, account_id, display_name, client_type, platform, enrollment_origin, key_protection_profile, client_crypto_capabilities, encryption_public_key, signing_public_key, encryption_algorithm, signing_algorithm, key_version, status)
  values (pending.device_id, pending.account_id, pending.display_name, 'browser', pending.platform, pending.enrollment_origin, pending.protection_profile, pending.capabilities, pending.encryption_public_key, pending.signing_public_key, 'hpke-x25519-hkdf-sha256-aes-256-gcm', 'ed25519', 1, 'active');
  insert into public.vault_device_authorizations (account_id, device_id, recovery_key_id, authorization_method, authorization_payload, authorization_payload_hash, proof_of_possession_payload, proof_of_possession_signature, signature)
  values (p_account_id, p_device_id, p_recovery_key_id, 'recovery', p_authorization_payload, p_authorization_payload_hash, pending.proof_payload, pending.proof_signature, p_signature);
  for envelope in select * from jsonb_array_elements(p_envelopes) loop
    insert into public.vault_device_epoch_envelopes (collection_id, epoch_number, recipient_device_id, sender_recovery_key_id, encapsulation, ciphertext, algorithm, key_version, protocol_version, envelope_payload, envelope_payload_hash, signature)
    values ((envelope->>'collection_id')::uuid, (envelope->>'epoch_number')::integer, p_device_id, p_recovery_key_id, decode(envelope->>'encapsulation','base64'), decode(envelope->>'ciphertext','base64'), 'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1, decode(envelope->>'payload','base64'), extensions.digest(decode(envelope->>'payload','base64'),'sha256'), decode(envelope->>'signature','base64'));
  end loop;
  insert into public.vault_account_operations (operation_id, account_id, sequence_number, operation_type, canonical_payload, previous_operation_hash, operation_hash, recovery_key_id, signature, protocol_version)
  values (p_operation_id, p_account_id, current_operation.sequence_number + 1, 'device-authorize', p_authorization_payload, current_operation.operation_hash, p_command_hash, p_recovery_key_id, p_signature, 1);
  delete from private.vault_pending_device_registrations where device_id = p_device_id;
  return true;
end; $$;
revoke all on function private.authorize_pending_vault_device_with_recovery(uuid, uuid, uuid, uuid, bytea, bytea, bytea, bytea, jsonb, uuid, bytea, bytea) from public, anon, authenticated;

create function private.revoke_vault_device_and_rotate_epochs(
  p_account_id uuid, p_session_id uuid, p_author_device_id uuid, p_revoked_device_id uuid, p_reason text,
  p_expected_previous_operation_hash bytea, p_rotations jsonb, p_operation_id uuid,
  p_command_payload bytea, p_command_hash bytea, p_signature bytea
) returns boolean language plpgsql security definer set search_path = '' as $$
declare current_operation public.vault_account_operations%rowtype; rotation jsonb; device_envelope jsonb; recovery_envelope jsonb; next_epoch integer; affected_collection_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 1));
  for affected_collection_id in
    select c.id from public.vault_collections c
    join public.vault_collection_memberships m on m.collection_id = c.id
    where m.account_id = p_account_id and m.status = 'active' and c.deleted_at is null
    order by c.id
  loop
    perform pg_advisory_xact_lock(hashtextextended(affected_collection_id::text, 2));
  end loop;
  select * into current_operation from public.vault_account_operations where account_id = p_account_id order by sequence_number desc limit 1 for update;
  if not found or current_operation.operation_hash <> p_expected_previous_operation_hash or p_author_device_id = p_revoked_device_id
    or not exists (select 1 from auth.sessions where id = p_session_id and user_id = p_account_id)
    or not exists (select 1 from public.vault_devices where id = p_author_device_id and account_id = p_account_id and status = 'active')
    or not exists (select 1 from public.vault_devices where id = p_revoked_device_id and account_id = p_account_id and status = 'active')
    or coalesce(jsonb_typeof(p_rotations), '') <> 'array'
    or jsonb_array_length(p_rotations) <> (
      select count(*) from private.vault_required_epochs(p_account_id)
    )
    or (select count(distinct r->>'collection_id') from jsonb_array_elements(p_rotations) r) <> jsonb_array_length(p_rotations)
    or exists (select 1 from jsonb_array_elements(p_rotations) r where not exists (
      select 1 from public.vault_collections c
      join public.vault_collection_memberships m on m.collection_id = c.id
      where c.id::text = r->>'collection_id' and m.account_id = p_account_id
        and m.status = 'active' and c.deleted_at is null
    ))
    or exists (select 1 from jsonb_array_elements(p_rotations) r where jsonb_typeof(r->'device_envelopes') <> 'array' or jsonb_typeof(r->'recovery_envelopes') <> 'array'
      or coalesce(octet_length(decode(r->>'encrypted_metadata','base64')),0) not between 16 and 65536
      or coalesce(octet_length(decode(r->>'metadata_nonce','base64')),0) <> 12
      or (r->>'epoch_number')::integer <> (select c.current_epoch_number + 1 from public.vault_collections c where c.id::text = r->>'collection_id')
      or jsonb_array_length(r->'device_envelopes') <> (
        select count(*) from public.vault_devices d
        where d.status = 'active' and d.id <> p_revoked_device_id and exists (
          select 1 from public.vault_collection_memberships m
          where m.collection_id::text = r->>'collection_id'
            and m.account_id = d.account_id and m.status = 'active'
        )
      )
      or jsonb_array_length(r->'recovery_envelopes') <> (
        select count(*) from public.vault_recovery_keys k
        where k.status = 'active' and exists (
          select 1 from public.vault_collection_memberships m
          where m.collection_id::text = r->>'collection_id'
            and m.account_id = k.account_id and m.status = 'active'
        )
      )
      or exists (select 1 from jsonb_array_elements(r->'device_envelopes') e where not exists (
        select 1 from public.vault_devices d where d.id::text = e->>'recipient_id'
          and d.status = 'active' and d.id <> p_revoked_device_id and exists (
            select 1 from public.vault_collection_memberships m
            where m.collection_id::text = r->>'collection_id'
              and m.account_id = d.account_id and m.status = 'active'
          )
      ))
      or exists (select 1 from jsonb_array_elements(r->'recovery_envelopes') e where not exists (
        select 1 from public.vault_recovery_keys k where k.id::text = e->>'recipient_id'
          and k.status = 'active' and exists (
            select 1 from public.vault_collection_memberships m
            where m.collection_id::text = r->>'collection_id'
              and m.account_id = k.account_id and m.status = 'active'
          )
      ))) then return false; end if;
  update public.vault_devices set status = 'revoked', revoked_at = now(), revocation_reason = p_reason where id = p_revoked_device_id;
  for rotation in select * from jsonb_array_elements(p_rotations) loop
    select current_epoch_number + 1 into next_epoch from public.vault_collections where id = (rotation->>'collection_id')::uuid for update;
    update public.vault_collection_epochs set state = 'superseded' where collection_id = (rotation->>'collection_id')::uuid and state = 'current';
    insert into public.vault_collection_epochs (collection_id, epoch_number, created_by_device_id, rotation_reason, previous_epoch_hash, membership_state_hash, recipient_set_commitment, transition_payload, transition_signature, transition_hash, state)
    values ((rotation->>'collection_id')::uuid, next_epoch, p_author_device_id, 'device-revoked', (select current_epoch_transition_hash from public.vault_collections where id = (rotation->>'collection_id')::uuid), decode(rotation->>'membership_hash','base64'), decode(rotation->>'recipient_commitment','base64'), decode(rotation->>'transition_payload','base64'), decode(rotation->>'transition_signature','base64'), decode(rotation->>'transition_hash','base64'), 'current');
    update public.vault_collections set encrypted_metadata = decode(rotation->>'encrypted_metadata','base64'), metadata_nonce = decode(rotation->>'metadata_nonce','base64'), current_epoch_number = next_epoch, current_epoch_transition_hash = decode(rotation->>'transition_hash','base64'), membership_log_head_hash = decode(rotation->>'membership_hash','base64') where id = (rotation->>'collection_id')::uuid;
    for device_envelope in select * from jsonb_array_elements(rotation->'device_envelopes') loop
      insert into public.vault_device_epoch_envelopes (collection_id, epoch_number, recipient_device_id, sender_device_id, encapsulation, ciphertext, algorithm, key_version, protocol_version, envelope_payload, envelope_payload_hash, signature)
      values ((rotation->>'collection_id')::uuid, next_epoch, (device_envelope->>'recipient_id')::uuid, p_author_device_id, decode(device_envelope->>'encapsulation','base64'), decode(device_envelope->>'ciphertext','base64'), 'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1, decode(device_envelope->>'payload','base64'), extensions.digest(decode(device_envelope->>'payload','base64'),'sha256'), decode(device_envelope->>'signature','base64'));
    end loop;
    for recovery_envelope in select * from jsonb_array_elements(rotation->'recovery_envelopes') loop
      insert into public.vault_recovery_epoch_envelopes (collection_id, epoch_number, recovery_key_id, sender_device_id, encapsulation, ciphertext, algorithm, key_version, protocol_version, envelope_payload, envelope_payload_hash, signature)
      values ((rotation->>'collection_id')::uuid, next_epoch, (recovery_envelope->>'recipient_id')::uuid, p_author_device_id, decode(recovery_envelope->>'encapsulation','base64'), decode(recovery_envelope->>'ciphertext','base64'), 'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1, decode(recovery_envelope->>'payload','base64'), extensions.digest(decode(recovery_envelope->>'payload','base64'),'sha256'), decode(recovery_envelope->>'signature','base64'));
    end loop;
  end loop;
  insert into public.vault_account_operations (operation_id, account_id, sequence_number, operation_type, canonical_payload, previous_operation_hash, operation_hash, author_device_id, signature, protocol_version)
  values (p_operation_id, p_account_id, current_operation.sequence_number + 1, 'device-revoke', p_command_payload, current_operation.operation_hash, p_command_hash, p_author_device_id, p_signature, 1);
  return true;
end; $$;
revoke all on function private.revoke_vault_device_and_rotate_epochs(uuid, uuid, uuid, uuid, text, bytea, jsonb, uuid, bytea, bytea, bytea) from public, anon, authenticated;

grant execute on function private.authorize_pending_vault_device(uuid, uuid, uuid, uuid, bytea, bytea, bytea, bytea, bytea, jsonb, uuid, bytea, bytea) to service_role;
grant execute on function private.authorize_pending_vault_device_with_recovery(uuid, uuid, uuid, uuid, bytea, bytea, bytea, bytea, jsonb, uuid, bytea, bytea) to service_role;
grant execute on function private.revoke_vault_device_and_rotate_epochs(uuid, uuid, uuid, uuid, text, bytea, jsonb, uuid, bytea, bytea, bytea) to service_role;

create function private.rotate_vault_recovery_root(
  p_account_id uuid, p_session_id uuid, p_old_recovery_key_id uuid, p_active_device_id uuid,
  p_new_recovery_key_id uuid, p_new_encryption_public_key bytea, p_new_signing_public_key bytea,
  p_expected_previous_operation_hash bytea, p_authorization_payload bytea, p_active_device_signature bytea,
  p_envelopes jsonb, p_operation_id uuid, p_command_hash bytea, p_recovery_signature bytea
) returns boolean language plpgsql security definer set search_path = '' as $$
declare current_operation public.vault_account_operations%rowtype; envelope jsonb; next_version integer; affected_collection_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 1));
  for affected_collection_id in
    select c.id from public.vault_collections c
    join public.vault_collection_memberships m on m.collection_id = c.id
    where m.account_id = p_account_id and m.status = 'active' and c.deleted_at is null
    order by c.id
  loop
    perform pg_advisory_xact_lock(hashtextextended(affected_collection_id::text, 2));
  end loop;
  select * into current_operation from public.vault_account_operations where account_id = p_account_id order by sequence_number desc limit 1 for update;
  select key_version + 1 into next_version from public.vault_recovery_keys where id = p_old_recovery_key_id and account_id = p_account_id and status = 'active' for update;
  if not found or next_version is null or current_operation.operation_hash <> p_expected_previous_operation_hash
    or octet_length(p_new_encryption_public_key) <> 32 or octet_length(p_new_signing_public_key) <> 32 or p_new_encryption_public_key = p_new_signing_public_key
    or octet_length(p_active_device_signature) <> 64 or octet_length(p_recovery_signature) <> 64
    or not exists (select 1 from auth.sessions where id = p_session_id and user_id = p_account_id)
    or not exists (select 1 from public.vault_devices where id = p_active_device_id and account_id = p_account_id and status = 'active')
    or coalesce(jsonb_typeof(p_envelopes), '') <> 'array'
    or jsonb_array_length(p_envelopes) <> (
      select count(*) from private.vault_required_epochs(p_account_id)
    )
    or (select count(distinct (e->>'collection_id', e->>'epoch_number')) from jsonb_array_elements(p_envelopes) e) <> jsonb_array_length(p_envelopes)
    or exists (select 1 from jsonb_array_elements(p_envelopes) e where not exists (
      select 1 from private.vault_required_epochs(p_account_id) ce
      where ce.collection_id::text = e->>'collection_id' and ce.epoch_number = (e->>'epoch_number')::integer
    )) then return false; end if;
  update public.vault_recovery_keys set status = 'revoked', revoked_at = now() where id = p_old_recovery_key_id;
  insert into public.vault_recovery_keys (id, account_id, encryption_public_key, signing_public_key, key_version, status, authorization_payload, authorization_signature)
  values (p_new_recovery_key_id, p_account_id, p_new_encryption_public_key, p_new_signing_public_key, next_version, 'active', p_authorization_payload, p_recovery_signature);
  for envelope in select * from jsonb_array_elements(p_envelopes) loop
    insert into public.vault_recovery_epoch_envelopes (collection_id, epoch_number, recovery_key_id, sender_recovery_key_id, encapsulation, ciphertext, algorithm, key_version, protocol_version, envelope_payload, envelope_payload_hash, signature)
    values ((envelope->>'collection_id')::uuid, (envelope->>'epoch_number')::integer, p_new_recovery_key_id, p_new_recovery_key_id, decode(envelope->>'encapsulation','base64'), decode(envelope->>'ciphertext','base64'), 'hpke-x25519-hkdf-sha256-aes-256-gcm', next_version, 1, decode(envelope->>'payload','base64'), extensions.digest(decode(envelope->>'payload','base64'),'sha256'), decode(envelope->>'signature','base64'));
  end loop;
  insert into public.vault_account_operations (operation_id, account_id, sequence_number, operation_type, canonical_payload, previous_operation_hash, operation_hash, recovery_key_id, signature, protocol_version)
  values (p_operation_id, p_account_id, current_operation.sequence_number+1, 'recovery-rotate', p_authorization_payload, current_operation.operation_hash, p_command_hash, p_old_recovery_key_id, p_recovery_signature, 1);
  return true;
end; $$;
revoke all on function private.rotate_vault_recovery_root(uuid,uuid,uuid,uuid,uuid,bytea,bytea,bytea,bytea,bytea,jsonb,uuid,bytea,bytea) from public, anon, authenticated;

grant execute on function private.rotate_vault_recovery_root(uuid,uuid,uuid,uuid,uuid,bytea,bytea,bytea,bytea,bytea,jsonb,uuid,bytea,bytea) to service_role;

create function private.read_vault_account_sync_page(
  p_requester_account_id uuid,
  p_requester_session_id uuid,
  p_target_account_id uuid,
  p_collection_id uuid,
  p_after bigint,
  p_anchor bytea,
  p_limit integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_after < 0 or p_limit < 1 or p_limit > 100
     or (p_after = 0 and p_anchor is not null)
     or (p_after > 0 and octet_length(p_anchor) <> 32)
     or not exists (
       select 1 from auth.sessions s
       where s.id = p_requester_session_id and s.user_id = p_requester_account_id
     )
     or p_target_account_id is distinct from p_requester_account_id
     or (
       p_after > 0 and not exists (
         select 1 from public.vault_account_operations operation
         where operation.account_id = p_target_account_id
           and operation.sequence_number = p_after
           and operation.operation_hash = p_anchor
       )
     ) then
    return null;
  end if;

  with page as (
    select operation.*
    from public.vault_account_operations operation
    where operation.account_id = p_target_account_id
      and operation.sequence_number > p_after
    order by operation.sequence_number
    limit p_limit + 1
  ), visible_page as (
    select * from page order by sequence_number limit p_limit
  )
  select jsonb_build_object(
    'operations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'operation_id', operation_id,
        'sequence_number', sequence_number,
        'operation_type', operation_type,
        'canonical_payload', encode(canonical_payload, 'base64'),
        'previous_operation_hash', case when previous_operation_hash is null then null else encode(previous_operation_hash, 'base64') end,
        'operation_hash', encode(operation_hash, 'base64'),
        'author_device_id', author_device_id,
        'recovery_key_id', recovery_key_id,
        'signature', encode(signature, 'base64')
      ) order by sequence_number) from visible_page
    ), '[]'::jsonb),
    'has_more', (select count(*) > p_limit from page),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'status', d.status,
        'encryption_public_key', encode(d.encryption_public_key, 'base64'),
        'signing_public_key', encode(d.signing_public_key, 'base64'),
        'revoked_at', d.revoked_at
      ) order by d.created_at, d.id)
      from public.vault_devices d where d.account_id = p_target_account_id
    ), '[]'::jsonb),
    'recovery_keys', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', key.id,
        'status', key.status,
        'key_version', key.key_version,
        'encryption_public_key', encode(key.encryption_public_key, 'base64'),
        'signing_public_key', encode(key.signing_public_key, 'base64'),
        'authorization_payload', encode(key.authorization_payload, 'base64'),
        'authorization_signature', encode(key.authorization_signature, 'base64')
      ) order by key.key_version)
      from public.vault_recovery_keys key where key.account_id = p_target_account_id
    ), '[]'::jsonb),
    'authorizations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'device_id', authz.device_id,
        'authorized_by_device_id', authz.authorized_by_device_id,
        'recovery_key_id', authz.recovery_key_id,
        'authorization_method', authz.authorization_method,
        'authorization_payload', encode(authz.authorization_payload, 'base64'),
        'authorization_payload_hash', encode(authz.authorization_payload_hash, 'base64'),
        'proof_payload', encode(authz.proof_of_possession_payload, 'base64'),
        'proof_signature', encode(authz.proof_of_possession_signature, 'base64'),
        'signature', encode(authz.signature, 'base64')
      ) order by authz.created_at, authz.id)
      from public.vault_device_authorizations authz
      where authz.account_id = p_target_account_id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function private.read_vault_account_sync_page(
  uuid, uuid, uuid, uuid, bigint, bytea, integer
) from public, anon, authenticated;

grant execute on function private.read_vault_account_sync_page( uuid, uuid, uuid, uuid, bigint, bytea, integer ) to service_role;
