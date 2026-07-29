begin;
select plan(7);

select has_table('public', 'vault_collection_operations', 'collection operation ledger exists');
select has_index('public', 'vault_collection_operations', 'vault_collection_operations_collection_id_sequence_number_key', 'collection operations are sequence-linked');
select col_not_null('public', 'vault_device_epoch_envelopes', 'envelope_payload', 'device envelopes retain the signed canonical payload');
select col_not_null('public', 'vault_recovery_epoch_envelopes', 'envelope_payload', 'recovery envelopes retain the signed canonical payload');
select ok(to_regprocedure('private.create_vault_collection(uuid,uuid,uuid,uuid,bytea,bytea,bytea,bytea,bytea,bytea,bytea,bytea,bytea,bytea,bytea,bytea,uuid,bytea,bytea,bytea,bytea,uuid,bytea,bytea,bytea)') is not null, 'private collection-create transaction exists');
select ok((select relrowsecurity from pg_class where oid = 'public.vault_collection_operations'::regclass), 'collection operations use RLS');
select ok(not has_function_privilege('authenticated', 'private.create_vault_collection(uuid,uuid,uuid,uuid,bytea,bytea,bytea,bytea,bytea,bytea,bytea,bytea,bytea,bytea,bytea,bytea,uuid,bytea,bytea,bytea,bytea,uuid,bytea,bytea,bytea)', 'execute'), 'browser roles cannot invoke collection creation directly');

select * from finish();
rollback;
