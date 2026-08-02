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
