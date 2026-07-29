begin;
select plan(16);

select has_function(
  'private', 'append_vault_note_revision',
  'private note-append transaction exists'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.append_vault_note_revision(uuid,uuid,uuid,uuid,bytea,bytea,uuid,bytea,integer,bytea,bytea,bytea,bytea,bytea,bytea,bytea,bytea,uuid,bytea,bytea,bytea)',
    'execute'
  ),
  'browser roles cannot execute note append directly'
);
select ok(
  not has_function_privilege(
    'anon',
    'private.append_vault_note_revision(uuid,uuid,uuid,uuid,bytea,bytea,uuid,bytea,integer,bytea,bytea,bytea,bytea,bytea,bytea,bytea,bytea,uuid,bytea,bytea,bytea)',
    'execute'
  ),
  'anonymous roles cannot execute note append directly'
);
select is(
  private.append_vault_note_revision(gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), decode(repeat('00', 32), 'hex'), decode(repeat('00', 32), 'hex'), gen_random_uuid(), null, 1, decode(repeat('00', 16), 'hex'), decode(repeat('00', 12), 'hex'), decode(repeat('00', 16), 'hex'), decode(repeat('00', 12), 'hex'), decode(repeat('00', 32), 'hex'), decode(repeat('00', 32), 'hex'), decode(repeat('00', 32), 'hex'), decode(repeat('00', 64), 'hex'), gen_random_uuid(), decode('00', 'hex'), decode(repeat('00', 32), 'hex'), decode(repeat('00', 64), 'hex')),
  false,
  'wrong session or membership is rejected without a write'
);
select is((select count(*) from public.vault_notes), 0::bigint, 'rejected append leaves no note row');
select is((select count(*) from public.vault_note_revisions), 0::bigint, 'rejected append leaves no revision row');

insert into auth.users (id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1');
insert into auth.sessions (id, user_id) values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
);
insert into public.vault_devices (
  id, account_id, display_name, client_type, platform, enrollment_origin,
  key_protection_profile, client_crypto_capabilities, encryption_public_key,
  signing_public_key, encryption_algorithm, signing_algorithm, key_version,
  status, auth_session_id
) values (
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Owner', 'browser', 'test',
  'https://clipsx.app', 'vault-passphrase-wrapped', '{}'::jsonb,
  decode(repeat('11', 32), 'hex'), decode(repeat('12', 32), 'hex'),
  'hpke-x25519-hkdf-sha256-aes-256-gcm', 'ed25519', 1, 'active',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'
);
insert into public.vault_collections (
  id, owner_account_id, current_epoch_number, current_epoch_transition_hash,
  membership_log_head_hash
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 1,
  decode(repeat('09', 32), 'hex'), decode(repeat('08', 32), 'hex')
);
insert into public.vault_collection_epochs (
  collection_id, epoch_number, created_by_device_id, rotation_reason,
  membership_state_hash, recipient_set_commitment, transition_payload,
  transition_signature, transition_hash, state
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 1,
  'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'collection-created',
  decode(repeat('08', 32), 'hex'), decode(repeat('07', 32), 'hex'),
  decode('01', 'hex'), decode(repeat('06', 64), 'hex'),
  decode(repeat('09', 32), 'hex'), 'current'
);
insert into public.vault_collection_operations (
  operation_id, collection_id, sequence_number, operation_type,
  canonical_payload, operation_hash, author_device_id, signature,
  protocol_version
) values (
  '10000000-0000-0000-0000-000000000001',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 1, 'collection-create',
  decode('01', 'hex'), decode(repeat('01', 32), 'hex'),
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  decode(repeat('01', 64), 'hex'), 1
);
insert into public.vault_collection_memberships (
  collection_id, account_id, role, status, joined_at, joined_epoch,
  history_access_from_epoch, invited_by_device_id, membership_operation_id
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'owner', 'active', now(), 1, 1,
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  '10000000-0000-0000-0000-000000000001'
);
insert into public.vault_account_operations (
  operation_id, account_id, sequence_number, operation_type, canonical_payload,
  previous_operation_hash, operation_hash, author_device_id, signature,
  protocol_version
) values (
  '10000000-0000-0000-0000-000000000002',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 1, 'device-register',
  decode('01', 'hex'), null, decode(repeat('01', 32), 'hex'),
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  decode(repeat('01', 64), 'hex'), 1
);

select is(
  private.append_vault_note_revision(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
    decode(repeat('01', 32), 'hex'), decode(repeat('01', 32), 'hex'),
    '20000000-0000-0000-0000-000000000001', null, 1,
    decode(repeat('02', 16), 'hex'), decode(repeat('03', 12), 'hex'),
    decode(repeat('04', 16), 'hex'), decode(repeat('05', 12), 'hex'),
    decode(repeat('06', 32), 'hex'), decode(repeat('07', 32), 'hex'),
    decode(repeat('08', 32), 'hex'), decode(repeat('09', 64), 'hex'),
    '30000000-0000-0000-0000-000000000001', decode('01', 'hex'),
    decode(repeat('0a', 32), 'hex'), decode(repeat('0b', 64), 'hex')
  ),
  true,
  'valid encrypted note append commits atomically'
);
select is((select count(*) from public.vault_notes), 1::bigint, 'accepted append creates the note head');
select is((select key_version from public.vault_note_revisions where revision_number = 1), 1, 'accepted revision stores its key version');
select is(
  (select protocol_version * 10 + associated_data_version from public.vault_note_revisions where revision_number = 1),
  11,
  'accepted revision stores protocol and associated-data versions'
);
select is(
  private.append_vault_note_revision(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
    decode(repeat('0a', 32), 'hex'), decode(repeat('0a', 32), 'hex'),
    '20000000-0000-0000-0000-000000000001', decode(repeat('08', 32), 'hex'), 1,
    decode(repeat('12', 16), 'hex'), decode(repeat('13', 12), 'hex'),
    decode(repeat('14', 16), 'hex'), decode(repeat('15', 12), 'hex'),
    decode(repeat('16', 32), 'hex'), decode(repeat('17', 32), 'hex'),
    decode(repeat('18', 32), 'hex'), decode(repeat('19', 64), 'hex'),
    '30000000-0000-0000-0000-000000000002', decode('02', 'hex'),
    decode(repeat('1a', 32), 'hex'), decode(repeat('1b', 64), 'hex')
  ),
  true,
  'an update commits with its previous revision hash'
);
select is(
  (select previous_revision_hash from public.vault_note_revisions where revision_number = 2),
  decode(repeat('08', 32), 'hex'),
  'an update persists the signed previous revision hash'
);

select has_table('public', 'vault_tombstones', 'signed tombstones are stored separately from ciphertext');
select has_function('private', 'delete_vault_note', 'private note-delete transaction exists');
select ok(
  not has_function_privilege(
    'authenticated',
    'private.delete_vault_note(uuid,uuid,uuid,uuid,bytea,bytea,uuid,bytea,uuid,bytea,bytea,bytea)',
    'execute'
  ),
  'browser roles cannot execute note deletion directly'
);
select is(
  private.delete_vault_note(gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), decode(repeat('00', 32), 'hex'), decode(repeat('00', 32), 'hex'), gen_random_uuid(), decode(repeat('00', 32), 'hex'), gen_random_uuid(), decode('00', 'hex'), decode(repeat('00', 32), 'hex'), decode(repeat('00', 64), 'hex')),
  false,
  'wrong session or membership rejects deletion without a tombstone'
);

select * from finish();
rollback;
