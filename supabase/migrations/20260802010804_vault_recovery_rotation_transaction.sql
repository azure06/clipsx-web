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
      select count(*) from public.vault_collections c
      join public.vault_collection_memberships m on m.collection_id = c.id
      where m.account_id = p_account_id and m.status = 'active' and c.deleted_at is null
    )
    or (select count(distinct e->>'collection_id') from jsonb_array_elements(p_envelopes) e) <> jsonb_array_length(p_envelopes)
    or exists (select 1 from jsonb_array_elements(p_envelopes) e where not exists (
      select 1 from public.vault_collection_epochs ce
      join public.vault_collections c on c.id = ce.collection_id
      join public.vault_collection_memberships m on m.collection_id = c.id
      where m.account_id = p_account_id and m.status = 'active'
        and c.deleted_at is null and ce.state = 'current'
        and ce.collection_id::text = e->>'collection_id' and ce.epoch_number = (e->>'epoch_number')::integer
    )) then return false; end if;
  update public.vault_recovery_keys set status = 'revoked', revoked_at = now() where id = p_old_recovery_key_id;
  insert into public.vault_recovery_keys (id, account_id, encryption_public_key, signing_public_key, key_version, status, authorization_payload, authorization_signature)
  values (p_new_recovery_key_id, p_account_id, p_new_encryption_public_key, p_new_signing_public_key, next_version, 'active', p_authorization_payload, p_recovery_signature);
  for envelope in select * from jsonb_array_elements(p_envelopes) loop
    insert into public.vault_recovery_epoch_envelopes (collection_id, epoch_number, recovery_key_id, sender_recovery_key_id, encapsulation, ciphertext, algorithm, key_version, protocol_version, envelope_payload, envelope_payload_hash, signature)
    values ((envelope->>'collection_id')::uuid, (envelope->>'epoch_number')::integer, p_new_recovery_key_id, p_new_recovery_key_id, decode(envelope->>'encapsulation','base64'), decode(envelope->>'ciphertext','base64'), 'hpke-x25519-hkdf-sha256-aes-256-gcm', next_version, 1, decode(envelope->>'payload','base64'), extensions.digest(decode(envelope->>'payload','base64'),'sha256'), decode(envelope->>'signature','base64'));
  end loop;
  insert into public.vault_account_operations (operation_id, account_id, sequence_number, operation_type, canonical_payload, previous_operation_hash, operation_hash, recovery_key_id, signature, protocol_version)
  values (p_operation_id, p_account_id, current_operation.sequence_number+1, 'recovery-rotate', p_authorization_payload, current_operation.operation_hash, p_command_hash, p_new_recovery_key_id, p_recovery_signature, 1);
  return true;
end; $$;
revoke all on function private.rotate_vault_recovery_root(uuid,uuid,uuid,uuid,uuid,bytea,bytea,bytea,bytea,bytea,jsonb,uuid,bytea,bytea) from public, anon, authenticated;

grant execute on function private.rotate_vault_recovery_root(uuid,uuid,uuid,uuid,uuid,bytea,bytea,bytea,bytea,bytea,jsonb,uuid,bytea,bytea) to service_role;
