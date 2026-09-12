-- Vault Content baseline. Append future changes as new migrations.

create function private.create_vault_collection(
  p_account_id uuid, p_session_id uuid, p_device_id uuid, p_collection_id uuid,
  p_expected_account_head bytea,
  p_encrypted_metadata bytea, p_metadata_nonce bytea, p_membership_state_hash bytea,
  p_recipient_set_commitment bytea, p_transition_payload bytea, p_transition_signature bytea,
  p_transition_hash bytea, p_device_envelope_enc bytea, p_device_envelope_ciphertext bytea,
  p_device_envelope_payload bytea, p_device_envelope_signature bytea, p_recovery_key_id uuid,
  p_recovery_envelope_enc bytea, p_recovery_envelope_ciphertext bytea,
  p_recovery_envelope_payload bytea, p_recovery_envelope_signature bytea,
  p_operation_id uuid, p_command_payload bytea, p_command_hash bytea, p_command_signature bytea,
  p_additional_device_envelopes jsonb default '[]'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_account_operation public.vault_account_operations%rowtype;
  envelope jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 1));
  perform pg_advisory_xact_lock(hashtextextended(p_collection_id::text, 2));
  select * into current_account_operation from public.vault_account_operations
  where account_id = p_account_id order by sequence_number desc limit 1 for update;
  if not found or current_account_operation.operation_hash <> p_expected_account_head
     or octet_length(p_expected_account_head) <> 32
     or octet_length(p_metadata_nonce) <> 12 or octet_length(p_membership_state_hash) <> 32
     or octet_length(p_recipient_set_commitment) <> 32 or octet_length(p_transition_hash) <> 32
     or octet_length(p_transition_signature) <> 64 or octet_length(p_device_envelope_enc) <> 32
     or octet_length(p_recovery_envelope_enc) <> 32 or octet_length(p_device_envelope_signature) <> 64
     or octet_length(p_recovery_envelope_signature) <> 64 or octet_length(p_command_hash) <> 32
     or octet_length(p_command_signature) <> 64 or octet_length(p_encrypted_metadata) < 16
     or octet_length(p_device_envelope_ciphertext) < 16 or octet_length(p_recovery_envelope_ciphertext) < 16 then
    return false;
  end if;

  if not exists (
    select 1 from public.vault_devices d
    where d.id = p_device_id and d.account_id = p_account_id and d.status = 'active'
  ) or not exists (
    select 1 from auth.sessions s where s.id = p_session_id and s.user_id = p_account_id
  ) or not exists (
    select 1 from public.vault_recovery_keys where id = p_recovery_key_id and account_id = p_account_id and status = 'active'
  ) or exists (select 1 from public.vault_collections where id = p_collection_id)
    or exists (select 1 from public.vault_collection_operations where operation_id = p_operation_id)
    or exists (select 1 from public.vault_account_operations where operation_id = p_operation_id) then
    return false;
  end if;

  if coalesce(jsonb_typeof(p_additional_device_envelopes), '') <> 'array'
    or jsonb_array_length(p_additional_device_envelopes) <> (select count(*) from public.vault_devices where account_id=p_account_id and status='active' and id<>p_device_id)
    or (select count(distinct e->>'recipient_id') from jsonb_array_elements(p_additional_device_envelopes) e) <> jsonb_array_length(p_additional_device_envelopes)
    or exists(select 1 from jsonb_array_elements(p_additional_device_envelopes) e where not exists(
      select 1 from public.vault_devices where account_id=p_account_id and status='active' and id<>p_device_id and id::text=e->>'recipient_id'
    )) then return false; end if;

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
    'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1, p_device_envelope_payload, extensions.digest(p_device_envelope_payload, 'sha256'), p_device_envelope_signature
  );
  for envelope in select * from jsonb_array_elements(p_additional_device_envelopes) loop
    insert into public.vault_device_epoch_envelopes (
      collection_id, epoch_number, recipient_device_id, sender_device_id, encapsulation, ciphertext,
      algorithm, key_version, protocol_version, envelope_payload, envelope_payload_hash, signature
    ) values (
      p_collection_id, 1, (envelope->>'recipient_id')::uuid, p_device_id,
      decode(envelope->>'encapsulation','base64'), decode(envelope->>'ciphertext','base64'),
      'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1, decode(envelope->>'payload','base64'),
      extensions.digest(decode(envelope->>'payload','base64'),'sha256'), decode(envelope->>'signature','base64')
    );
  end loop;
  insert into public.vault_recovery_epoch_envelopes (
    collection_id, epoch_number, recovery_key_id, sender_device_id, encapsulation, ciphertext,
    algorithm, key_version, protocol_version, envelope_payload, envelope_payload_hash, signature
  ) values (
    p_collection_id, 1, p_recovery_key_id, p_device_id, p_recovery_envelope_enc, p_recovery_envelope_ciphertext,
    'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1, p_recovery_envelope_payload, extensions.digest(p_recovery_envelope_payload, 'sha256'), p_recovery_envelope_signature
  );
  insert into public.vault_collection_operations (
    operation_id, collection_id, sequence_number, operation_type, canonical_payload, operation_hash,
    author_device_id, signature, protocol_version
  ) values (
    p_operation_id, p_collection_id, 1, 'collection-create', p_command_payload, p_command_hash,
    p_device_id, p_command_signature, 1
  );
  insert into public.vault_account_operations (
    operation_id, account_id, sequence_number, operation_type, canonical_payload,
    previous_operation_hash, operation_hash, author_device_id, signature, protocol_version
  ) values (
    p_operation_id, p_account_id, current_account_operation.sequence_number + 1,
    'collection-create', p_command_payload, current_account_operation.operation_hash,
    p_command_hash, p_device_id, p_command_signature, 1
  );
  return true;
end;
$$;

revoke all on function private.create_vault_collection(
  uuid, uuid, uuid, uuid, bytea, bytea, bytea, bytea, bytea, bytea, bytea, bytea,
  bytea, bytea, bytea, bytea, uuid, bytea, bytea, bytea, bytea, uuid, bytea, bytea, bytea, jsonb
) from public, anon, authenticated;

-- Only the route handler reaches this transaction after validating the outer
-- command and immutable-revision signatures.  It receives opaque ciphertext.

create function private.append_vault_note_revision(
  p_account_id uuid, p_session_id uuid, p_device_id uuid, p_collection_id uuid,
  p_expected_account_head bytea, p_expected_collection_head bytea, p_note_id uuid,
  p_expected_previous_revision_hash bytea, p_collection_epoch integer,
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
  current_account_operation public.vault_account_operations%rowtype;
  current_note public.vault_notes%rowtype;
  note_exists boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 1));
  perform pg_advisory_xact_lock(hashtextextended(p_collection_id::text, 2));
  if exists(select 1 from public.vault_collections where id=p_collection_id and requires_epoch_rotation) then raise exception 'collection_rotation_required'; end if;
  if octet_length(p_expected_account_head) <> 32
     or octet_length(p_expected_collection_head) <> 32 or p_collection_epoch < 1
     or octet_length(p_encrypted_content) not between 16 and 1048576
     or octet_length(p_content_nonce) <> 12 or octet_length(p_wrapped_revision_key) < 16
     or octet_length(p_key_wrap_nonce) <> 12 or octet_length(p_ciphertext_hash) <> 32
     or octet_length(p_wrapped_revision_key_hash) <> 32 or octet_length(p_revision_hash) <> 32
     or octet_length(p_revision_signature) <> 64 or octet_length(p_command_hash) <> 32
     or octet_length(p_command_signature) <> 64 then return false;
  end if;

  select * into current_account_operation from public.vault_account_operations
  where account_id = p_account_id order by sequence_number desc limit 1 for update;
  if not found or current_account_operation.operation_hash <> p_expected_account_head then return false; end if;
  select * into current_operation from public.vault_collection_operations
  where collection_id = p_collection_id order by sequence_number desc limit 1 for update;
  if not found then return false; end if;
  select * into current_note from public.vault_notes where id = p_note_id and collection_id = p_collection_id for update;
  note_exists := found;
  if current_operation.operation_hash <> p_expected_collection_head
     or exists (select 1 from public.vault_collection_operations where operation_id = p_operation_id)
     or exists (select 1 from public.vault_account_operations where operation_id = p_operation_id)
     or not exists (
       select 1 from public.vault_devices d
       where d.id = p_device_id and d.account_id = p_account_id and d.status = 'active'
     ) or not exists (
       select 1 from auth.sessions s where s.id = p_session_id and s.user_id = p_account_id
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
    wrapped_revision_key, key_wrap_nonce, key_version, protocol_version, associated_data_version,
    ciphertext_hash, wrapped_revision_key_hash, previous_revision_hash, revision_hash,
    author_device_id, author_signature, operation_id, operation_type, logical_clock
  ) values (
    p_note_id, p_collection_id, case when note_exists then current_note.current_revision + 1 else 1 end, p_collection_epoch, p_encrypted_content, p_content_nonce,
    p_wrapped_revision_key, p_key_wrap_nonce, 1, 1, 1,
    p_ciphertext_hash, p_wrapped_revision_key_hash, p_expected_previous_revision_hash, p_revision_hash,
    p_device_id, p_revision_signature, p_operation_id, case when note_exists then 'update' else 'create' end, case when note_exists then current_note.current_revision else 0 end
  );
  insert into public.vault_collection_operations (
    operation_id, collection_id, sequence_number, operation_type, canonical_payload, previous_operation_hash,
    operation_hash, author_device_id, signature, protocol_version
  ) values (
    p_operation_id, p_collection_id, current_operation.sequence_number + 1, 'item-append', p_command_payload, current_operation.operation_hash,
    p_command_hash, p_device_id, p_command_signature, 1
  );
  insert into public.vault_account_operations (
    operation_id, account_id, sequence_number, operation_type, canonical_payload,
    previous_operation_hash, operation_hash, author_device_id, signature, protocol_version
  ) values (
    p_operation_id, p_account_id, current_account_operation.sequence_number + 1,
    'item-append', p_command_payload, current_account_operation.operation_hash,
    p_command_hash, p_device_id, p_command_signature, 1
  );
  return true;
end;
$$;

revoke all on function private.append_vault_note_revision(
  uuid, uuid, uuid, uuid, bytea, bytea, uuid, bytea, integer, bytea, bytea, bytea, bytea,
  bytea, bytea, bytea, bytea, uuid, bytea, bytea, bytea
) from public, anon, authenticated;

-- Deletion retains only an authenticated non-secret tombstone. The route has
-- already verified the device-signed canonical command before this transaction.

create function private.delete_vault_note(
  p_account_id uuid, p_session_id uuid, p_device_id uuid, p_collection_id uuid,
  p_expected_account_head bytea, p_expected_collection_head bytea, p_note_id uuid, p_expected_revision_hash bytea,
  p_operation_id uuid, p_command_payload bytea, p_command_hash bytea, p_command_signature bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_operation public.vault_collection_operations%rowtype;
  current_account_operation public.vault_account_operations%rowtype;
  current_note public.vault_notes%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 1));
  perform pg_advisory_xact_lock(hashtextextended(p_collection_id::text, 2));
  if octet_length(p_expected_account_head) <> 32
     or octet_length(p_expected_collection_head) <> 32 or octet_length(p_expected_revision_hash) <> 32
     or octet_length(p_command_hash) <> 32 or octet_length(p_command_signature) <> 64 then return false;
  end if;

  select * into current_account_operation from public.vault_account_operations
  where account_id = p_account_id order by sequence_number desc limit 1 for update;
  if not found or current_account_operation.operation_hash <> p_expected_account_head then return false; end if;
  select * into current_operation from public.vault_collection_operations
  where collection_id = p_collection_id order by sequence_number desc limit 1 for update;
  if not found then return false; end if;
  select * into current_note from public.vault_notes
  where id = p_note_id and collection_id = p_collection_id for update;
  if not found or current_note.deleted_at is not null
     or current_operation.operation_hash <> p_expected_collection_head
     or current_note.current_revision_hash <> p_expected_revision_hash
     or exists (select 1 from public.vault_collection_operations where operation_id = p_operation_id)
     or exists (select 1 from public.vault_account_operations where operation_id = p_operation_id)
     or exists (select 1 from public.vault_tombstones where note_id = p_note_id)
     or not exists (
       select 1 from public.vault_devices d
       where d.id = p_device_id and d.account_id = p_account_id and d.status = 'active'
     ) or not exists (
       select 1 from auth.sessions s where s.id = p_session_id and s.user_id = p_account_id
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
    p_operation_id, p_collection_id, current_operation.sequence_number + 1, 'item-delete', p_command_payload, current_operation.operation_hash,
    p_command_hash, p_device_id, p_command_signature, 1
  );
  insert into public.vault_account_operations (
    operation_id, account_id, sequence_number, operation_type, canonical_payload,
    previous_operation_hash, operation_hash, author_device_id, signature, protocol_version
  ) values (
    p_operation_id, p_account_id, current_account_operation.sequence_number + 1,
    'item-delete', p_command_payload, current_account_operation.operation_hash,
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
  uuid, uuid, uuid, uuid, bytea, bytea, uuid, bytea, uuid, bytea, bytea, bytea
) from public, anon, authenticated;

-- Invitation evidence is deliberately split from membership activation.  The
-- URL-fragment secret never reaches this function; only its commitments do.

grant execute on function private.create_vault_collection( uuid, uuid, uuid, uuid, bytea, bytea, bytea, bytea, bytea, bytea, bytea, bytea, bytea, bytea, bytea, bytea, uuid, bytea, bytea, bytea, bytea, uuid, bytea, bytea, bytea, jsonb ) to service_role;
grant execute on function private.append_vault_note_revision( uuid, uuid, uuid, uuid, bytea, bytea, uuid, bytea, integer, bytea, bytea, bytea, bytea, bytea, bytea, bytea, bytea, uuid, bytea, bytea, bytea ) to service_role;
grant execute on function private.delete_vault_note( uuid, uuid, uuid, uuid, bytea, bytea, uuid, bytea, uuid, bytea, bytea, bytea ) to service_role;
