begin;
select plan(5);
insert into auth.users(id) values ('15000000-0000-0000-0000-000000000001');
insert into auth.sessions(id,user_id) values ('15000000-0000-0000-0000-000000000002','15000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"15000000-0000-0000-0000-000000000001","session_id":"15000000-0000-0000-0000-000000000002"}',true);
select public.sync_enroll_device('15000000-0000-0000-0000-000000000003','Limits');
select public.sync_replace_profile(1,'15000000-0000-0000-0000-000000000003',
 (select jsonb_agg(jsonb_build_object('kind','shortcut','key','command.'||n,'payload','Primary+A','tombstone',false)) from generate_series(1,1000) n),false);
select throws_ok($$select public.sync_apply_batch(1,1,'15000000-0000-0000-0000-000000000003',0,'[{"kind":"shortcut","key":"one.too.many","payload":"Primary+B","tombstone":false,"revisionPhysicalMs":1,"revisionCounter":0}]')$$,'P0001','sync_profile_limit','incremental sync cannot exceed snapshot key limit');
select is(public.sync_enroll_device('15000000-0000-0000-0000-000000000003','Limits')->>'generation','1','quota failure preserves the generation');
select throws_ok($$select public.sync_replace_profile(1,'15000000-0000-0000-0000-000000000003','[]',null)$$,'P0001','sync_replace_required','null replacement mode rejected');
select throws_ok($$select public.sync_replace_profile(1,'15000000-0000-0000-0000-000000000003','[{"kind":"shortcut","key":"duplicate","payload":"A","tombstone":false},{"kind":"shortcut","key":"duplicate","payload":"B","tombstone":false}]',true)$$,'P0001','sync_snapshot_duplicate','duplicate keys cannot silently discard snapshot settings');
reset role;
select is((select count(*) from public.sync_records where user_id='15000000-0000-0000-0000-000000000001'),1000::bigint,'failed operations preserve all existing settings');
select * from finish();
rollback;
