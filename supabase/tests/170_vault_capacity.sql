begin;
select plan(6);
insert into auth.users(id) values('17000000-0000-0000-0000-000000000001');
insert into private.vault_device_registration_challenges(account_id,device_encryption_public_key,challenge_hash,created_at,expires_at)
select '17000000-0000-0000-0000-000000000001',decode(repeat('11',32),'hex'),decode(repeat('22',32),'hex'),now()-interval '2 hours',now()-interval '1 hour' from generate_series(1,64);
select throws_ok($q$insert into private.vault_device_registration_challenges(account_id,device_encryption_public_key,challenge_hash,expires_at) values('17000000-0000-0000-0000-000000000001',decode(repeat('11',32),'hex'),decode(repeat('22',32),'hex'),now()+interval '1 hour')$q$,'P0001','vault_record_limit','challenge admission is cumulatively bounded');
select is((select count(*) from private.vault_device_registration_challenges),64::bigint,'failed admission leaves no extra row');
select is(private.cleanup_vault_registrations(1000),64,'expired challenges are reclaimed');
select is((select retained_bytes from private.vault_storage_usage where scope_kind='account' and scope_id='17000000-0000-0000-0000-000000000001'),0::bigint,'cleanup refunds exact accounted bytes');
select lives_ok($q$insert into private.vault_device_registration_challenges(account_id,device_encryption_public_key,challenge_hash,expires_at) values('17000000-0000-0000-0000-000000000001',decode(repeat('11',32),'hex'),decode(repeat('22',32),'hex'),now()+interval '1 hour')$q$,'enrollment can resume after cleanup');
select ok(not has_function_privilege('authenticated','private.cleanup_vault_registrations(integer)','execute'),'browser cannot invoke maintenance');
select * from finish();
rollback;
