begin;
select plan(6);

select has_index('public', 'vault_devices', 'vault_devices_one_active_session_idx', 'only one active device may bind an Auth session');
select ok(to_regprocedure('private.has_active_bound_vault_device(uuid,text)') is not null, 'bound-device RLS helper exists');
select ok(to_regprocedure('private.bind_vault_device_session(uuid,uuid,uuid,bytea,uuid,bytea,bytea,bytea)') is not null, 'private session-binding transaction exists');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.vault_account_operations'::regclass
    and pg_get_constraintdef(oid) like '%device-session-bind%'
), 'account operation type allows signed session binding');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'vault_note_revisions'
    and policyname = 'vault_note_revisions_read_member'
    and qual like '%has_active_bound_vault_device%'
), 'ciphertext reads require an active bound device');
select ok(not has_function_privilege(
  'authenticated',
  'private.bind_vault_device_session(uuid,uuid,uuid,bytea,uuid,bytea,bytea,bytea)',
  'execute'
), 'browser roles cannot invoke the binding transaction directly');

select * from finish();
rollback;
