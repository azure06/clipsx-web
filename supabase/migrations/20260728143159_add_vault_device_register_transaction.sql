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
  p_account_id uuid, p_auth_session_id uuid, p_challenge_id uuid, p_challenge_response_hash bytea,
  p_device_id uuid, p_display_name text, p_platform text, p_enrollment_origin text, p_protection_profile text,
  p_capabilities jsonb, p_device_encryption_public_key bytea, p_device_signing_public_key bytea,
  p_proof_payload bytea, p_proof_signature bytea, p_proof_hash bytea, p_sas_commitment bytea
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 1));
  if not exists (select 1 from auth.sessions where id = p_auth_session_id and user_id = p_account_id)
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

create function private.authorize_pending_vault_device(
  p_account_id uuid, p_session_id uuid, p_authorizer_device_id uuid, p_device_id uuid,
  p_expected_previous_operation_hash bytea, p_authorization_payload bytea, p_authorization_payload_hash bytea,
  p_pending_command_hash bytea, p_sas_hash bytea, p_envelopes jsonb, p_operation_id uuid,
  p_command_hash bytea, p_signature bytea
) returns boolean language plpgsql security definer set search_path = '' as $$
declare pending private.vault_pending_device_registrations%rowtype; current_operation public.vault_account_operations%rowtype; envelope jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 1));
  select * into pending from private.vault_pending_device_registrations where device_id = p_device_id and account_id = p_account_id and expires_at > now() for update;
  select * into current_operation from public.vault_account_operations where account_id = p_account_id order by sequence_number desc limit 1 for update;
  if not found or pending.device_id is null or current_operation.operation_hash <> p_expected_previous_operation_hash or pending.proof_hash <> p_pending_command_hash
    or pending.sas_commitment <> p_sas_hash or octet_length(p_sas_hash) <> 32 or octet_length(p_authorization_payload_hash) <> 32 or octet_length(p_command_hash) <> 32 or octet_length(p_signature) <> 64
    or not exists (select 1 from auth.sessions s join public.vault_devices d on d.auth_session_id = s.id where s.id = p_session_id and s.user_id = p_account_id and d.id = p_authorizer_device_id and d.status = 'active')
    or exists (select 1 from public.vault_account_operations where operation_id = p_operation_id) then return false; end if;
  -- Every current personal collection must receive exactly one opaque, signed envelope.
  if jsonb_typeof(p_envelopes) <> 'array' or jsonb_array_length(p_envelopes) <> (select count(*) from public.vault_collections where owner_account_id = p_account_id and deleted_at is null)
    or exists (select 1 from jsonb_array_elements(p_envelopes) e where not exists (select 1 from public.vault_collections c join public.vault_collection_epochs ce on ce.collection_id = c.id and ce.state = 'current' where c.owner_account_id = p_account_id and c.deleted_at is null and c.id::text = e->>'collection_id' and ce.epoch_number = (e->>'epoch_number')::integer)) then return false; end if;
  insert into public.vault_devices (id, account_id, display_name, client_type, platform, enrollment_origin, key_protection_profile, client_crypto_capabilities, encryption_public_key, signing_public_key, encryption_algorithm, signing_algorithm, key_version, status)
  values (pending.device_id, pending.account_id, pending.display_name, 'browser', pending.platform, pending.enrollment_origin, pending.protection_profile, pending.capabilities, pending.encryption_public_key, pending.signing_public_key, 'hpke-x25519-hkdf-sha256-aes-256-gcm', 'ed25519', 1, 'active');
  insert into public.vault_device_authorizations (account_id, device_id, authorized_by_device_id, authorization_method, authorization_payload, authorization_payload_hash, proof_of_possession_payload, proof_of_possession_signature, signature)
  values (p_account_id, p_device_id, p_authorizer_device_id, 'qr', p_authorization_payload, p_authorization_payload_hash, pending.proof_payload, pending.proof_signature, p_signature);
  for envelope in select * from jsonb_array_elements(p_envelopes) loop
    insert into public.vault_device_epoch_envelopes (collection_id, epoch_number, recipient_device_id, sender_device_id, encapsulation, ciphertext, algorithm, key_version, protocol_version, envelope_payload, envelope_payload_hash, signature)
    values ((envelope->>'collection_id')::uuid, (envelope->>'epoch_number')::integer, p_device_id, p_authorizer_device_id, decode(envelope->>'encapsulation','base64'), decode(envelope->>'ciphertext','base64'), 'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1, decode(envelope->>'payload','base64'), digest(decode(envelope->>'payload','base64'),'sha256'), decode(envelope->>'signature','base64'));
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
declare pending private.vault_pending_device_registrations%rowtype; current_operation public.vault_account_operations%rowtype; envelope jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 1));
  select * into pending from private.vault_pending_device_registrations where device_id = p_device_id and account_id = p_account_id and expires_at > now() for update;
  select * into current_operation from public.vault_account_operations where account_id = p_account_id order by sequence_number desc limit 1 for update;
  if not found or pending.device_id is null or current_operation.operation_hash <> p_expected_previous_operation_hash
    or pending.proof_hash <> p_pending_command_hash or octet_length(p_authorization_payload_hash) <> 32
    or octet_length(p_command_hash) <> 32 or octet_length(p_signature) <> 64
    or not exists (select 1 from auth.sessions where id = p_session_id and user_id = p_account_id)
    or not exists (select 1 from public.vault_recovery_keys where id = p_recovery_key_id and account_id = p_account_id and status = 'active')
    or exists (select 1 from public.vault_account_operations where operation_id = p_operation_id) then return false; end if;
  if jsonb_typeof(p_envelopes) <> 'array'
    or jsonb_array_length(p_envelopes) <> (select count(*) from public.vault_collections where owner_account_id = p_account_id and deleted_at is null)
    or exists (select 1 from jsonb_array_elements(p_envelopes) e where not exists (
      select 1 from public.vault_collections c join public.vault_collection_epochs ce on ce.collection_id = c.id and ce.state = 'current'
      where c.owner_account_id = p_account_id and c.deleted_at is null and c.id::text = e->>'collection_id' and ce.epoch_number = (e->>'epoch_number')::integer
    )) then return false; end if;
  insert into public.vault_devices (id, account_id, display_name, client_type, platform, enrollment_origin, key_protection_profile, client_crypto_capabilities, encryption_public_key, signing_public_key, encryption_algorithm, signing_algorithm, key_version, status)
  values (pending.device_id, pending.account_id, pending.display_name, 'browser', pending.platform, pending.enrollment_origin, pending.protection_profile, pending.capabilities, pending.encryption_public_key, pending.signing_public_key, 'hpke-x25519-hkdf-sha256-aes-256-gcm', 'ed25519', 1, 'active');
  insert into public.vault_device_authorizations (account_id, device_id, recovery_key_id, authorization_method, authorization_payload, authorization_payload_hash, proof_of_possession_payload, proof_of_possession_signature, signature)
  values (p_account_id, p_device_id, p_recovery_key_id, 'recovery', p_authorization_payload, p_authorization_payload_hash, pending.proof_payload, pending.proof_signature, p_signature);
  for envelope in select * from jsonb_array_elements(p_envelopes) loop
    insert into public.vault_device_epoch_envelopes (collection_id, epoch_number, recipient_device_id, sender_recovery_key_id, encapsulation, ciphertext, algorithm, key_version, protocol_version, envelope_payload, envelope_payload_hash, signature)
    values ((envelope->>'collection_id')::uuid, (envelope->>'epoch_number')::integer, p_device_id, p_recovery_key_id, decode(envelope->>'encapsulation','base64'), decode(envelope->>'ciphertext','base64'), 'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1, decode(envelope->>'payload','base64'), digest(decode(envelope->>'payload','base64'),'sha256'), decode(envelope->>'signature','base64'));
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
declare current_operation public.vault_account_operations%rowtype; rotation jsonb; device_envelope jsonb; recovery_envelope jsonb; next_epoch integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 1));
  select * into current_operation from public.vault_account_operations where account_id = p_account_id order by sequence_number desc limit 1 for update;
  if not found or current_operation.operation_hash <> p_expected_previous_operation_hash or p_author_device_id = p_revoked_device_id
    or not exists (select 1 from auth.sessions s join public.vault_devices d on d.auth_session_id = s.id where s.id = p_session_id and s.user_id = p_account_id and d.id = p_author_device_id and d.status = 'active')
    or not exists (select 1 from public.vault_devices where id = p_revoked_device_id and account_id = p_account_id and status = 'active')
    or coalesce(jsonb_typeof(p_rotations), '') <> 'array' or jsonb_array_length(p_rotations) <> (select count(*) from public.vault_collections where owner_account_id = p_account_id and deleted_at is null)
    or (select count(distinct r->>'collection_id') from jsonb_array_elements(p_rotations) r) <> jsonb_array_length(p_rotations)
    or exists (select 1 from jsonb_array_elements(p_rotations) r where not exists (select 1 from public.vault_collections c where c.id::text = r->>'collection_id' and c.owner_account_id = p_account_id and c.deleted_at is null))
    or exists (select 1 from jsonb_array_elements(p_rotations) r where jsonb_typeof(r->'device_envelopes') <> 'array' or jsonb_typeof(r->'recovery_envelopes') <> 'array'
      or (r->>'epoch_number')::integer <> (select c.current_epoch_number + 1 from public.vault_collections c where c.id::text = r->>'collection_id')
      or jsonb_array_length(r->'device_envelopes') <> (select count(*) from public.vault_devices where account_id = p_account_id and status = 'active' and id <> p_revoked_device_id)
      or jsonb_array_length(r->'recovery_envelopes') <> (select count(*) from public.vault_recovery_keys where account_id = p_account_id and status = 'active')
      or exists (select 1 from jsonb_array_elements(r->'device_envelopes') e where not exists (select 1 from public.vault_devices d where d.id::text = e->>'recipient_id' and d.account_id = p_account_id and d.status = 'active' and d.id <> p_revoked_device_id))
      or exists (select 1 from jsonb_array_elements(r->'recovery_envelopes') e where not exists (select 1 from public.vault_recovery_keys k where k.id::text = e->>'recipient_id' and k.account_id = p_account_id and k.status = 'active'))) then return false; end if;
  update public.vault_devices set status = 'revoked', revoked_at = now(), revocation_reason = p_reason, auth_session_id = null where id = p_revoked_device_id;
  for rotation in select * from jsonb_array_elements(p_rotations) loop
    select current_epoch_number + 1 into next_epoch from public.vault_collections where id = (rotation->>'collection_id')::uuid for update;
    update public.vault_collection_epochs set state = 'superseded' where collection_id = (rotation->>'collection_id')::uuid and state = 'current';
    insert into public.vault_collection_epochs (collection_id, epoch_number, created_by_device_id, rotation_reason, previous_epoch_hash, membership_state_hash, recipient_set_commitment, transition_payload, transition_signature, transition_hash, state)
    values ((rotation->>'collection_id')::uuid, next_epoch, p_author_device_id, 'device-revoked', (select current_epoch_transition_hash from public.vault_collections where id = (rotation->>'collection_id')::uuid), decode(rotation->>'membership_hash','base64'), decode(rotation->>'recipient_commitment','base64'), decode(rotation->>'transition_payload','base64'), decode(rotation->>'transition_signature','base64'), decode(rotation->>'transition_hash','base64'), 'current');
    update public.vault_collections set current_epoch_number = next_epoch, current_epoch_transition_hash = decode(rotation->>'transition_hash','base64'), membership_log_head_hash = decode(rotation->>'membership_hash','base64') where id = (rotation->>'collection_id')::uuid;
    for device_envelope in select * from jsonb_array_elements(rotation->'device_envelopes') loop
      insert into public.vault_device_epoch_envelopes (collection_id, epoch_number, recipient_device_id, sender_device_id, encapsulation, ciphertext, algorithm, key_version, protocol_version, envelope_payload, envelope_payload_hash, signature)
      values ((rotation->>'collection_id')::uuid, next_epoch, (device_envelope->>'recipient_id')::uuid, p_author_device_id, decode(device_envelope->>'encapsulation','base64'), decode(device_envelope->>'ciphertext','base64'), 'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1, decode(device_envelope->>'payload','base64'), digest(decode(device_envelope->>'payload','base64'),'sha256'), decode(device_envelope->>'signature','base64'));
    end loop;
    for recovery_envelope in select * from jsonb_array_elements(rotation->'recovery_envelopes') loop
      insert into public.vault_recovery_epoch_envelopes (collection_id, epoch_number, recovery_key_id, sender_device_id, encapsulation, ciphertext, algorithm, key_version, protocol_version, envelope_payload, envelope_payload_hash, signature)
      values ((rotation->>'collection_id')::uuid, next_epoch, (recovery_envelope->>'recipient_id')::uuid, p_author_device_id, decode(recovery_envelope->>'encapsulation','base64'), decode(recovery_envelope->>'ciphertext','base64'), 'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1, decode(recovery_envelope->>'payload','base64'), digest(decode(recovery_envelope->>'payload','base64'),'sha256'), decode(recovery_envelope->>'signature','base64'));
    end loop;
  end loop;
  insert into public.vault_account_operations (operation_id, account_id, sequence_number, operation_type, canonical_payload, previous_operation_hash, operation_hash, author_device_id, signature, protocol_version)
  values (p_operation_id, p_account_id, current_operation.sequence_number + 1, 'device-revoke', p_command_payload, current_operation.operation_hash, p_command_hash, p_author_device_id, p_signature, 1);
  return true;
end; $$;
revoke all on function private.revoke_vault_device_and_rotate_epochs(uuid, uuid, uuid, uuid, text, bytea, jsonb, uuid, bytea, bytea, bytea) from public, anon, authenticated;

create function private.rotate_vault_recovery_root(
  p_account_id uuid, p_session_id uuid, p_old_recovery_key_id uuid, p_active_device_id uuid,
  p_new_recovery_key_id uuid, p_new_encryption_public_key bytea, p_new_signing_public_key bytea,
  p_expected_previous_operation_hash bytea, p_authorization_payload bytea, p_active_device_signature bytea,
  p_envelopes jsonb, p_operation_id uuid, p_command_hash bytea, p_recovery_signature bytea
) returns boolean language plpgsql security definer set search_path = '' as $$
declare current_operation public.vault_account_operations%rowtype; envelope jsonb; next_version integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 1));
  select * into current_operation from public.vault_account_operations where account_id = p_account_id order by sequence_number desc limit 1 for update;
  select key_version + 1 into next_version from public.vault_recovery_keys where id = p_old_recovery_key_id and account_id = p_account_id and status = 'active' for update;
  if not found or next_version is null or current_operation.operation_hash <> p_expected_previous_operation_hash
    or octet_length(p_new_encryption_public_key) <> 32 or octet_length(p_new_signing_public_key) <> 32 or p_new_encryption_public_key = p_new_signing_public_key
    or octet_length(p_active_device_signature) <> 64 or octet_length(p_recovery_signature) <> 64
    or not exists (select 1 from auth.sessions s join public.vault_devices d on d.auth_session_id = s.id where s.id = p_session_id and s.user_id = p_account_id and d.id = p_active_device_id and d.status = 'active')
    or coalesce(jsonb_typeof(p_envelopes), '') <> 'array' or jsonb_array_length(p_envelopes) <> (select count(*) from public.vault_collections where owner_account_id = p_account_id and deleted_at is null)
    or (select count(distinct e->>'collection_id') from jsonb_array_elements(p_envelopes) e) <> jsonb_array_length(p_envelopes)
    or exists (select 1 from jsonb_array_elements(p_envelopes) e where not exists (
      select 1 from public.vault_collection_epochs ce join public.vault_collections c on c.id = ce.collection_id
      where c.owner_account_id = p_account_id and c.deleted_at is null and ce.state = 'current'
        and ce.collection_id::text = e->>'collection_id' and ce.epoch_number = (e->>'epoch_number')::integer
    )) then return false; end if;
  update public.vault_recovery_keys set status = 'revoked', revoked_at = now() where id = p_old_recovery_key_id;
  insert into public.vault_recovery_keys (id, account_id, encryption_public_key, signing_public_key, key_version, status, authorization_payload, authorization_signature)
  values (p_new_recovery_key_id, p_account_id, p_new_encryption_public_key, p_new_signing_public_key, next_version, 'active', p_authorization_payload, p_recovery_signature);
  for envelope in select * from jsonb_array_elements(p_envelopes) loop
    insert into public.vault_recovery_epoch_envelopes (collection_id, epoch_number, recovery_key_id, sender_recovery_key_id, encapsulation, ciphertext, algorithm, key_version, protocol_version, envelope_payload, envelope_payload_hash, signature)
    values ((envelope->>'collection_id')::uuid, (envelope->>'epoch_number')::integer, p_new_recovery_key_id, p_new_recovery_key_id, decode(envelope->>'encapsulation','base64'), decode(envelope->>'ciphertext','base64'), 'hpke-x25519-hkdf-sha256-aes-256-gcm', next_version, 1, decode(envelope->>'payload','base64'), digest(decode(envelope->>'payload','base64'),'sha256'), decode(envelope->>'signature','base64'));
  end loop;
  insert into public.vault_account_operations (operation_id, account_id, sequence_number, operation_type, canonical_payload, previous_operation_hash, operation_hash, recovery_key_id, signature, protocol_version)
  values (p_operation_id, p_account_id, current_operation.sequence_number+1, 'recovery-rotate', p_authorization_payload, current_operation.operation_hash, p_command_hash, p_new_recovery_key_id, p_recovery_signature, 1);
  return true;
end; $$;
revoke all on function private.rotate_vault_recovery_root(uuid,uuid,uuid,uuid,uuid,bytea,bytea,bytea,bytea,bytea,jsonb,uuid,bytea,bytea) from public, anon, authenticated;

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

-- Only the route handler reaches this transaction after validating the outer
-- command and immutable-revision signatures.  It receives opaque ciphertext.
create function private.append_vault_note_revision(
  p_account_id uuid, p_session_id uuid, p_device_id uuid, p_collection_id uuid,
  p_expected_collection_head bytea, p_note_id uuid, p_expected_previous_revision_hash bytea, p_collection_epoch integer,
  p_encrypted_content bytea, p_content_nonce bytea, p_wrapped_revision_key bytea,
  p_key_wrap_nonce bytea, p_ciphertext_hash bytea, p_wrapped_revision_key_hash bytea,
  p_revision_hash bytea, p_revision_signature bytea, p_operation_id uuid,
  p_command_payload bytea, p_command_hash bytea, p_command_signature bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_operation public.vault_collection_operations%rowtype;
  current_note public.vault_notes%rowtype;
  note_exists boolean;
begin
  if octet_length(p_expected_collection_head) <> 32 or p_collection_epoch < 1
     or octet_length(p_encrypted_content) not between 16 and 1048576
     or octet_length(p_content_nonce) <> 12 or octet_length(p_wrapped_revision_key) < 16
     or octet_length(p_key_wrap_nonce) <> 12 or octet_length(p_ciphertext_hash) <> 32
     or octet_length(p_wrapped_revision_key_hash) <> 32 or octet_length(p_revision_hash) <> 32
     or octet_length(p_revision_signature) <> 64 or octet_length(p_command_hash) <> 32
     or octet_length(p_command_signature) <> 64 then return false;
  end if;

  select * into current_operation from public.vault_collection_operations
  where collection_id = p_collection_id order by sequence_number desc limit 1 for update;
  if not found then return false; end if;
  select * into current_note from public.vault_notes where id = p_note_id and collection_id = p_collection_id for update;
  note_exists := found;
  if current_operation.operation_hash <> p_expected_collection_head
     or exists (select 1 from public.vault_collection_operations where operation_id = p_operation_id)
     or not exists (
       select 1 from public.vault_devices d join auth.sessions s on s.id = d.auth_session_id and s.user_id = d.account_id
       where d.id = p_device_id and d.account_id = p_account_id and d.status = 'active' and d.auth_session_id = p_session_id
     ) or not exists (
       select 1 from public.vault_collection_memberships m
       where m.collection_id = p_collection_id and m.account_id = p_account_id and m.status = 'active' and m.role in ('owner', 'editor')
     ) or not exists (
       select 1 from public.vault_collections c where c.id = p_collection_id and c.current_epoch_number = p_collection_epoch and c.deleted_at is null
     ) then return false;
  end if;

  if not note_exists and p_expected_previous_revision_hash is not null then return false; end if;
  if note_exists and current_note.deleted_at is not null then return false; end if;
  if note_exists and current_note.current_revision_hash is distinct from p_expected_previous_revision_hash then return false; end if;
  if not note_exists then
    insert into public.vault_notes (id, collection_id, created_by_device_id, current_revision, current_revision_hash)
    values (p_note_id, p_collection_id, p_device_id, 1, p_revision_hash);
  else
    update public.vault_notes set current_revision = current_note.current_revision + 1, current_revision_hash = p_revision_hash where id = p_note_id;
  end if;
  insert into public.vault_note_revisions (
    note_id, collection_id, revision_number, collection_epoch, encrypted_content, content_nonce,
    wrapped_revision_key, key_wrap_nonce, ciphertext_hash, wrapped_revision_key_hash, revision_hash,
    author_device_id, author_signature, operation_id, operation_type, logical_clock
  ) values (
    p_note_id, p_collection_id, case when note_exists then current_note.current_revision + 1 else 1 end, p_collection_epoch, p_encrypted_content, p_content_nonce,
    p_wrapped_revision_key, p_key_wrap_nonce, p_ciphertext_hash, p_wrapped_revision_key_hash, p_revision_hash,
    p_device_id, p_revision_signature, p_operation_id, case when note_exists then 'update' else 'create' end, case when note_exists then current_note.current_revision else 0 end
  );
  insert into public.vault_collection_operations (
    operation_id, collection_id, sequence_number, operation_type, canonical_payload, previous_operation_hash,
    operation_hash, author_device_id, signature, protocol_version
  ) values (
    p_operation_id, p_collection_id, current_operation.sequence_number + 1, 'note-append', p_command_payload, current_operation.operation_hash,
    p_command_hash, p_device_id, p_command_signature, 1
  );
  return true;
end;
$$;

revoke all on function private.append_vault_note_revision(
  uuid, uuid, uuid, uuid, bytea, uuid, bytea, integer, bytea, bytea, bytea, bytea,
  bytea, bytea, bytea, bytea, uuid, bytea, bytea, bytea
) from public, anon, authenticated;

-- Deletion retains only an authenticated non-secret tombstone. The route has
-- already verified the device-signed canonical command before this transaction.
create function private.delete_vault_note(
  p_account_id uuid, p_session_id uuid, p_device_id uuid, p_collection_id uuid,
  p_expected_collection_head bytea, p_note_id uuid, p_expected_revision_hash bytea,
  p_operation_id uuid, p_command_payload bytea, p_command_hash bytea, p_command_signature bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_operation public.vault_collection_operations%rowtype;
  current_note public.vault_notes%rowtype;
begin
  if octet_length(p_expected_collection_head) <> 32 or octet_length(p_expected_revision_hash) <> 32
     or octet_length(p_command_hash) <> 32 or octet_length(p_command_signature) <> 64 then return false;
  end if;

  select * into current_operation from public.vault_collection_operations
  where collection_id = p_collection_id order by sequence_number desc limit 1 for update;
  if not found then return false; end if;
  select * into current_note from public.vault_notes
  where id = p_note_id and collection_id = p_collection_id for update;
  if not found or current_note.deleted_at is not null
     or current_operation.operation_hash <> p_expected_collection_head
     or current_note.current_revision_hash <> p_expected_revision_hash
     or exists (select 1 from public.vault_collection_operations where operation_id = p_operation_id)
     or exists (select 1 from public.vault_tombstones where note_id = p_note_id)
     or not exists (
       select 1 from public.vault_devices d join auth.sessions s on s.id = d.auth_session_id and s.user_id = d.account_id
       where d.id = p_device_id and d.account_id = p_account_id and d.status = 'active' and d.auth_session_id = p_session_id
     ) or not exists (
       select 1 from public.vault_collection_memberships m
       where m.collection_id = p_collection_id and m.account_id = p_account_id and m.status = 'active' and m.role in ('owner', 'editor')
     ) then return false;
  end if;

  update public.vault_notes set deleted_at = now() where id = p_note_id;
  delete from public.vault_note_revisions where note_id = p_note_id;
  insert into public.vault_collection_operations (
    operation_id, collection_id, sequence_number, operation_type, canonical_payload, previous_operation_hash,
    operation_hash, author_device_id, signature, protocol_version
  ) values (
    p_operation_id, p_collection_id, current_operation.sequence_number + 1, 'note-delete', p_command_payload, current_operation.operation_hash,
    p_command_hash, p_device_id, p_command_signature, 1
  );
  insert into public.vault_tombstones (
    note_id, collection_id, deleted_by_device_id, delete_operation_id, last_revision_hash
  ) values (
    p_note_id, p_collection_id, p_device_id, p_operation_id, p_expected_revision_hash
  );
  return true;
end;
$$;

revoke all on function private.delete_vault_note(
  uuid, uuid, uuid, uuid, bytea, uuid, bytea, uuid, bytea, bytea, bytea
) from public, anon, authenticated;
