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
     or current_operation.operation_hash <> p_expected_collection_head
     or p_account_id = p_recipient_account_id or p_requested_role = 'owner'
     or p_expires_at <= now() or p_expires_at > now() + interval '30 days'
     or octet_length(p_expected_collection_head) <> 32
     or octet_length(p_invitation_key_commitment) <> 32
     or octet_length(p_verification_commitment) <> 32
     or octet_length(p_command_hash) <> 32 or octet_length(p_command_signature) <> 64
     or not exists (select 1 from auth.users where id = p_recipient_account_id)
     or not exists (
       select 1 from public.vault_devices d
       join auth.sessions s on s.id = d.auth_session_id and s.user_id = d.account_id
       join public.vault_collection_memberships m on m.account_id = d.account_id
       where d.id = p_device_id and d.account_id = p_account_id and d.status = 'active'
         and d.auth_session_id = p_session_id and m.collection_id = p_collection_id
         and m.status = 'active' and m.role = 'owner'
     )
     or exists (select 1 from public.vault_collection_memberships
       where collection_id = p_collection_id and account_id = p_recipient_account_id
         and status in ('invited', 'active'))
     or exists (select 1 from public.vault_collection_invitations
       where id = p_invitation_id or invitation_key_commitment = p_invitation_key_commitment
         or verification_commitment = p_verification_commitment)
     or exists (select 1 from public.vault_collection_operations where operation_id = p_operation_id)
  then return false; end if;

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
     or current_operation.operation_hash <> p_expected_collection_head
     or invitation.status <> 'created' or invitation.expires_at <= now()
     or invitation.recipient_account_id <> p_account_id
     or invitation.invitation_operation_hash <> p_invitation_command_hash
     or invitation.verification_commitment <> p_verification_commitment
     or invitation.acceptance_payload is not null
     or octet_length(p_invitation_command_hash) <> 32
     or octet_length(p_verification_commitment) <> 32
     or octet_length(p_acceptance_transcript_hash) <> 32
     or octet_length(p_command_hash) <> 32 or octet_length(p_command_signature) <> 64
     or not exists (
       select 1 from public.vault_devices d join auth.sessions s
         on s.id = d.auth_session_id and s.user_id = d.account_id
       where d.id = p_device_id and d.account_id = p_account_id
         and d.status = 'active' and d.auth_session_id = p_session_id
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
     or current_operation.operation_hash <> p_expected_collection_head
     or invitation.status <> 'created' or invitation.expires_at <= now()
     or invitation.inviter_device_id <> p_device_id
     or invitation.acceptance_payload_hash <> p_acceptance_payload_hash
     or invitation.acceptance_transcript_hash <> p_acceptance_transcript_hash
     or invitation.verification_commitment <> p_verification_commitment
     or invitation.confirmation_payload is not null
     or octet_length(p_acceptance_payload_hash) <> 32
     or octet_length(p_acceptance_transcript_hash) <> 32
     or octet_length(p_verification_commitment) <> 32
     or octet_length(p_command_hash) <> 32 or octet_length(p_command_signature) <> 64
     or not exists (
       select 1 from public.vault_devices d
       join auth.sessions s on s.id = d.auth_session_id and s.user_id = d.account_id
       join public.vault_collection_memberships m on m.account_id = d.account_id
       where d.id = p_device_id and d.account_id = p_account_id and d.status = 'active'
         and d.auth_session_id = p_session_id and m.collection_id = p_collection_id
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
  p_command_signature bytea
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
     or current_operation.operation_hash <> p_expected_collection_head
     or invitation.status <> 'created' or invitation.expires_at <= now()
     or invitation.membership_id <> p_membership_id
     or invitation.recipient_account_id <> p_recipient_account_id
     or invitation.requested_role <> p_requested_role or p_requested_role = 'owner'
     or invitation.acceptance_payload is null or invitation.confirmation_payload is null
     or p_joined_epoch <> collection_row.current_epoch_number + 1
     or p_history_access_from_epoch < 1 or p_history_access_from_epoch > p_joined_epoch
     or octet_length(p_expected_collection_head) <> 32
     or octet_length(p_membership_state_hash) <> 32
     or octet_length(p_recipient_set_commitment) <> 32
     or octet_length(p_transition_signature) <> 64 or octet_length(p_transition_hash) <> 32
     or octet_length(p_command_hash) <> 32 or octet_length(p_command_signature) <> 64
     or not exists (
       select 1 from public.vault_devices d
       join auth.sessions s on s.id = d.auth_session_id and s.user_id = d.account_id
       join public.vault_collection_memberships m on m.account_id = d.account_id
       where d.id = p_device_id and d.account_id = p_account_id and d.status = 'active'
         and d.auth_session_id = p_session_id and m.collection_id = p_collection_id
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
) from public, anon, authenticated;

create function private.remove_vault_collection_member_and_rotate_epoch(
  p_account_id uuid, p_session_id uuid, p_device_id uuid, p_collection_id uuid,
  p_expected_collection_head bytea, p_membership_id uuid,
  p_removed_account_id uuid, p_epoch_number integer,
  p_membership_state_hash bytea, p_recipient_set_commitment bytea,
  p_transition_payload bytea, p_transition_signature bytea, p_transition_hash bytea,
  p_device_envelopes jsonb, p_recovery_envelopes jsonb,
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
     or current_operation.operation_hash <> p_expected_collection_head
     or membership.account_id <> p_removed_account_id or membership.status <> 'active'
     or membership.role = 'owner' or p_removed_account_id = p_account_id
     or p_epoch_number <> collection_row.current_epoch_number + 1
     or octet_length(p_expected_collection_head) <> 32
     or octet_length(p_membership_state_hash) <> 32
     or octet_length(p_recipient_set_commitment) <> 32
     or octet_length(p_transition_signature) <> 64 or octet_length(p_transition_hash) <> 32
     or octet_length(p_command_hash) <> 32 or octet_length(p_command_signature) <> 64
     or not exists (
       select 1 from public.vault_devices d
       join auth.sessions s on s.id = d.auth_session_id and s.user_id = d.account_id
       join public.vault_collection_memberships m on m.account_id = d.account_id
       where d.id = p_device_id and d.account_id = p_account_id and d.status = 'active'
         and d.auth_session_id = p_session_id and m.collection_id = p_collection_id
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
) from public, anon, authenticated;

grant execute on function private.create_vault_collection_invitation( uuid, uuid, uuid, uuid, bytea, uuid, uuid, uuid, public.vault_member_role, timestamptz, bytea, bytea, uuid, bytea, bytea, bytea ) to service_role;
grant execute on function private.accept_vault_collection_invitation( uuid, uuid, uuid, uuid, bytea, uuid, bytea, bytea, bytea, uuid, bytea, bytea, bytea ) to service_role;
grant execute on function private.confirm_vault_collection_invitation( uuid, uuid, uuid, uuid, bytea, uuid, bytea, bytea, bytea, uuid, bytea, bytea, bytea ) to service_role;
grant execute on function private.add_vault_collection_member_and_rotate_epoch( uuid, uuid, uuid, uuid, bytea, uuid, uuid, uuid, public.vault_member_role, integer, integer, bytea, bytea, bytea, bytea, bytea, jsonb, jsonb, jsonb, jsonb, uuid, bytea, bytea, bytea ) to service_role;
grant execute on function private.remove_vault_collection_member_and_rotate_epoch( uuid, uuid, uuid, uuid, bytea, uuid, uuid, integer, bytea, bytea, bytea, bytea, bytea, jsonb, jsonb, uuid, bytea, bytea, bytea ) to service_role;
