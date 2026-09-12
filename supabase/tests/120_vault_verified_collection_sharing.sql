begin;
select plan(40);

select has_table('public', 'vault_collection_invitations', 'verified invitations are persisted');
select has_column('public', 'vault_collection_invitations', 'invitation_key_commitment', 'only the invitation-secret commitment is stored');
select has_column('public', 'vault_collection_invitations', 'acceptance_transcript_hash', 'recipient verification transcript is retained');
select has_column('public', 'vault_collection_invitations', 'confirmation_payload', 'inviter confirmation evidence is retained');
select has_index('public', 'vault_collection_invitations', 'vault_collection_invitations_recipient_pending_idx', 'recipient pending reads are indexed');
select ok((select relrowsecurity from pg_class where oid = 'public.vault_collection_invitations'::regclass), 'invitation reads use RLS');
select ok(has_table_privilege('authenticated', 'public.vault_collection_invitations', 'select'), 'browser role has invitation read access');
select ok(not has_table_privilege('authenticated', 'public.vault_collection_invitations', 'insert'), 'browser role cannot insert invitations');

select ok(to_regprocedure('private.create_vault_collection_invitation(uuid,uuid,uuid,uuid,bytea,uuid,uuid,uuid,public.vault_member_role,timestamptz,bytea,bytea,uuid,bytea,bytea,bytea)') is not null, 'invitation-create transaction exists');
select ok(to_regprocedure('private.accept_vault_collection_invitation(uuid,uuid,uuid,uuid,bytea,uuid,bytea,bytea,bytea,uuid,bytea,bytea,bytea)') is not null, 'invitation-accept transaction exists');
select ok(to_regprocedure('private.confirm_vault_collection_invitation(uuid,uuid,uuid,uuid,bytea,uuid,bytea,bytea,bytea,uuid,bytea,bytea,bytea)') is not null, 'invitation-confirm transaction exists');
select ok(to_regprocedure('private.add_vault_collection_member_and_rotate_epoch(uuid,uuid,uuid,uuid,bytea,uuid,uuid,uuid,public.vault_member_role,integer,integer,bytea,bytea,bytea,bytea,bytea,jsonb,jsonb,jsonb,jsonb,uuid,bytea,bytea,bytea,bytea,bytea)') is not null, 'member activation and epoch rotation transaction exists');
select ok(to_regprocedure('private.remove_vault_collection_member_and_rotate_epoch(uuid,uuid,uuid,uuid,bytea,uuid,uuid,integer,bytea,bytea,bytea,bytea,bytea,jsonb,jsonb,uuid,bytea,bytea,bytea,bytea,bytea)') is not null, 'member removal and epoch rotation transaction exists');

select ok(not has_function_privilege('authenticated', 'private.create_vault_collection_invitation(uuid,uuid,uuid,uuid,bytea,uuid,uuid,uuid,public.vault_member_role,timestamptz,bytea,bytea,uuid,bytea,bytea,bytea)', 'execute'), 'browser roles cannot create invitations through RPC');
select ok(not has_function_privilege('authenticated', 'private.add_vault_collection_member_and_rotate_epoch(uuid,uuid,uuid,uuid,bytea,uuid,uuid,uuid,public.vault_member_role,integer,integer,bytea,bytea,bytea,bytea,bytea,jsonb,jsonb,jsonb,jsonb,uuid,bytea,bytea,bytea,bytea,bytea)', 'execute'), 'browser roles cannot activate members through RPC');
select ok(not has_function_privilege('authenticated', 'private.remove_vault_collection_member_and_rotate_epoch(uuid,uuid,uuid,uuid,bytea,uuid,uuid,integer,bytea,bytea,bytea,bytea,bytea,jsonb,jsonb,uuid,bytea,bytea,bytea,bytea,bytea)', 'execute'), 'browser roles cannot remove members through RPC');
select ok(has_function_privilege('service_role', 'private.add_vault_collection_member_and_rotate_epoch(uuid,uuid,uuid,uuid,bytea,uuid,uuid,uuid,public.vault_member_role,integer,integer,bytea,bytea,bytea,bytea,bytea,jsonb,jsonb,jsonb,jsonb,uuid,bytea,bytea,bytea,bytea,bytea)', 'execute'), 'server service role can dispatch the private transaction');

select is(
  private.add_vault_collection_member_and_rotate_epoch(
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    decode(repeat('00', 32), 'hex'), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), 'viewer', 2, 2, decode(repeat('00', 32), 'hex'),
    decode(repeat('00', 32), 'hex'), decode('00', 'hex'),
    decode(repeat('00', 64), 'hex'), decode(repeat('00', 32), 'hex'),
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, gen_random_uuid(),
    decode('00', 'hex'), decode(repeat('00', 32), 'hex'),
    decode(repeat('00', 64), 'hex')
  , decode(repeat('aa',16),'hex'), decode(repeat('bb',12),'hex')),
  false,
  'invalid member activation is rejected before writes'
);
select is((select count(*) from public.vault_collection_epochs), 0::bigint, 'rejected activation leaves no epoch');
select is((select count(*) from public.vault_collection_invitations), 0::bigint, 'rejected activation leaves no invitation mutation');

insert into auth.users (id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2');
insert into auth.sessions (id, user_id) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2');
insert into public.vault_devices (
  id, account_id, display_name, client_type, platform, enrollment_origin,
  key_protection_profile, client_crypto_capabilities, encryption_public_key,
  signing_public_key, encryption_algorithm, signing_algorithm, key_version,
  status
) values
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Owner', 'browser', 'test',
    'https://clipsx.app', 'vault-passphrase-wrapped', '{}'::jsonb,
    decode(repeat('11', 32), 'hex'), decode(repeat('12', 32), 'hex'),
    'hpke-x25519-hkdf-sha256-aes-256-gcm', 'ed25519', 1, 'active'
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Recipient', 'browser', 'test',
    'https://clipsx.app', 'vault-passphrase-wrapped', '{}'::jsonb,
    decode(repeat('21', 32), 'hex'), decode(repeat('22', 32), 'hex'),
    'hpke-x25519-hkdf-sha256-aes-256-gcm', 'ed25519', 1, 'active'
  );
insert into public.vault_recovery_keys (
  id, account_id, encryption_public_key, signing_public_key, key_version,
  status, authorization_payload, authorization_signature
) values
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddd1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    decode(repeat('31', 32), 'hex'), decode(repeat('32', 32), 'hex'), 1,
    'active', decode('00', 'hex'), decode(repeat('33', 64), 'hex')
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddd2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    decode(repeat('41', 32), 'hex'), decode(repeat('42', 32), 'hex'), 1,
    'active', decode('00', 'hex'), decode(repeat('43', 64), 'hex')
  );
insert into public.vault_collections (
  id, owner_account_id, current_epoch_number, current_epoch_transition_hash,
  membership_log_head_hash
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 1,
  decode(repeat('09', 32), 'hex'), decode(repeat('08', 32), 'hex')
);
insert into public.vault_collection_memberships (
  id, collection_id, account_id, role, status, joined_at, joined_epoch,
  history_access_from_epoch, invited_by_device_id, membership_operation_id
) values (
  'ffffffff-ffff-ffff-ffff-fffffffffff1',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'owner', 'active', now(), 1, 1,
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  '10000000-0000-0000-0000-000000000001'
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

select is(private.create_vault_collection_invitation(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  decode(repeat('01', 32), 'hex'),
  '11000000-0000-0000-0000-000000000001',
  'ffffffff-ffff-ffff-ffff-fffffffffff2',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'viewer', now() + interval '1 day',
  decode(repeat('51', 32), 'hex'), decode(repeat('52', 32), 'hex'),
  '10000000-0000-0000-0000-000000000002', decode('02', 'hex'),
  decode(repeat('02', 32), 'hex'), decode(repeat('02', 64), 'hex')
), true, 'owner creates a commitment-only verified invitation');
select is((select status::text from public.vault_collection_memberships where id = 'ffffffff-ffff-ffff-ffff-fffffffffff2'), 'invited', 'invitation does not activate membership');

select is(private.accept_vault_collection_invitation(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  'cccccccc-cccc-cccc-cccc-ccccccccccc2',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  decode(repeat('02', 32), 'hex'),
  '11000000-0000-0000-0000-000000000001',
  decode(repeat('02', 32), 'hex'), decode(repeat('52', 32), 'hex'),
  decode(repeat('53', 32), 'hex'),
  '10000000-0000-0000-0000-000000000003', decode('03', 'hex'),
  decode(repeat('03', 32), 'hex'), decode(repeat('03', 64), 'hex')
), true, 'recipient active device signs acceptance');

select is(private.confirm_vault_collection_invitation(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  decode(repeat('03', 32), 'hex'),
  '11000000-0000-0000-0000-000000000001',
  decode(repeat('03', 32), 'hex'), decode(repeat('53', 32), 'hex'),
  decode(repeat('52', 32), 'hex'),
  '10000000-0000-0000-0000-000000000004', decode('04', 'hex'),
  decode(repeat('04', 32), 'hex'), decode(repeat('04', 64), 'hex')
), true, 'inviter confirms the exact accepted transcript');

select is(private.add_vault_collection_member_and_rotate_epoch(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  decode(repeat('04', 32), 'hex'),
  '11000000-0000-0000-0000-000000000001',
  'ffffffff-ffff-ffff-ffff-fffffffffff2',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'viewer', 2, 2,
  decode(repeat('61', 32), 'hex'), decode(repeat('62', 32), 'hex'),
  decode('05', 'hex'), decode(repeat('05', 64), 'hex'),
  decode(repeat('05', 32), 'hex'),
  jsonb_build_array(
    jsonb_build_object('recipient_id', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'epoch_number', 2, 'encapsulation', encode(decode(repeat('01', 32), 'hex'), 'base64'), 'ciphertext', encode(decode(repeat('01', 16), 'hex'), 'base64'), 'payload', encode(decode('01', 'hex'), 'base64'), 'signature', encode(decode(repeat('01', 64), 'hex'), 'base64')),
    jsonb_build_object('recipient_id', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 'epoch_number', 2, 'encapsulation', encode(decode(repeat('02', 32), 'hex'), 'base64'), 'ciphertext', encode(decode(repeat('02', 16), 'hex'), 'base64'), 'payload', encode(decode('02', 'hex'), 'base64'), 'signature', encode(decode(repeat('02', 64), 'hex'), 'base64'))
  ),
  jsonb_build_array(
    jsonb_build_object('recipient_id', 'dddddddd-dddd-dddd-dddd-ddddddddddd1', 'epoch_number', 2, 'encapsulation', encode(decode(repeat('03', 32), 'hex'), 'base64'), 'ciphertext', encode(decode(repeat('03', 16), 'hex'), 'base64'), 'payload', encode(decode('03', 'hex'), 'base64'), 'signature', encode(decode(repeat('03', 64), 'hex'), 'base64')),
    jsonb_build_object('recipient_id', 'dddddddd-dddd-dddd-dddd-ddddddddddd2', 'epoch_number', 2, 'encapsulation', encode(decode(repeat('04', 32), 'hex'), 'base64'), 'ciphertext', encode(decode(repeat('04', 16), 'hex'), 'base64'), 'payload', encode(decode('04', 'hex'), 'base64'), 'signature', encode(decode(repeat('04', 64), 'hex'), 'base64'))
  ),
  '[]'::jsonb, '[]'::jsonb,
  '10000000-0000-0000-0000-000000000005', decode('05', 'hex'),
  decode(repeat('05', 32), 'hex'), decode(repeat('05', 64), 'hex')
, decode(repeat('aa',16),'hex'), decode(repeat('bb',12),'hex')), true, 'member activation and clean joining epoch commit together');
select ok(exists (
  select 1 from public.vault_collection_memberships m
  join public.vault_collections c on c.id = m.collection_id
  where m.id = 'ffffffff-ffff-ffff-ffff-fffffffffff2'
    and m.status = 'active' and m.history_access_from_epoch = 2
    and c.current_epoch_number = 2
), 'activated membership defaults to joining-epoch-only history');

select ok(private.close_account('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),'shared recipient can close without breaking owner history');
select ok((select requires_epoch_rotation from public.vault_collections where id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1'),'closure requires a signed rotation before more content');
select lives_ok($q$delete from auth.users where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'$q$,'shared author Auth identity can be deleted');
select is((select status::text from public.vault_devices where id='cccccccc-cccc-cccc-cccc-ccccccccccc2'),'revoked','shared verification key remains revoked');
select is(private.remove_vault_collection_member_and_rotate_epoch(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  decode(repeat('05', 32), 'hex'),
  'ffffffff-ffff-ffff-ffff-fffffffffff2',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 3,
  decode(repeat('71', 32), 'hex'), decode(repeat('72', 32), 'hex'),
  decode('06', 'hex'), decode(repeat('06', 64), 'hex'),
  decode(repeat('06', 32), 'hex'),
  jsonb_build_array(
    jsonb_build_object('recipient_id', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'epoch_number', 3, 'encapsulation', encode(decode(repeat('05', 32), 'hex'), 'base64'), 'ciphertext', encode(decode(repeat('05', 16), 'hex'), 'base64'), 'payload', encode(decode('05', 'hex'), 'base64'), 'signature', encode(decode(repeat('05', 64), 'hex'), 'base64'))
  ),
  jsonb_build_array(
    jsonb_build_object('recipient_id', 'dddddddd-dddd-dddd-dddd-ddddddddddd1', 'epoch_number', 3, 'encapsulation', encode(decode(repeat('06', 32), 'hex'), 'base64'), 'ciphertext', encode(decode(repeat('06', 16), 'hex'), 'base64'), 'payload', encode(decode('06', 'hex'), 'base64'), 'signature', encode(decode(repeat('06', 64), 'hex'), 'base64'))
  ),
  '10000000-0000-0000-0000-000000000006', decode('06', 'hex'),
  decode(repeat('06', 32), 'hex'), decode(repeat('06', 64), 'hex')
, decode(repeat('aa',16),'hex'), decode(repeat('bb',12),'hex')), true, 'member removal and replacement epoch commit together');
select ok(exists (
  select 1 from public.vault_collection_memberships m
  join public.vault_collections c on c.id = m.collection_id
  where m.id = 'ffffffff-ffff-ffff-ffff-fffffffffff2'
    and m.status = 'removed' and m.removed_epoch = 3
    and c.current_epoch_number = 3
), 'removed membership is terminal at the replacement epoch');
select is((
  select count(*) from public.vault_device_epoch_envelopes
  where collection_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1'
    and epoch_number = 3
    and recipient_device_id = 'cccccccc-cccc-cccc-cccc-ccccccccccc2'
), 0::bigint, 'removed recipient receives no replacement-epoch device envelope');

select is((select count(*) from private.vault_required_epochs('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1')), 3::bigint, 'owner key set includes historical and current epochs after removal');
select is((select count(*) from private.vault_required_epochs('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2')), 0::bigint, 'removed member has no required epoch set');
select ok(not (select requires_epoch_rotation from public.vault_collections where id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1'),'signed removal rotation releases closure write fence');
-- A device revocation rotates each collection once, regardless of retained epochs.
insert into public.vault_devices(id,account_id,display_name,client_type,platform,enrollment_origin,key_protection_profile,client_crypto_capabilities,encryption_public_key,signing_public_key,encryption_algorithm,signing_algorithm,key_version,status)
select 'cccccccc-cccc-cccc-cccc-ccccccccccc3',account_id,'Second owner device',client_type,platform,enrollment_origin,key_protection_profile,client_crypto_capabilities,decode(repeat('38',32),'hex'),decode(repeat('39',32),'hex'),encryption_algorithm,signing_algorithm,key_version,'active'
from public.vault_devices where id='cccccccc-cccc-cccc-cccc-ccccccccccc1';
insert into public.vault_account_operations(operation_id,account_id,sequence_number,operation_type,canonical_payload,operation_hash,author_device_id,signature,protocol_version)
values('10000000-0000-0000-0000-000000000090','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',1,'collection-create',decode('00','hex'),decode(repeat('90',32),'hex'),'cccccccc-cccc-cccc-cccc-ccccccccccc1',decode(repeat('90',64),'hex'),1);
create function pg_temp.test_bytes(n integer) returns text language sql as $$select encode(decode(repeat('91',n),'hex'),'base64')$$;
select ok(private.revoke_vault_device_and_rotate_epochs(
 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1','cccccccc-cccc-cccc-cccc-ccccccccccc1','cccccccc-cccc-cccc-cccc-ccccccccccc3','test',decode(repeat('90',32),'hex'),
 jsonb_build_array(jsonb_build_object('collection_id','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1','epoch_number',4,
 'membership_hash',pg_temp.test_bytes(32),'recipient_commitment',pg_temp.test_bytes(32),'transition_payload',pg_temp.test_bytes(1),'transition_signature',pg_temp.test_bytes(64),'transition_hash',pg_temp.test_bytes(32),'encrypted_metadata',pg_temp.test_bytes(16),'metadata_nonce',pg_temp.test_bytes(12),
 'device_envelopes',jsonb_build_array(jsonb_build_object('recipient_id','cccccccc-cccc-cccc-cccc-ccccccccccc1','encapsulation',pg_temp.test_bytes(32),'ciphertext',pg_temp.test_bytes(16),'payload',pg_temp.test_bytes(1),'signature',pg_temp.test_bytes(64))),
 'recovery_envelopes',jsonb_build_array(jsonb_build_object('recipient_id','dddddddd-dddd-dddd-dddd-ddddddddddd1','encapsulation',pg_temp.test_bytes(32),'ciphertext',pg_temp.test_bytes(16),'payload',pg_temp.test_bytes(1),'signature',pg_temp.test_bytes(64))))),
 '10000000-0000-0000-0000-000000000091',decode('91','hex'),decode(repeat('91',32),'hex'),decode(repeat('91',64),'hex')),'device revocation succeeds with three retained historical epochs');
select is((select current_epoch_number from public.vault_collections where id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1'),4,'revocation adds one replacement epoch');
select ok(private.close_account('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),'owner closure purges a collection with invitation and epoch history');
select is((select count(*) from public.vault_collections),0::bigint,'owned collection ciphertext and history are removed');
select * from finish();
rollback;
