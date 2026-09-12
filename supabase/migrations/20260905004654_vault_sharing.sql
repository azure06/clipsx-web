-- Vault Sharing baseline. Append future changes as new migrations.

create function private.create_vault_collection_invitation(
  p_account_id uuid, p_session_id uuid, p_device_id uuid, p_collection_id uuid,
  p_expected_collection_head bytea, p_invitation_id uuid, p_membership_id uuid,
  p_recipient_account_id uuid, p_requested_role public.vault_member_role,
  p_expires_at timestamptz, p_invitation_key_commitment bytea,
  p_verification_commitment bytea, p_operation_id uuid, p_command_payload bytea,
  p_command_hash bytea, p_command_signature bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_operation public.vault_collection_operations%rowtype;
  joining_epoch integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_collection_id::text, 2));
  select * into current_operation from public.vault_collection_operations
  where collection_id = p_collection_id order by sequence_number desc limit 1 for update;
  select current_epoch_number + 1 into joining_epoch from public.vault_collections
  where id = p_collection_id and deleted_at is null for update;

  if current_operation.operation_id is null or joining_epoch is null
     or current_operation.operation_hash is distinct from p_expected_collection_head
     or p_account_id = p_recipient_account_id or p_requested_role = 'owner'
     or p_expires_at <= now() or p_expires_at > now() + interval '30 days'
     or coalesce(octet_length(p_expected_collection_head), 0) <> 32
     or coalesce(octet_length(p_invitation_key_commitment), 0) <> 32
     or coalesce(octet_length(p_verification_commitment), 0) <> 32
     or coalesce(octet_length(p_command_hash), 0) <> 32 or coalesce(octet_length(p_command_signature), 0) <> 64
     or not exists (select 1 from auth.users where id = p_recipient_account_id)
     or not private.live_account_session(p_account_id, p_session_id)
     or not exists (
       select 1 from public.vault_devices d
       join public.vault_collection_memberships m on m.account_id = d.account_id
       where d.id = p_device_id and d.account_id = p_account_id and d.status = 'active'
         and m.collection_id = p_collection_id
         and m.status = 'active' and m.role = 'owner'
     )

     or exists (select 1 from public.vault_collection_invitations
       where id = p_invitation_id or invitation_key_commitment = p_invitation_key_commitment
         or verification_commitment = p_verification_commitment)
     or exists (select 1 from public.vault_collection_operations where operation_id = p_operation_id)
  then return false; end if;

  with expired as (
    update public.vault_collection_invitations set status = 'expired'
    where collection_id = p_collection_id and status = 'created' and expires_at <= now()
    returning membership_id
  )
  update public.vault_collection_memberships set status = 'expired'
  where id in (select membership_id from expired) and status = 'invited';
  if exists (select from public.vault_collection_memberships where collection_id = p_collection_id
    and account_id = p_recipient_account_id and status in ('invited', 'active')) then return false; end if;

  insert into public.vault_collection_memberships (
    id, collection_id, account_id, role, status, joined_epoch,
    history_access_from_epoch, invited_by_device_id, membership_operation_id
  ) values (
    p_membership_id, p_collection_id, p_recipient_account_id, p_requested_role,
    'invited', joining_epoch, joining_epoch, p_device_id, p_operation_id
  );
  insert into public.vault_collection_invitations (
    id, collection_id, membership_id, inviter_device_id, recipient_account_id,
    requested_role, verification_mode, status, expires_at,
    invitation_key_commitment, verification_commitment, invitation_payload,
    invitation_operation_hash, inviter_signature
  ) values (
    p_invitation_id, p_collection_id, p_membership_id, p_device_id,
    p_recipient_account_id, p_requested_role, 'verified', 'created', p_expires_at,
    p_invitation_key_commitment, p_verification_commitment, p_command_payload,
    p_command_hash, p_command_signature
  );
  insert into public.vault_collection_operations (
    operation_id, collection_id, sequence_number, operation_type, canonical_payload,
    previous_operation_hash, operation_hash, author_device_id, signature, protocol_version
  ) values (
    p_operation_id, p_collection_id, current_operation.sequence_number + 1,
    'invitation-create', p_command_payload, current_operation.operation_hash,
    p_command_hash, p_device_id, p_command_signature, 1
  );
  return true;
end;
$$;
revoke all on function private.create_vault_collection_invitation(
  uuid, uuid, uuid, uuid, bytea, uuid, uuid, uuid, public.vault_member_role,
  timestamptz, bytea, bytea, uuid, bytea, bytea, bytea
) from public, anon, authenticated;

create function private.accept_vault_collection_invitation(
  p_account_id uuid, p_session_id uuid, p_device_id uuid, p_collection_id uuid,
  p_expected_collection_head bytea, p_invitation_id uuid,
  p_invitation_command_hash bytea, p_verification_commitment bytea,
  p_acceptance_transcript_hash bytea,
  p_operation_id uuid, p_command_payload bytea, p_command_hash bytea,
  p_command_signature bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_operation public.vault_collection_operations%rowtype;
  invitation public.vault_collection_invitations%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_collection_id::text, 2));
  select * into current_operation from public.vault_collection_operations
  where collection_id = p_collection_id order by sequence_number desc limit 1 for update;
  select * into invitation from public.vault_collection_invitations
  where id = p_invitation_id and collection_id = p_collection_id for update;

  if current_operation.operation_id is null or invitation.id is null
     or current_operation.operation_hash is distinct from p_expected_collection_head
     or invitation.status <> 'created' or invitation.expires_at <= now()
     or invitation.recipient_account_id <> p_account_id
     or invitation.invitation_operation_hash is distinct from p_invitation_command_hash
     or invitation.verification_commitment is distinct from p_verification_commitment
     or invitation.acceptance_payload is not null
     or coalesce(octet_length(p_invitation_command_hash), 0) <> 32
     or coalesce(octet_length(p_verification_commitment), 0) <> 32
     or coalesce(octet_length(p_acceptance_transcript_hash), 0) <> 32
     or coalesce(octet_length(p_command_hash), 0) <> 32 or coalesce(octet_length(p_command_signature), 0) <> 64
     or not private.live_account_session(p_account_id, p_session_id)
     or not exists (
       select 1 from public.vault_devices d
       where d.id = p_device_id and d.account_id = p_account_id
         and d.status = 'active'
     )
     or exists (select 1 from public.vault_collection_operations where operation_id = p_operation_id)
  then return false; end if;

  update public.vault_collection_invitations
  set accepted_by_device_id = p_device_id, acceptance_payload = p_command_payload,
      acceptance_payload_hash = p_command_hash,
      acceptance_transcript_hash = p_acceptance_transcript_hash,
      acceptance_signature = p_command_signature
  where id = p_invitation_id;
  insert into public.vault_collection_operations (
    operation_id, collection_id, sequence_number, operation_type, canonical_payload,
    previous_operation_hash, operation_hash, author_device_id, signature, protocol_version
  ) values (
    p_operation_id, p_collection_id, current_operation.sequence_number + 1,
    'invitation-accept', p_command_payload, current_operation.operation_hash,
    p_command_hash, p_device_id, p_command_signature, 1
  );
  return true;
end;
$$;
revoke all on function private.accept_vault_collection_invitation(
  uuid, uuid, uuid, uuid, bytea, uuid, bytea, bytea, bytea, uuid, bytea, bytea, bytea
) from public, anon, authenticated;

create function private.confirm_vault_collection_invitation(
  p_account_id uuid, p_session_id uuid, p_device_id uuid, p_collection_id uuid,
  p_expected_collection_head bytea, p_invitation_id uuid,
  p_acceptance_payload_hash bytea, p_acceptance_transcript_hash bytea,
  p_verification_commitment bytea,
  p_operation_id uuid, p_command_payload bytea, p_command_hash bytea,
  p_command_signature bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_operation public.vault_collection_operations%rowtype;
  invitation public.vault_collection_invitations%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_collection_id::text, 2));
  select * into current_operation from public.vault_collection_operations
  where collection_id = p_collection_id order by sequence_number desc limit 1 for update;
  select * into invitation from public.vault_collection_invitations
  where id = p_invitation_id and collection_id = p_collection_id for update;

  if current_operation.operation_id is null or invitation.id is null
     or current_operation.operation_hash is distinct from p_expected_collection_head
     or invitation.status <> 'created' or invitation.expires_at <= now()
     or invitation.inviter_device_id <> p_device_id
     or invitation.acceptance_payload_hash is distinct from p_acceptance_payload_hash
     or invitation.acceptance_transcript_hash is distinct from p_acceptance_transcript_hash
     or invitation.verification_commitment is distinct from p_verification_commitment
     or invitation.confirmation_payload is not null
     or coalesce(octet_length(p_acceptance_payload_hash), 0) <> 32
     or coalesce(octet_length(p_acceptance_transcript_hash), 0) <> 32
     or coalesce(octet_length(p_verification_commitment), 0) <> 32
     or coalesce(octet_length(p_command_hash), 0) <> 32 or coalesce(octet_length(p_command_signature), 0) <> 64
     or not private.live_account_session(p_account_id, p_session_id)
     or not exists (
       select 1 from public.vault_devices d
       join public.vault_collection_memberships m on m.account_id = d.account_id
       where d.id = p_device_id and d.account_id = p_account_id and d.status = 'active'
         and m.collection_id = p_collection_id
         and m.status = 'active' and m.role = 'owner'
     )
     or exists (select 1 from public.vault_collection_operations where operation_id = p_operation_id)
  then return false; end if;

  update public.vault_collection_invitations
  set confirmation_payload = p_command_payload, confirmation_payload_hash = p_command_hash,
      confirmation_signature = p_command_signature
  where id = p_invitation_id;
  insert into public.vault_collection_operations (
    operation_id, collection_id, sequence_number, operation_type, canonical_payload,
    previous_operation_hash, operation_hash, author_device_id, signature, protocol_version
  ) values (
    p_operation_id, p_collection_id, current_operation.sequence_number + 1,
    'invitation-confirm', p_command_payload, current_operation.operation_hash,
    p_command_hash, p_device_id, p_command_signature, 1
  );
  return true;
end;
$$;
revoke all on function private.confirm_vault_collection_invitation(
  uuid, uuid, uuid, uuid, bytea, uuid, bytea, bytea, bytea, uuid, bytea, bytea, bytea
) from public, anon, authenticated;

create function private.add_vault_collection_member_and_rotate_epoch(
  p_account_id uuid, p_session_id uuid, p_device_id uuid, p_collection_id uuid,
  p_expected_collection_head bytea, p_invitation_id uuid, p_membership_id uuid,
  p_recipient_account_id uuid, p_requested_role public.vault_member_role,
  p_joined_epoch integer, p_history_access_from_epoch integer,
  p_membership_state_hash bytea, p_recipient_set_commitment bytea,
  p_transition_payload bytea, p_transition_signature bytea, p_transition_hash bytea,
  p_device_envelopes jsonb, p_recovery_envelopes jsonb,
  p_historical_device_envelopes jsonb, p_historical_recovery_envelopes jsonb,
  p_operation_id uuid, p_command_payload bytea, p_command_hash bytea,
  p_command_signature bytea, p_encrypted_metadata bytea, p_metadata_nonce bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_operation public.vault_collection_operations%rowtype;
  collection_row public.vault_collections%rowtype;
  invitation public.vault_collection_invitations%rowtype;
  device_envelope jsonb;
  recovery_envelope jsonb;
  expected_device_count integer;
  expected_recovery_count integer;
  history_epoch_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_collection_id::text, 2));
  select * into current_operation from public.vault_collection_operations
  where collection_id = p_collection_id order by sequence_number desc limit 1 for update;
  select * into collection_row from public.vault_collections
  where id = p_collection_id and deleted_at is null for update;
  select * into invitation from public.vault_collection_invitations
  where id = p_invitation_id and collection_id = p_collection_id for update;

  select count(*) into expected_device_count from public.vault_devices d
  where d.status = 'active' and (
    d.account_id = p_recipient_account_id or exists (
      select 1 from public.vault_collection_memberships m
      where m.collection_id = p_collection_id and m.account_id = d.account_id and m.status = 'active'
    )
  );
  select count(*) into expected_recovery_count from public.vault_recovery_keys k
  where k.status = 'active' and (
    k.account_id = p_recipient_account_id or exists (
      select 1 from public.vault_collection_memberships m
      where m.collection_id = p_collection_id and m.account_id = k.account_id and m.status = 'active'
    )
  );
  history_epoch_count := p_joined_epoch - p_history_access_from_epoch;

  if current_operation.operation_id is null or collection_row.id is null or invitation.id is null
     or current_operation.operation_hash is distinct from p_expected_collection_head
     or invitation.status <> 'created' or invitation.expires_at <= now()
     or invitation.membership_id <> p_membership_id
     or invitation.recipient_account_id <> p_recipient_account_id
     or invitation.requested_role <> p_requested_role or p_requested_role = 'owner'
     or invitation.acceptance_payload is null or invitation.confirmation_payload is null
     or p_joined_epoch <> collection_row.current_epoch_number + 1
     or p_history_access_from_epoch < 1 or p_history_access_from_epoch > p_joined_epoch
     or p_encrypted_metadata is null or coalesce(octet_length(p_encrypted_metadata), 0) not between 16 and 65536
     or p_metadata_nonce is null or coalesce(octet_length(p_metadata_nonce), 0) <> 12
     or coalesce(octet_length(p_expected_collection_head), 0) <> 32
     or coalesce(octet_length(p_membership_state_hash), 0) <> 32
     or coalesce(octet_length(p_recipient_set_commitment), 0) <> 32
     or coalesce(octet_length(p_transition_signature), 0) <> 64 or coalesce(octet_length(p_transition_hash), 0) <> 32
     or coalesce(octet_length(p_command_hash), 0) <> 32 or coalesce(octet_length(p_command_signature), 0) <> 64
     or not private.live_account_session(p_account_id, p_session_id)
     or not exists (
       select 1 from public.vault_devices d
       join public.vault_collection_memberships m on m.account_id = d.account_id
       where d.id = p_device_id and d.account_id = p_account_id and d.status = 'active'
         and m.collection_id = p_collection_id
         and m.status = 'active' and m.role = 'owner'
     )
     or not exists (
       select 1 from public.vault_collection_memberships m
       where m.id = p_membership_id and m.collection_id = p_collection_id
         and m.account_id = p_recipient_account_id and m.status = 'invited'
     )
     or coalesce(jsonb_typeof(p_device_envelopes), '') <> 'array'
     or coalesce(jsonb_typeof(p_recovery_envelopes), '') <> 'array'
     or coalesce(jsonb_typeof(p_historical_device_envelopes), '') <> 'array'
     or coalesce(jsonb_typeof(p_historical_recovery_envelopes), '') <> 'array'
     or jsonb_array_length(p_device_envelopes) <> expected_device_count
     or jsonb_array_length(p_recovery_envelopes) <> expected_recovery_count
     or (select count(distinct e->>'recipient_id') from jsonb_array_elements(p_device_envelopes) e) <> expected_device_count
     or (select count(distinct e->>'recipient_id') from jsonb_array_elements(p_recovery_envelopes) e) <> expected_recovery_count
     or exists (select 1 from jsonb_array_elements(p_device_envelopes) e where not exists (
       select 1 from public.vault_devices d where d.id::text = e->>'recipient_id' and d.status = 'active'
         and (d.account_id = p_recipient_account_id or exists (
           select 1 from public.vault_collection_memberships m where m.collection_id = p_collection_id
             and m.account_id = d.account_id and m.status = 'active'
         ))
     ))
     or exists (select 1 from jsonb_array_elements(p_recovery_envelopes) e where not exists (
       select 1 from public.vault_recovery_keys k where k.id::text = e->>'recipient_id' and k.status = 'active'
         and (k.account_id = p_recipient_account_id or exists (
           select 1 from public.vault_collection_memberships m where m.collection_id = p_collection_id
             and m.account_id = k.account_id and m.status = 'active'
         ))
     ))
     or jsonb_array_length(p_historical_device_envelopes) <> history_epoch_count * (
       select count(*) from public.vault_devices where account_id = p_recipient_account_id and status = 'active'
     )
     or jsonb_array_length(p_historical_recovery_envelopes) <> history_epoch_count * (
       select count(*) from public.vault_recovery_keys where account_id = p_recipient_account_id and status = 'active'
     )
     or (select count(distinct concat(e->>'recipient_id', ':', e->>'epoch_number'))
       from jsonb_array_elements(p_historical_device_envelopes) e)
       <> jsonb_array_length(p_historical_device_envelopes)
     or (select count(distinct concat(e->>'recipient_id', ':', e->>'epoch_number'))
       from jsonb_array_elements(p_historical_recovery_envelopes) e)
       <> jsonb_array_length(p_historical_recovery_envelopes)
     or exists (select 1 from jsonb_array_elements(p_historical_device_envelopes) e where
       (e->>'epoch_number')::integer < p_history_access_from_epoch
       or (e->>'epoch_number')::integer >= p_joined_epoch
       or not exists (select 1 from public.vault_collection_epochs ce
         where ce.collection_id = p_collection_id and ce.epoch_number = (e->>'epoch_number')::integer)
       or not exists (select 1 from public.vault_devices d
         where d.id::text = e->>'recipient_id' and d.account_id = p_recipient_account_id and d.status = 'active'))
     or exists (select 1 from jsonb_array_elements(p_historical_recovery_envelopes) e where
       (e->>'epoch_number')::integer < p_history_access_from_epoch
       or (e->>'epoch_number')::integer >= p_joined_epoch
       or not exists (select 1 from public.vault_collection_epochs ce
         where ce.collection_id = p_collection_id and ce.epoch_number = (e->>'epoch_number')::integer)
       or not exists (select 1 from public.vault_recovery_keys k
         where k.id::text = e->>'recipient_id' and k.account_id = p_recipient_account_id and k.status = 'active'))
     or exists (select 1 from public.vault_collection_operations where operation_id = p_operation_id)
  then return false; end if;

  update public.vault_collection_memberships
  set status = 'active', joined_at = now(), joined_epoch = p_joined_epoch,
      history_access_from_epoch = p_history_access_from_epoch,
      membership_operation_id = p_operation_id
  where id = p_membership_id;
  update public.vault_collection_invitations
  set status = 'accepted', accepted_at = now()
  where id = p_invitation_id;
  update public.vault_collection_epochs set state = 'superseded'
  where collection_id = p_collection_id and state = 'current';
  insert into public.vault_collection_epochs (
    collection_id, epoch_number, created_by_device_id, rotation_reason,
    previous_epoch_hash, membership_state_hash, recipient_set_commitment,
    transition_payload, transition_signature, transition_hash, state
  ) values (
    p_collection_id, p_joined_epoch, p_device_id, 'member-added',
    collection_row.current_epoch_transition_hash, p_membership_state_hash,
    p_recipient_set_commitment, p_transition_payload, p_transition_signature,
    p_transition_hash, 'current'
  );
  update public.vault_collections
  set current_epoch_number = p_joined_epoch,
      encrypted_metadata = p_encrypted_metadata, metadata_nonce = p_metadata_nonce,
      current_epoch_transition_hash = p_transition_hash,
      membership_log_head_hash = p_membership_state_hash
  where id = p_collection_id;
  for device_envelope in select * from jsonb_array_elements(p_device_envelopes) loop
    insert into public.vault_device_epoch_envelopes (
      collection_id, epoch_number, recipient_device_id, sender_device_id,
      encapsulation, ciphertext, algorithm, key_version, protocol_version,
      envelope_payload, envelope_payload_hash, signature
    ) values (
      p_collection_id, p_joined_epoch, (device_envelope->>'recipient_id')::uuid,
      p_device_id, decode(device_envelope->>'encapsulation', 'base64'),
      decode(device_envelope->>'ciphertext', 'base64'),
      'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1,
      decode(device_envelope->>'payload', 'base64'),
      extensions.digest(decode(device_envelope->>'payload', 'base64'), 'sha256'),
      decode(device_envelope->>'signature', 'base64')
    );
  end loop;
  for recovery_envelope in select * from jsonb_array_elements(p_recovery_envelopes) loop
    insert into public.vault_recovery_epoch_envelopes (
      collection_id, epoch_number, recovery_key_id, sender_device_id,
      encapsulation, ciphertext, algorithm, key_version, protocol_version,
      envelope_payload, envelope_payload_hash, signature
    ) values (
      p_collection_id, p_joined_epoch, (recovery_envelope->>'recipient_id')::uuid,
      p_device_id, decode(recovery_envelope->>'encapsulation', 'base64'),
      decode(recovery_envelope->>'ciphertext', 'base64'),
      'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1,
      decode(recovery_envelope->>'payload', 'base64'),
      extensions.digest(decode(recovery_envelope->>'payload', 'base64'), 'sha256'),
      decode(recovery_envelope->>'signature', 'base64')
    );
  end loop;
  for device_envelope in select * from jsonb_array_elements(p_historical_device_envelopes) loop
    insert into public.vault_device_epoch_envelopes (
      collection_id, epoch_number, recipient_device_id, sender_device_id,
      encapsulation, ciphertext, algorithm, key_version, protocol_version,
      envelope_payload, envelope_payload_hash, signature
    ) values (
      p_collection_id, (device_envelope->>'epoch_number')::integer,
      (device_envelope->>'recipient_id')::uuid, p_device_id,
      decode(device_envelope->>'encapsulation', 'base64'),
      decode(device_envelope->>'ciphertext', 'base64'),
      'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1,
      decode(device_envelope->>'payload', 'base64'),
      extensions.digest(decode(device_envelope->>'payload', 'base64'), 'sha256'),
      decode(device_envelope->>'signature', 'base64')
    );
  end loop;
  for recovery_envelope in select * from jsonb_array_elements(p_historical_recovery_envelopes) loop
    insert into public.vault_recovery_epoch_envelopes (
      collection_id, epoch_number, recovery_key_id, sender_device_id,
      encapsulation, ciphertext, algorithm, key_version, protocol_version,
      envelope_payload, envelope_payload_hash, signature
    ) values (
      p_collection_id, (recovery_envelope->>'epoch_number')::integer,
      (recovery_envelope->>'recipient_id')::uuid, p_device_id,
      decode(recovery_envelope->>'encapsulation', 'base64'),
      decode(recovery_envelope->>'ciphertext', 'base64'),
      'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1,
      decode(recovery_envelope->>'payload', 'base64'),
      extensions.digest(decode(recovery_envelope->>'payload', 'base64'), 'sha256'),
      decode(recovery_envelope->>'signature', 'base64')
    );
  end loop;
  insert into public.vault_collection_operations (
    operation_id, collection_id, sequence_number, operation_type, canonical_payload,
    previous_operation_hash, operation_hash, author_device_id, signature, protocol_version
  ) values (
    p_operation_id, p_collection_id, current_operation.sequence_number + 1,
    'member-add', p_command_payload, current_operation.operation_hash,
    p_command_hash, p_device_id, p_command_signature, 1
  );
  return true;
end;
$$;
revoke all on function private.add_vault_collection_member_and_rotate_epoch(
  uuid, uuid, uuid, uuid, bytea, uuid, uuid, uuid, public.vault_member_role,
  integer, integer, bytea, bytea, bytea, bytea, bytea, jsonb, jsonb, jsonb,
  jsonb, uuid, bytea, bytea, bytea
, bytea, bytea) from public, anon, authenticated;

create function private.remove_vault_collection_member_and_rotate_epoch(
  p_account_id uuid, p_session_id uuid, p_device_id uuid, p_collection_id uuid,
  p_expected_collection_head bytea, p_membership_id uuid,
  p_removed_account_id uuid, p_epoch_number integer,
  p_membership_state_hash bytea, p_recipient_set_commitment bytea,
  p_transition_payload bytea, p_transition_signature bytea, p_transition_hash bytea,
  p_device_envelopes jsonb, p_recovery_envelopes jsonb,
  p_operation_id uuid, p_command_payload bytea, p_command_hash bytea,
  p_command_signature bytea, p_encrypted_metadata bytea, p_metadata_nonce bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_operation public.vault_collection_operations%rowtype;
  collection_row public.vault_collections%rowtype;
  membership public.vault_collection_memberships%rowtype;
  device_envelope jsonb;
  recovery_envelope jsonb;
  expected_device_count integer;
  expected_recovery_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_collection_id::text, 2));
  select * into current_operation from public.vault_collection_operations
  where collection_id = p_collection_id order by sequence_number desc limit 1 for update;
  select * into collection_row from public.vault_collections
  where id = p_collection_id and deleted_at is null for update;
  select * into membership from public.vault_collection_memberships
  where id = p_membership_id and collection_id = p_collection_id for update;
  select count(*) into expected_device_count from public.vault_devices d
  where d.status = 'active' and exists (
    select 1 from public.vault_collection_memberships m
    where m.collection_id = p_collection_id and m.account_id = d.account_id
      and m.status = 'active' and m.id <> p_membership_id
  );
  select count(*) into expected_recovery_count from public.vault_recovery_keys k
  where k.status = 'active' and exists (
    select 1 from public.vault_collection_memberships m
    where m.collection_id = p_collection_id and m.account_id = k.account_id
      and m.status = 'active' and m.id <> p_membership_id
  );

  if current_operation.operation_id is null or collection_row.id is null or membership.id is null
     or current_operation.operation_hash is distinct from p_expected_collection_head
     or membership.account_id <> p_removed_account_id or membership.status <> 'active'
     or membership.role = 'owner' or p_removed_account_id = p_account_id
     or p_epoch_number <> collection_row.current_epoch_number + 1
     or p_encrypted_metadata is null or coalesce(octet_length(p_encrypted_metadata), 0) not between 16 and 65536
     or p_metadata_nonce is null or coalesce(octet_length(p_metadata_nonce), 0) <> 12
     or coalesce(octet_length(p_expected_collection_head), 0) <> 32
     or coalesce(octet_length(p_membership_state_hash), 0) <> 32
     or coalesce(octet_length(p_recipient_set_commitment), 0) <> 32
     or coalesce(octet_length(p_transition_signature), 0) <> 64 or coalesce(octet_length(p_transition_hash), 0) <> 32
     or coalesce(octet_length(p_command_hash), 0) <> 32 or coalesce(octet_length(p_command_signature), 0) <> 64
     or not private.live_account_session(p_account_id, p_session_id)
     or not exists (
       select 1 from public.vault_devices d
       join public.vault_collection_memberships m on m.account_id = d.account_id
       where d.id = p_device_id and d.account_id = p_account_id and d.status = 'active'
         and m.collection_id = p_collection_id
         and m.status = 'active' and m.role = 'owner'
     )
     or coalesce(jsonb_typeof(p_device_envelopes), '') <> 'array'
     or coalesce(jsonb_typeof(p_recovery_envelopes), '') <> 'array'
     or jsonb_array_length(p_device_envelopes) <> expected_device_count
     or jsonb_array_length(p_recovery_envelopes) <> expected_recovery_count
     or (select count(distinct e->>'recipient_id') from jsonb_array_elements(p_device_envelopes) e) <> expected_device_count
     or (select count(distinct e->>'recipient_id') from jsonb_array_elements(p_recovery_envelopes) e) <> expected_recovery_count
     or exists (select 1 from jsonb_array_elements(p_device_envelopes) e where not exists (
       select 1 from public.vault_devices d where d.id::text = e->>'recipient_id'
         and d.status = 'active' and d.account_id <> p_removed_account_id and exists (
           select 1 from public.vault_collection_memberships m
           where m.collection_id = p_collection_id and m.account_id = d.account_id
             and m.status = 'active' and m.id <> p_membership_id
         )
     ))
     or exists (select 1 from jsonb_array_elements(p_recovery_envelopes) e where not exists (
       select 1 from public.vault_recovery_keys k where k.id::text = e->>'recipient_id'
         and k.status = 'active' and k.account_id <> p_removed_account_id and exists (
           select 1 from public.vault_collection_memberships m
           where m.collection_id = p_collection_id and m.account_id = k.account_id
             and m.status = 'active' and m.id <> p_membership_id
         )
     ))
     or exists (select 1 from public.vault_collection_operations where operation_id = p_operation_id)
  then return false; end if;

  update public.vault_collection_memberships
  set status = 'removed', removed_at = now(), removed_epoch = p_epoch_number,
      membership_operation_id = p_operation_id
  where id = p_membership_id;
  update public.vault_collection_epochs set state = 'superseded'
  where collection_id = p_collection_id and state = 'current';
  insert into public.vault_collection_epochs (
    collection_id, epoch_number, created_by_device_id, rotation_reason,
    previous_epoch_hash, membership_state_hash, recipient_set_commitment,
    transition_payload, transition_signature, transition_hash, state
  ) values (
    p_collection_id, p_epoch_number, p_device_id, 'member-removed',
    collection_row.current_epoch_transition_hash, p_membership_state_hash,
    p_recipient_set_commitment, p_transition_payload, p_transition_signature,
    p_transition_hash, 'current'
  );
  update public.vault_collections
  set current_epoch_number = p_epoch_number,
      encrypted_metadata = p_encrypted_metadata, metadata_nonce = p_metadata_nonce,
      current_epoch_transition_hash = p_transition_hash,
      membership_log_head_hash = p_membership_state_hash
  where id = p_collection_id;
  for device_envelope in select * from jsonb_array_elements(p_device_envelopes) loop
    insert into public.vault_device_epoch_envelopes (
      collection_id, epoch_number, recipient_device_id, sender_device_id,
      encapsulation, ciphertext, algorithm, key_version, protocol_version,
      envelope_payload, envelope_payload_hash, signature
    ) values (
      p_collection_id, p_epoch_number, (device_envelope->>'recipient_id')::uuid,
      p_device_id, decode(device_envelope->>'encapsulation', 'base64'),
      decode(device_envelope->>'ciphertext', 'base64'),
      'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1,
      decode(device_envelope->>'payload', 'base64'),
      extensions.digest(decode(device_envelope->>'payload', 'base64'), 'sha256'),
      decode(device_envelope->>'signature', 'base64')
    );
  end loop;
  for recovery_envelope in select * from jsonb_array_elements(p_recovery_envelopes) loop
    insert into public.vault_recovery_epoch_envelopes (
      collection_id, epoch_number, recovery_key_id, sender_device_id,
      encapsulation, ciphertext, algorithm, key_version, protocol_version,
      envelope_payload, envelope_payload_hash, signature
    ) values (
      p_collection_id, p_epoch_number, (recovery_envelope->>'recipient_id')::uuid,
      p_device_id, decode(recovery_envelope->>'encapsulation', 'base64'),
      decode(recovery_envelope->>'ciphertext', 'base64'),
      'hpke-x25519-hkdf-sha256-aes-256-gcm', 1, 1,
      decode(recovery_envelope->>'payload', 'base64'),
      extensions.digest(decode(recovery_envelope->>'payload', 'base64'), 'sha256'),
      decode(recovery_envelope->>'signature', 'base64')
    );
  end loop;
  insert into public.vault_collection_operations (
    operation_id, collection_id, sequence_number, operation_type, canonical_payload,
    previous_operation_hash, operation_hash, author_device_id, signature, protocol_version
  ) values (
    p_operation_id, p_collection_id, current_operation.sequence_number + 1,
    'member-remove', p_command_payload, current_operation.operation_hash,
    p_command_hash, p_device_id, p_command_signature, 1
  );
  return true;
end;
$$;
revoke all on function private.remove_vault_collection_member_and_rotate_epoch(
  uuid, uuid, uuid, uuid, bytea, uuid, uuid, integer, bytea, bytea, bytea,
  bytea, bytea, jsonb, jsonb, uuid, bytea, bytea, bytea
, bytea, bytea) from public, anon, authenticated;

grant execute on function private.create_vault_collection_invitation( uuid, uuid, uuid, uuid, bytea, uuid, uuid, uuid, public.vault_member_role, timestamptz, bytea, bytea, uuid, bytea, bytea, bytea ) to service_role;
grant execute on function private.accept_vault_collection_invitation( uuid, uuid, uuid, uuid, bytea, uuid, bytea, bytea, bytea, uuid, bytea, bytea, bytea ) to service_role;
grant execute on function private.confirm_vault_collection_invitation( uuid, uuid, uuid, uuid, bytea, uuid, bytea, bytea, bytea, uuid, bytea, bytea, bytea ) to service_role;
grant execute on function private.add_vault_collection_member_and_rotate_epoch( uuid, uuid, uuid, uuid, bytea, uuid, uuid, uuid, public.vault_member_role, integer, integer, bytea, bytea, bytea, bytea, bytea, jsonb, jsonb, jsonb, jsonb, uuid, bytea, bytea, bytea , bytea, bytea) to service_role;
grant execute on function private.remove_vault_collection_member_and_rotate_epoch( uuid, uuid, uuid, uuid, bytea, uuid, uuid, integer, bytea, bytea, bytea, bytea, bytea, jsonb, jsonb, uuid, bytea, bytea, bytea , bytea, bytea) to service_role;


-- Capacity is measured conservatively as serialized row bytes, including
-- retained ciphertext in both signed ledgers. Counters participate in the
-- command transaction and do not reuse account/collection advisory locks.
create table private.vault_storage_usage (
  scope_kind text not null check(scope_kind in ('account','collection')),
  scope_id uuid not null,
  retained_bytes bigint not null default 0 check(retained_bytes >= 0),
  updated_at timestamptz not null default now(),
  primary key(scope_kind,scope_id)
);
alter table private.vault_storage_usage enable row level security;
revoke all on private.vault_storage_usage from public,anon,authenticated;
grant select on private.vault_storage_usage to service_role;

create function private.enforce_vault_capacity() returns trigger
language plpgsql security definer set search_path='' set timezone='UTC' set datestyle='ISO,YMD' as $$
declare
  before_row jsonb; after_row jsonb; scope uuid; previous_scope uuid;
  delta bigint; row_count bigint; capacity bigint;
begin
  if tg_op <> 'INSERT' then before_row := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then after_row := to_jsonb(new); end if;
  scope := coalesce(after_row->>tg_argv[1],before_row->>tg_argv[1])::uuid;
  previous_scope := (before_row->>tg_argv[1])::uuid;
  if previous_scope is not null and scope <> previous_scope then raise exception 'vault_scope_immutable'; end if;
  delta := coalesce(octet_length(after_row::text),0)-coalesce(octet_length(before_row::text),0);
  capacity := case when tg_argv[0]='collection' then 33554432 else 16777216 end;
  if tg_argv[0]='account' and exists(select 1 from private.account_principals where id=scope and closed_at is not null) then
    if tg_op='INSERT' then raise exception 'account_closed'; end if;
    capacity:=9223372036854775807;
  end if;
  insert into private.vault_storage_usage(scope_kind,scope_id,retained_bytes)
  values(tg_argv[0],scope,greatest(delta,0))
  on conflict(scope_kind,scope_id) do update
    set retained_bytes=private.vault_storage_usage.retained_bytes+delta, updated_at=now()
    where delta<=0 or private.vault_storage_usage.retained_bytes+delta<=capacity;
  if not found then raise exception 'vault_storage_limit'; end if;
  if delta>capacity then raise exception 'vault_storage_limit'; end if;
  if tg_op='INSERT' then
    execute format('select count(*) from %I.%I where %I=$1',tg_table_schema,tg_table_name,tg_argv[1]) into row_count using scope;
    if row_count>tg_argv[2]::bigint then raise exception 'vault_record_limit'; end if;
  end if;
  return null;
end; $$;
revoke all on function private.enforce_vault_capacity() from public,anon,authenticated;

create trigger vault_capacity after insert or update or delete on public.vault_collections
for each row execute function private.enforce_vault_capacity('account','owner_account_id','16');
create trigger vault_capacity after insert or update or delete on public.vault_devices
for each row execute function private.enforce_vault_capacity('account','account_id','64');
create trigger vault_capacity after insert or update or delete on public.vault_recovery_keys
for each row execute function private.enforce_vault_capacity('account','account_id','64');
create trigger vault_capacity after insert or update or delete on public.vault_device_authorizations
for each row execute function private.enforce_vault_capacity('account','account_id','64');
create trigger vault_capacity after insert or update or delete on public.vault_account_operations
for each row execute function private.enforce_vault_capacity('account','account_id','20000');
create trigger vault_capacity after insert or update or delete on private.vault_device_registration_challenges
for each row execute function private.enforce_vault_capacity('account','account_id','64');
create trigger vault_capacity after insert or update or delete on private.vault_pending_device_registrations
for each row execute function private.enforce_vault_capacity('account','account_id','64');
create trigger vault_capacity after insert or update or delete on public.vault_collection_epochs
for each row execute function private.enforce_vault_capacity('collection','collection_id','32');
create trigger vault_capacity after insert or update or delete on public.vault_collection_memberships
for each row execute function private.enforce_vault_capacity('collection','collection_id','256');
create trigger vault_capacity after insert or update or delete on public.vault_collection_invitations
for each row execute function private.enforce_vault_capacity('collection','collection_id','256');
create trigger vault_capacity after insert or update or delete on public.vault_device_epoch_envelopes
for each row execute function private.enforce_vault_capacity('collection','collection_id','16384');
create trigger vault_capacity after insert or update or delete on public.vault_recovery_epoch_envelopes
for each row execute function private.enforce_vault_capacity('collection','collection_id','1024');
create trigger vault_capacity after insert or update or delete on public.vault_collection_operations
for each row execute function private.enforce_vault_capacity('collection','collection_id','20000');
create trigger vault_capacity after insert or update or delete on public.vault_notes
for each row execute function private.enforce_vault_capacity('collection','collection_id','10000');
create trigger vault_capacity after insert or update or delete on public.vault_note_revisions
for each row execute function private.enforce_vault_capacity('collection','collection_id','20000');
create trigger vault_capacity after insert or update or delete on public.vault_tombstones
for each row execute function private.enforce_vault_capacity('collection','collection_id','10000');

-- Expired transient registration data is not part of signed history. Bounded
-- batches keep maintenance transactions short and avoid blocking live approval.
create function private.cleanup_vault_registrations(p_limit integer default 1000)
returns integer language plpgsql security definer set search_path='' as $$
declare removed integer; total integer:=0;
begin
  if p_limit is null or p_limit not between 1 and 1000 then raise exception 'invalid_cleanup_limit'; end if;
  if not pg_try_advisory_xact_lock(hashtextextended('vault-registration-cleanup',3)) then return 0; end if;
  with candidates as(select id from private.vault_device_registration_challenges where expires_at<now() order by expires_at limit p_limit for update skip locked)
    delete from private.vault_device_registration_challenges where id in(select id from candidates);
  get diagnostics removed=row_count; total:=total+removed;
  with candidates as(select device_id from private.vault_pending_device_registrations where expires_at<now() order by expires_at limit p_limit for update skip locked)
    delete from private.vault_pending_device_registrations where device_id in(select device_id from candidates);
  get diagnostics removed=row_count;
  return total+removed;
end; $$;
revoke all on function private.cleanup_vault_registrations(integer) from public,anon,authenticated;
grant execute on function private.cleanup_vault_registrations(integer) to service_role;


-- Every browser vault read checks the live Auth session, including JWTs issued
-- before account closure. Historical public principals alone grant no access.
create function private.vault_session_active() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.sessions s join private.account_principals p on p.auth_user_id=s.user_id
    where s.user_id=(select auth.uid()) and s.id::text=(select auth.jwt()->>'session_id')
      and (s.not_after is null or s.not_after>now()) and p.closed_at is null);
$$;
revoke all on function private.vault_session_active() from public,anon;
grant execute on function private.vault_session_active() to authenticated,service_role;
do $$ declare policy record; begin
  for policy in select schemaname,tablename,policyname,qual from pg_policies
    where schemaname='public' and tablename like 'vault_%' and 'authenticated'=any(roles)
  loop
    execute format('alter policy %I on %I.%I using ((%s) and (select private.vault_session_active()))',policy.policyname,policy.schemaname,policy.tablename,policy.qual);
  end loop;
end $$;

create function private.close_account(p_account_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare affected uuid;
begin
  if p_account_id is null then raise exception 'account_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text,1));
  if not exists(select 1 from private.account_principals where id=p_account_id) then return false; end if;
  if exists(select 1 from private.billing_subscriptions s join private.billing_accounts a on a.id=s.billing_account_id
    where a.owner_user_id=p_account_id and s.status not in ('canceled','incomplete_expired')) then
    raise exception 'cancel_subscriptions_before_closure';
  end if;
  if exists(select 1 from private.organizations where created_by_user_id=p_account_id) then
    raise exception 'transfer_organization_before_closure';
  end if;
  for affected in select c.id from public.vault_collections c where c.owner_account_id=p_account_id
    or exists(select 1 from public.vault_collection_memberships m where m.collection_id=c.id and m.account_id=p_account_id and m.status='active') order by c.id
  loop perform pg_advisory_xact_lock(hashtextextended(affected::text,2)); end loop;
  update private.account_principals set closed_at=coalesce(closed_at,now()),updated_at=now() where id=p_account_id;
  update auth.users set banned_until='infinity'::timestamptz where id=p_account_id;
  delete from auth.sessions where user_id=p_account_id;
  delete from public.sync_profiles where user_id=p_account_id;
  delete from private.vault_pending_device_registrations where account_id=p_account_id;
  delete from private.vault_device_registration_challenges where account_id=p_account_id;
  -- Foreign-owned history stays verifiable. Stop new ciphertext until its
  -- owner signs the member-removal rotation; the server cannot rotate keys.
  update public.vault_collections c set requires_epoch_rotation=true where c.owner_account_id<>p_account_id
    and exists(select 1 from public.vault_collection_memberships m where m.collection_id=c.id and m.account_id=p_account_id and m.status='active');
  delete from public.vault_tombstones where collection_id in(select id from public.vault_collections where owner_account_id=p_account_id);
  delete from public.vault_note_revisions where collection_id in(select id from public.vault_collections where owner_account_id=p_account_id);
  delete from public.vault_collection_invitations where collection_id in(select id from public.vault_collections where owner_account_id=p_account_id);
  delete from public.vault_collections where owner_account_id=p_account_id;
  delete from public.vault_account_operations where account_id=p_account_id;
  delete from public.vault_device_authorizations where account_id=p_account_id;
  update public.vault_devices set status='revoked',revoked_at=coalesce(revoked_at,now()),display_name='Deleted account' where account_id=p_account_id;
  update public.vault_recovery_keys set status='revoked',revoked_at=coalesce(revoked_at,now()) where account_id=p_account_id;
  update private.billing_accounts set status='closed' where owner_user_id=p_account_id;
  update private.account_entitlements set status='read_only' where billing_account_id in(select id from private.billing_accounts where owner_user_id=p_account_id);
  delete from private.organization_memberships where user_id=p_account_id;
  return true;
end; $$;
revoke all on function private.close_account(uuid) from public,anon,authenticated;
grant execute on function private.close_account(uuid) to service_role;

create function private.refresh_vault_rotation_fence() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.current_epoch_number>old.current_epoch_number then
    new.requires_epoch_rotation:=exists(select 1 from public.vault_collection_memberships m join private.account_principals p on p.id=m.account_id
      where m.collection_id=new.id and m.status='active' and p.closed_at is not null);
  end if;
  return new;
end; $$;
revoke all on function private.refresh_vault_rotation_fence() from public,anon,authenticated;
create trigger vault_rotation_fence before update on public.vault_collections for each row execute function private.refresh_vault_rotation_fence();
