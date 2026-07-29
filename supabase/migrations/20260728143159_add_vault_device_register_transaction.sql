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

create or replace function private.register_initial_vault_device(
  p_account_id uuid,
  p_auth_session_id uuid,
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
     or not exists (select 1 from auth.sessions where id = p_auth_session_id and user_id = p_account_id) then
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
    signing_public_key, encryption_algorithm, signing_algorithm, key_version, status, auth_session_id
  ) values (
    p_device_id, p_account_id, p_display_name, 'browser', p_platform, p_enrollment_origin,
    p_protection_profile, p_capabilities, p_device_encryption_public_key,
    p_device_signing_public_key, 'hpke-x25519-hkdf-sha256-aes-256-gcm', 'ed25519', 1, 'active', p_auth_session_id
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

create function private.bind_vault_device_session(
  p_account_id uuid,
  p_device_id uuid,
  p_session_id uuid,
  p_expected_previous_operation_hash bytea,
  p_operation_id uuid,
  p_command_payload bytea,
  p_command_hash bytea,
  p_signature bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_operation public.vault_account_operations%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 1));

  select * into current_operation
  from public.vault_account_operations
  where account_id = p_account_id
  order by sequence_number desc
  limit 1
  for update;

  if not found
     or current_operation.operation_hash <> p_expected_previous_operation_hash
     or exists (
       select 1 from public.vault_devices
       where auth_session_id = p_session_id and status = 'active' and id <> p_device_id
     )
     or not exists (
       select 1 from auth.sessions where id = p_session_id and user_id = p_account_id
     )
     or not exists (
       select 1 from public.vault_devices
       where id = p_device_id and account_id = p_account_id and status = 'active'
     ) then
    return false;
  end if;

  update public.vault_devices
  set auth_session_id = p_session_id, last_seen_at = now()
  where id = p_device_id and account_id = p_account_id and status = 'active';

  insert into public.vault_account_operations (
    operation_id, account_id, sequence_number, operation_type, canonical_payload,
    previous_operation_hash, operation_hash, author_device_id, signature,
    protocol_version
  ) values (
    p_operation_id, p_account_id, current_operation.sequence_number + 1,
    'device-session-bind', p_command_payload, current_operation.operation_hash,
    p_command_hash, p_device_id, p_signature, 1
  );

  return true;
end;
$$;

revoke all on function private.bind_vault_device_session(
  uuid, uuid, uuid, bytea, uuid, bytea, bytea, bytea
) from public, anon, authenticated;

create function private.create_vault_collection(
  p_account_id uuid, p_session_id uuid, p_device_id uuid, p_collection_id uuid,
  p_encrypted_metadata bytea, p_metadata_nonce bytea, p_membership_state_hash bytea,
  p_recipient_set_commitment bytea, p_transition_payload bytea, p_transition_signature bytea,
  p_transition_hash bytea, p_device_envelope_enc bytea, p_device_envelope_ciphertext bytea,
  p_device_envelope_payload bytea, p_device_envelope_signature bytea, p_recovery_key_id uuid,
  p_recovery_envelope_enc bytea, p_recovery_envelope_ciphertext bytea,
  p_recovery_envelope_payload bytea, p_recovery_envelope_signature bytea,
  p_operation_id uuid, p_command_payload bytea, p_command_hash bytea, p_command_signature bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if octet_length(p_metadata_nonce) <> 12 or octet_length(p_membership_state_hash) <> 32
     or octet_length(p_recipient_set_commitment) <> 32 or octet_length(p_transition_hash) <> 32
     or octet_length(p_transition_signature) <> 64 or octet_length(p_device_envelope_enc) <> 32
     or octet_length(p_recovery_envelope_enc) <> 32 or octet_length(p_device_envelope_signature) <> 64
     or octet_length(p_recovery_envelope_signature) <> 64 or octet_length(p_command_hash) <> 32
     or octet_length(p_command_signature) <> 64 or octet_length(p_encrypted_metadata) < 16
     or octet_length(p_device_envelope_ciphertext) < 16 or octet_length(p_recovery_envelope_ciphertext) < 16 then
    return false;
  end if;

  if not exists (
    select 1 from public.vault_devices d join auth.sessions s on s.id = d.auth_session_id and s.user_id = d.account_id
    where d.id = p_device_id and d.account_id = p_account_id and d.status = 'active' and d.auth_session_id = p_session_id
  ) or not exists (
    select 1 from public.vault_recovery_keys where id = p_recovery_key_id and account_id = p_account_id and status = 'active'
  ) or exists (select 1 from public.vault_collections where id = p_collection_id)
    or exists (select 1 from public.vault_collection_operations where operation_id = p_operation_id) then
    return false;
  end if;

  insert into public.vault_collections (
    id, owner_account_id, encrypted_metadata, metadata_nonce, current_epoch_number,
    current_epoch_transition_hash, membership_log_head_hash
  ) values (
    p_collection_id, p_account_id, p_encrypted_metadata, p_metadata_nonce, 1,
    p_transition_hash, p_membership_state_hash
  );
  insert into public.vault_collection_memberships (
    collection_id, account_id, role, status, joined_at, joined_epoch, history_access_from_epoch,
    invited_by_device_id, membership_operation_id
  ) values (
    p_collection_id, p_account_id, 'owner', 'active', now(), 1, 1, p_device_id, p_operation_id
  );
  insert into public.vault_collection_epochs (
    collection_id, epoch_number, created_by_device_id, rotation_reason, membership_state_hash,
    recipient_set_commitment, transition_payload, transition_signature, transition_hash, state
  ) values (
    p_collection_id, 1, p_device_id, 'collection-created', p_membership_state_hash,
    p_recipient_set_commitment, p_transition_payload, p_transition_signature, p_transition_hash, 'current'
  );
  insert into public.vault_device_epoch_envelopes (
    collection_id, epoch_number, recipient_device_id, sender_device_id, encapsulation, ciphertext,
    algorithm, key_version, protocol_version, envelope_payload, envelope_payload_hash, signature
  ) values (
    p_collection_id, 1, p_device_id, p_device_id, p_device_envelope_enc, p_device_envelope_ciphertext,
    'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1, p_device_envelope_payload, digest(p_device_envelope_payload, 'sha256'), p_device_envelope_signature
  );
  insert into public.vault_recovery_epoch_envelopes (
    collection_id, epoch_number, recovery_key_id, sender_device_id, encapsulation, ciphertext,
    algorithm, key_version, protocol_version, envelope_payload, envelope_payload_hash, signature
  ) values (
    p_collection_id, 1, p_recovery_key_id, p_device_id, p_recovery_envelope_enc, p_recovery_envelope_ciphertext,
    'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1, p_recovery_envelope_payload, digest(p_recovery_envelope_payload, 'sha256'), p_recovery_envelope_signature
  );
  insert into public.vault_collection_operations (
    operation_id, collection_id, sequence_number, operation_type, canonical_payload, operation_hash,
    author_device_id, signature, protocol_version
  ) values (
    p_operation_id, p_collection_id, 1, 'collection-create', p_command_payload, p_command_hash,
    p_device_id, p_command_signature, 1
  );
  return true;
end;
$$;

revoke all on function private.create_vault_collection(
  uuid, uuid, uuid, uuid, bytea, bytea, bytea, bytea, bytea, bytea, bytea,
  bytea, bytea, bytea, bytea, uuid, bytea, bytea, bytea, bytea, uuid, bytea, bytea, bytea
) from public, anon, authenticated;
