begin;
select plan(10);

select has_table('private', 'vault_pending_device_registrations', 'pending registrations are private');
select has_column('private', 'vault_pending_device_registrations', 'proof_hash', 'pending proof commitment is retained');
select has_column('private', 'vault_pending_device_registrations', 'sas_commitment', 'SAS commitment is bound to the pending proof');
select ok(to_regprocedure('private.register_pending_vault_device(uuid,uuid,uuid,bytea,uuid,text,text,text,text,jsonb,bytea,bytea,bytea,bytea,bytea,bytea)') is not null, 'pending registration transaction exists');
select ok(to_regprocedure('private.authorize_pending_vault_device(uuid,uuid,uuid,uuid,bytea,bytea,bytea,bytea,bytea,jsonb,uuid,bytea,bytea)') is not null, 'device authorization transaction exists');
select ok(not has_function_privilege('authenticated', 'private.authorize_pending_vault_device(uuid,uuid,uuid,uuid,bytea,bytea,bytea,bytea,bytea,jsonb,uuid,bytea,bytea)', 'execute'), 'browser roles cannot activate a pending device directly');
select ok(to_regprocedure('private.authorize_pending_vault_device_with_recovery(uuid,uuid,uuid,uuid,bytea,bytea,bytea,bytea,jsonb,uuid,bytea,bytea)') is not null, 'recovery device authorization transaction exists');
select ok(not has_function_privilege('authenticated', 'private.authorize_pending_vault_device_with_recovery(uuid,uuid,uuid,uuid,bytea,bytea,bytea,bytea,jsonb,uuid,bytea,bytea)', 'execute'), 'browser roles cannot invoke recovery authorization directly');
select ok(to_regprocedure('private.revoke_vault_device_and_rotate_epochs(uuid,uuid,uuid,uuid,text,bytea,jsonb,uuid,bytea,bytea,bytea)') is not null, 'revocation and epoch rotation transaction exists');
select ok(not has_function_privilege('authenticated', 'private.revoke_vault_device_and_rotate_epochs(uuid,uuid,uuid,uuid,text,bytea,jsonb,uuid,bytea,bytea,bytea)', 'execute'), 'browser roles cannot invoke revocation directly');

select * from finish();
rollback;
