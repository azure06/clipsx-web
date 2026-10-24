begin;
select plan(24);
insert into auth.users(id) values ('13100000-0000-0000-0000-000000000001'), ('13100000-0000-0000-0000-000000000002');
insert into auth.sessions(id,user_id) values
 ('13100000-0000-0000-0001-000000000001','13100000-0000-0000-0000-000000000001'),
 ('13100000-0000-0000-0001-000000000002','13100000-0000-0000-0000-000000000001'),
 ('13100000-0000-0000-0001-000000000003','13100000-0000-0000-0000-000000000002'),
 ('13100000-0000-0000-0001-000000000004','13100000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"13100000-0000-0000-0000-000000000001","session_id":"13100000-0000-0000-0001-000000000001"}',true);
select public.sync_enroll_device('13100000-0000-0000-0002-000000000001','This device');
select public.sync_enroll_device('13100000-0000-0000-0002-000000000001','Home Mac');
select is(public.sync_list_devices()#>>'{0,displayName}','Home Mac','enrollment upgrades the legacy name');
select public.sync_apply_batch(1,1,'13100000-0000-0000-0002-000000000001',0,
 '[{"kind":"profile_setting","key":"ui.theme","payload":"dark","tombstone":false,"revisionPhysicalMs":100,"revisionCounter":0}]');
select public.sync_rename_device('13100000-0000-0000-0002-000000000001','  Work Mac  ');
select public.sync_enroll_device('13100000-0000-0000-0002-000000000001','Old computer name');
select is(public.sync_list_devices()#>>'{0,displayName}','Work Mac','custom name is trimmed and survives reconnect');
select throws_ok($$select public.sync_rename_device('13100000-0000-0000-0002-000000000001',' ')$$,'22023',null,'blank names rejected');
select throws_ok($$select public.sync_rename_device('13100000-0000-0000-0002-000000000001',repeat('x',121))$$,'22023',null,'long names rejected');
select throws_ok($$select public.sync_rename_device('13100000-0000-0000-0002-000000000001',E'bad\nname')$$,'22023',null,'control characters rejected');
select set_config('request.jwt.claims','{"sub":"13100000-0000-0000-0000-000000000002","session_id":"13100000-0000-0000-0001-000000000003"}',true);
select public.sync_enroll_device('13100000-0000-0000-0002-000000000003','Other');
select throws_ok($$select public.sync_rename_device('13100000-0000-0000-0002-000000000001','Forged')$$,'22023',null,'cross-account rename denied');
select throws_ok($$select public.sync_remove_device('13100000-0000-0000-0002-000000000001')$$,'22023',null,'cross-account removal denied');
select set_config('request.jwt.claims','{"sub":"13100000-0000-0000-0000-000000000001","session_id":"13100000-0000-0000-0001-000000000002"}',true);
select public.sync_enroll_device('13100000-0000-0000-0002-000000000002','Laptop');
select is(jsonb_array_length(public.sync_list_devices()),2,'both devices initially visible');
select public.sync_revoke_device('13100000-0000-0000-0002-000000000001');
select public.sync_remove_device('13100000-0000-0000-0002-000000000001');
select is(jsonb_array_length(public.sync_list_devices()),1,'removed revoked device disappears');
select is(public.sync_apply_batch(1,1,'13100000-0000-0000-0002-000000000002',0,'[]')#>>'{records,0,payload}','dark','removal preserves shared cloud settings');
select is(public.sync_list_devices()#>>'{0,current}','true','current device sorts first');
select lives_ok($$select public.sync_remove_device('13100000-0000-0000-0002-000000000001')$$,'removal is idempotent');
select set_config('request.jwt.claims','{"sub":"13100000-0000-0000-0000-000000000001","session_id":"13100000-0000-0000-0001-000000000001"}',true);
select throws_ok($$select public.sync_enroll_device('13100000-0000-0000-0002-000000000009','Bypass')$$,'42501',null,'removed live session cannot reenroll');
select throws_ok($$select public.sync_apply_batch(1,1,'13100000-0000-0000-0002-000000000001',0,'[]')$$,'42501',null,'removed session cannot sync');
select throws_ok($$select public.sync_rename_device('13100000-0000-0000-0002-000000000002','Bypass')$$,'42501',null,'removed session cannot rename');
select throws_ok($$select public.sync_remove_device('13100000-0000-0000-0002-000000000002')$$,'42501',null,'removed session cannot remove another device');
set local role postgres;
select ok((select revoked_at is not null and removed_at is not null and display_name='Removed device' from public.sync_devices where device_id='13100000-0000-0000-0002-000000000001'),'blocked session retained without its previous name');
insert into auth.sessions(id,user_id,not_after) values ('13100000-0000-0000-0005-000000000001','13100000-0000-0000-0000-000000000001',now()-interval '1 day');
insert into public.sync_devices(user_id,device_id,session_id,display_name) values ('13100000-0000-0000-0000-000000000001','13100000-0000-0000-0005-000000000002','13100000-0000-0000-0005-000000000001','Expired');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"13100000-0000-0000-0000-000000000001","session_id":"13100000-0000-0000-0001-000000000002"}',true);
select is(jsonb_array_length(public.sync_list_devices()),1,'expired sessions do not clutter the list');
set local role postgres;
insert into auth.sessions(id,user_id)
 select ('13100000-0000-0000-0003-'||lpad(n::text,12,'0'))::uuid,'13100000-0000-0000-0000-000000000001'::uuid from generate_series(1,63) n;
insert into public.sync_devices(user_id,device_id,session_id,display_name)
 select '13100000-0000-0000-0000-000000000001'::uuid, ('13100000-0000-0000-0004-'||lpad(n::text,12,'0'))::uuid,('13100000-0000-0000-0003-'||lpad(n::text,12,'0'))::uuid,'Extra' from generate_series(1,63) n;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"13100000-0000-0000-0000-000000000001","session_id":"13100000-0000-0000-0001-000000000004"}',true);
select throws_ok($$select public.sync_enroll_device('13100000-0000-0000-0002-000000000004','New')$$,'P0001','sync_device_limit','visible device quota is enforced');
select set_config('request.jwt.claims','{"sub":"13100000-0000-0000-0000-000000000001","session_id":"13100000-0000-0000-0001-000000000002"}',true);
select public.sync_remove_device('13100000-0000-0000-0004-000000000001');
select set_config('request.jwt.claims','{"sub":"13100000-0000-0000-0000-000000000001","session_id":"13100000-0000-0000-0001-000000000004"}',true);
select lives_ok($$select public.sync_enroll_device('13100000-0000-0000-0002-000000000004','New')$$,'removed records do not consume quota');
select is(jsonb_array_length(public.sync_list_devices()),64,'list contains only the retained visible devices');
select public.sync_remove_device('13100000-0000-0000-0002-000000000004');
select throws_ok($$select public.sync_list_devices()$$,'42501',null,'self removal stops access immediately');
set local role anon;
select throws_ok($$select public.sync_remove_device('13100000-0000-0000-0002-000000000002')$$,'42501',null,'anonymous removal denied');
select throws_ok($$select public.sync_rename_device('13100000-0000-0000-0002-000000000002','Name')$$,'42501',null,'anonymous rename denied');
select * from finish();
rollback;
