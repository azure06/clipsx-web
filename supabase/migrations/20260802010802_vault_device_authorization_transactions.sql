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
  -- Every collection the account can currently read receives exactly one
  -- opaque, signed envelope for the proposed device.
  if jsonb_typeof(p_envelopes) <> 'array'
    or jsonb_array_length(p_envelopes) <> (
      select count(*) from public.vault_collections c
      join public.vault_collection_memberships m on m.collection_id = c.id
      where m.account_id = p_account_id and m.status = 'active' and c.deleted_at is null
    )
    or (select count(distinct e->>'collection_id') from jsonb_array_elements(p_envelopes) e) <> jsonb_array_length(p_envelopes)
    or exists (select 1 from jsonb_array_elements(p_envelopes) e where not exists (
      select 1 from public.vault_collections c
      join public.vault_collection_memberships m on m.collection_id = c.id
      join public.vault_collection_epochs ce on ce.collection_id = c.id and ce.state = 'current'
      where m.account_id = p_account_id and m.status = 'active' and c.deleted_at is null
        and c.id::text = e->>'collection_id' and ce.epoch_number = (e->>'epoch_number')::integer
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
  if jsonb_typeof(p_envelopes) <> 'array'
    or jsonb_array_length(p_envelopes) <> (
      select count(*) from public.vault_collections c
      join public.vault_collection_memberships m on m.collection_id = c.id
      where m.account_id = p_account_id and m.status = 'active' and c.deleted_at is null
    )
    or (select count(distinct e->>'collection_id') from jsonb_array_elements(p_envelopes) e) <> jsonb_array_length(p_envelopes)
    or exists (select 1 from jsonb_array_elements(p_envelopes) e where not exists (
      select 1 from public.vault_collections c
      join public.vault_collection_memberships m on m.collection_id = c.id
      join public.vault_collection_epochs ce on ce.collection_id = c.id and ce.state = 'current'
      where m.account_id = p_account_id and m.status = 'active' and c.deleted_at is null
        and c.id::text = e->>'collection_id' and ce.epoch_number = (e->>'epoch_number')::integer
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
      select count(*) from public.vault_collections c
      join public.vault_collection_memberships m on m.collection_id = c.id
      where m.account_id = p_account_id and m.status = 'active' and c.deleted_at is null
    )
    or (select count(distinct r->>'collection_id') from jsonb_array_elements(p_rotations) r) <> jsonb_array_length(p_rotations)
    or exists (select 1 from jsonb_array_elements(p_rotations) r where not exists (
      select 1 from public.vault_collections c
      join public.vault_collection_memberships m on m.collection_id = c.id
      where c.id::text = r->>'collection_id' and m.account_id = p_account_id
        and m.status = 'active' and c.deleted_at is null
    ))
    or exists (select 1 from jsonb_array_elements(p_rotations) r where jsonb_typeof(r->'device_envelopes') <> 'array' or jsonb_typeof(r->'recovery_envelopes') <> 'array'
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
    update public.vault_collections set current_epoch_number = next_epoch, current_epoch_transition_hash = decode(rotation->>'transition_hash','base64'), membership_log_head_hash = decode(rotation->>'membership_hash','base64') where id = (rotation->>'collection_id')::uuid;
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
