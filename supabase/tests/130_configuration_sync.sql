begin;
select plan(24);
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
insert into auth.sessions(id,user_id) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","session_id":"20000000-0000-0000-0000-000000000001"}',true);
select is(public.sync_enroll_device('30000000-0000-0000-0000-000000000001','First')->>'generation','1','first enrollment creates a profile');
select is(public.sync_enroll_device('30000000-0000-0000-0000-000000000009','Ignored')->>'deviceId','30000000-0000-0000-0000-000000000001','session cannot mint another identity');
select throws_ok('select * from public.sync_records','42501',null,'raw reads denied');
select throws_ok('update public.sync_profiles set cursor=9000','42501',null,'raw cursor manipulation denied');
select is(public.sync_apply_batch(1,1,'30000000-0000-0000-0000-000000000001',0,
 '[{"kind":"profile_setting","key":"ui.theme","payload":"dark","tombstone":false,"revisionPhysicalMs":100,"revisionCounter":0}]')->>'cursor','1','valid upload receives a cursor');
select is(public.sync_apply_batch(1,1,'30000000-0000-0000-0000-000000000001',0,
 '[{"kind":"profile_setting","key":"ui.theme","payload":"dark","tombstone":false,"revisionPhysicalMs":100,"revisionCounter":0}]')->>'cursor','1','duplicate upload does not allocate a cursor');
select is(public.sync_apply_batch(1,1,'30000000-0000-0000-0000-000000000001',0,
 '[{"kind":"profile_setting","key":"providers.secret","payload":"do-not-upload","tombstone":false,"revisionPhysicalMs":101,"revisionCounter":0}]')#>>'{acknowledgements,0,status}','invalid','unknown key rejected');
select is(public.sync_apply_batch(1,1,'30000000-0000-0000-0000-000000000001',0,
 '[{"kind":"profile_setting","key":"ui.theme","payload":"light","tombstone":false,"revisionPhysicalMs":9007199254740000,"revisionCounter":0}]')#>>'{acknowledgements,0,status}','clock_skew','future clock rejected recoverably');
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","session_id":"20000000-0000-0000-0000-000000000002"}',true);
select is(public.sync_enroll_device('30000000-0000-0000-0000-000000000002','Second')->>'initialized','true','second device detects existing cloud');
select is(public.sync_apply_batch(1,1,'30000000-0000-0000-0000-000000000002',0,'[]')#>>'{records,0,payload}','dark','second device restores configuration');
select throws_ok($$select public.sync_apply_batch(1,1,'30000000-0000-0000-0000-000000000001',0,'[]')$$,'42501',null,'forged device identity denied');
select public.sync_revoke_device('30000000-0000-0000-0000-000000000001');
select is(public.sync_reset_profile(1),2::bigint,'reset increments generation');
select is(public.sync_apply_batch(1,1,'30000000-0000-0000-0000-000000000002',0,'[]')->>'error','generation_changed','old generation cannot restore cleared settings');
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","session_id":"20000000-0000-0000-0000-000000000001"}',true);
select throws_ok($$select public.sync_enroll_device('30000000-0000-0000-0000-000000000009','Bypass')$$,'42501',null,'revoked session cannot enroll again');
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","session_id":"20000000-0000-0000-0000-000000000003"}',true);
select is(public.sync_enroll_device('30000000-0000-0000-0000-000000000003','Other')->>'initialized','false','other user has independent profile');
select is(public.sync_apply_batch(1,1,'30000000-0000-0000-0000-000000000003',0,'[]')->>'records','[]','cross-user records isolated');
select is(public.sync_replace_profile(1,'30000000-0000-0000-0000-000000000003',
 (select jsonb_agg(jsonb_build_object('kind','renderer_preference','key','facet:example.'||n,'payload','core/text','tombstone',false,'revisionPhysicalMs',0,'revisionCounter',0)) from generate_series(1,205) n),false),1::bigint,'large initial snapshot commits atomically');
select is(jsonb_array_length(public.sync_apply_batch(1,1,'30000000-0000-0000-0000-000000000003',0,'[]')->'records'),100,'download pages are bounded');
select is(public.sync_apply_batch(1,1,'30000000-0000-0000-0000-000000000003',0,'[]')->>'cursor','100','cursor advances through returned page only');
select is(public.sync_apply_batch(1,1,'30000000-0000-0000-0000-000000000003',100,'[]')->>'hasMore','true','second page reports remaining data');
select is(jsonb_array_length(public.sync_apply_batch(1,1,'30000000-0000-0000-0000-000000000003',200,'[]')->'records'),5,'last page contains all remaining records');
select throws_ok($$select public.sync_replace_profile(1,'30000000-0000-0000-0000-000000000003','[{"kind":"extension_intent","key":"example.package","payload":{},"tombstone":false}]',true)$$,'P0001','sync_snapshot_invalid','malformed snapshot rolls back replacement');
select is(public.sync_enroll_device('30000000-0000-0000-0000-000000000003','Other')->>'generation','1','failed replacement preserves previous generation');
set local role anon;
select throws_ok('select public.sync_list_devices()','42501',null,'anonymous RPC access denied');
select * from finish();
rollback;
