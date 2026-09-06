-- Configuration sync is independent of billing and the encrypted vault.
-- Public entrypoints are invokers. Non-exposed executors use a NOLOGIN,
-- NOBYPASSRLS role so clients never receive raw table mutation privileges.
create schema sync_internal;
revoke all on schema sync_internal from public, anon;
grant usage on schema sync_internal to authenticated, service_role;
do $$ begin
  if not exists (select from pg_roles where rolname = 'configuration_sync_executor') then
    create role configuration_sync_executor nologin noinherit nobypassrls;
  end if;
end $$;
grant configuration_sync_executor to postgres;
grant usage on schema public, sync_internal to configuration_sync_executor;

create function sync_internal.user_id() returns uuid
language sql stable security definer set search_path = '' as $$ select auth.uid() $$;
revoke all on function sync_internal.user_id() from public, anon, authenticated;
grant execute on function sync_internal.user_id() to configuration_sync_executor;

create table public.sync_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  generation bigint not null default 1 check (generation > 0),
  cursor bigint not null default 0 check (cursor between 0 and 9007199254740991),
  initialized boolean not null default false
);
create table public.sync_devices (
  user_id uuid not null references public.sync_profiles(user_id) on delete cascade,
  device_id uuid not null,
  session_id uuid not null,
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (user_id, device_id),
  unique (user_id, session_id)
);
create table public.sync_records (
  user_id uuid not null references public.sync_profiles(user_id) on delete cascade,
  generation bigint not null,
  kind text not null,
  key text not null check (length(key) between 1 and 512),
  payload jsonb,
  tombstone boolean not null,
  revision_physical_ms bigint not null check (revision_physical_ms between 0 and 9007199254740991),
  revision_counter bigint not null check (revision_counter between 0 and 9007199254740991),
  source_device_id uuid not null,
  server_cursor bigint not null check (server_cursor between 1 and 9007199254740991),
  primary key (user_id, generation, kind, key),
  unique (user_id, generation, server_cursor),
  check ((tombstone and payload is null) or (not tombstone and payload is not null))
);
alter table public.sync_profiles enable row level security;
alter table public.sync_devices enable row level security;
alter table public.sync_records enable row level security;
revoke all on public.sync_profiles, public.sync_devices, public.sync_records from public, anon, authenticated;
grant select, insert, update, delete on public.sync_profiles, public.sync_devices, public.sync_records to configuration_sync_executor;
create policy sync_profiles_owner on public.sync_profiles to configuration_sync_executor
  using (user_id = (select sync_internal.user_id())) with check (user_id = (select sync_internal.user_id()));
create policy sync_devices_owner on public.sync_devices to configuration_sync_executor
  using (user_id = (select sync_internal.user_id())) with check (user_id = (select sync_internal.user_id()));
create policy sync_records_owner on public.sync_records to configuration_sync_executor
  using (user_id = (select sync_internal.user_id())) with check (user_id = (select sync_internal.user_id()));

-- Only this narrow helper reads the Auth session table. No session IDs accepted
-- from callers and no user_metadata is used for authorization.
create function sync_internal.session_id() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare sid uuid := (auth.jwt()->>'session_id')::uuid;
begin
  if sync_internal.user_id() is null or sid is null or not exists (
    select from auth.sessions where id = sid and user_id = sync_internal.user_id()
      and (not_after is null or not_after > now())
  ) then raise exception 'sync_session_required' using errcode = '42501'; end if;
  return sid;
end $$;
revoke all on function sync_internal.session_id() from public, anon, authenticated;
grant execute on function sync_internal.session_id() to configuration_sync_executor;

-- Closed vocabulary for v1. Extension settings require server-approved signed
-- registry declarations; arbitrary strings/objects are never syncable settings.
create table sync_internal.extension_settings (
  package_id text not null,
  setting_id text not null,
  value_kind text not null check (value_kind in ('boolean', 'number', 'select')),
  allowed_values jsonb,
  primary key (package_id, setting_id)
);
alter table sync_internal.extension_settings enable row level security;
grant select on sync_internal.extension_settings to configuration_sync_executor;
grant all on sync_internal.extension_settings to service_role;
create policy extension_settings_read on sync_internal.extension_settings for select to configuration_sync_executor using (true);

create function sync_internal.valid_record(k text, ident text, value jsonb, deleted boolean)
returns boolean language plpgsql stable set search_path = '' as $$
declare declaration sync_internal.extension_settings;
begin
  if k is null or ident is null or deleted is null or length(ident) not between 1 and 512 then return false; end if;
  if octet_length(coalesce(value::text, '')) > 65536 then return false; end if;
  if k = 'profile_setting' then
    if ident not in ('ui.theme','ui.language','ui.default_output_format','ui.show_copy_toast',
      'search.syntax_mode','search.enabled_sources','artifacts.ocr.enabled','artifacts.ocr.language') then return false; end if;
    if deleted then return value is null; end if;
    return coalesce(case
      when ident = 'ui.theme' then value in ('"system"','"light"','"dark"')
      when ident in ('ui.language','artifacts.ocr.language') then jsonb_typeof(value) = 'string' and value #>> '{}' ~ '^[a-zA-Z0-9_-]{1,35}$'
      when ident in ('ui.show_copy_toast','artifacts.ocr.enabled') then jsonb_typeof(value) = 'boolean'
      when ident = 'ui.default_output_format' then value in ('"plain_text"','"original"')
      when ident = 'search.syntax_mode' then value in ('"simple"','"advanced"')
      when ident = 'search.enabled_sources' then jsonb_typeof(value) = 'array' and jsonb_array_length(value) <= 32
        and not exists (select from jsonb_array_elements(value) e where jsonb_typeof(e) <> 'string' or e #>> '{}' !~ '^[a-zA-Z0-9_.-]{1,160}$')
    end, false);
  elsif k = 'renderer_preference' then
    return ident ~ '^(facet|mime|capability):[^[:cntrl:]]+$' and length(substring(ident from position(':' in ident)+1))<=256 and
      ((deleted and value is null) or (not deleted and jsonb_typeof(value) = 'string' and value #>> '{}' ~ '^[a-zA-Z0-9_./-]+$' and length(value #>> '{}')<=256));
  elsif k = 'extension_intent' then
    return ident ~ '^[a-zA-Z0-9_-]+[.][a-zA-Z0-9_.-]+$' and
      ((deleted and value is null) or (not deleted and jsonb_typeof(value) = 'object'
        and value - 'enabled' = '{}'::jsonb and jsonb_typeof(value->'enabled') = 'boolean'));
  elsif k = 'extension_setting' then
    select * into declaration from sync_internal.extension_settings
      where package_id = split_part(ident,'/',1) and setting_id = split_part(ident,'/',2)
        and ident = package_id || '/' || setting_id;
    if not found then return false; end if;
    if deleted then return value is null; end if;
    return coalesce(case declaration.value_kind
      when 'boolean' then jsonb_typeof(value) = 'boolean'
      when 'number' then jsonb_typeof(value) = 'number'
      when 'select' then declaration.allowed_values @> jsonb_build_array(value)
    end, false);
  elsif k = 'shortcut' then
    return ident ~ '^[a-zA-Z0-9_.:/-]+$' and length(ident)<=256 and ident <> 'window.global_shortcut' and
      ((deleted and value is null) or (not deleted and jsonb_typeof(value) = 'string'
        and value #>> '{}' ~ '^(Primary\+|Ctrl\+|Alt\+|Shift\+|Meta\+)*[a-zA-Z0-9]{1,24}$'));
  end if;
  return false;
exception when others then return false;
end $$;
revoke all on function sync_internal.valid_record(text,text,jsonb,boolean) from public, anon, authenticated;
grant execute on function sync_internal.valid_record(text,text,jsonb,boolean) to configuration_sync_executor;
alter table public.sync_records add constraint sync_record_contract
  check (sync_internal.valid_record(kind,key,payload,tombstone) is true);

create function sync_internal.record_json(r public.sync_records) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('kind',r.kind,'key',r.key,'payload',r.payload,'tombstone',r.tombstone,
    'revisionPhysicalMs',r.revision_physical_ms,'revisionCounter',r.revision_counter,
    'sourceDeviceId',r.source_device_id,'serverCursor',r.server_cursor)
$$;
revoke all on function sync_internal.record_json(public.sync_records) from public, anon, authenticated;
grant execute on function sync_internal.record_json(public.sync_records) to configuration_sync_executor;

create function sync_internal.enroll(p_device_id uuid, p_device_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare sid uuid := sync_internal.session_id(); p public.sync_profiles; d public.sync_devices;
begin
  insert into public.sync_profiles(user_id) values(sync_internal.user_id()) on conflict do nothing;
  select * into p from public.sync_profiles where user_id = sync_internal.user_id() for update;
  select * into d from public.sync_devices where user_id = sync_internal.user_id() and session_id = sid;
  if found then
    if d.revoked_at is not null then raise exception 'sync_device_revoked' using errcode = '42501'; end if;
  else
    insert into public.sync_devices(user_id, device_id, session_id, display_name)
      values(sync_internal.user_id(),case when exists(select from public.sync_devices where user_id=sync_internal.user_id() and device_id=p_device_id) then gen_random_uuid() else p_device_id end,sid,p_device_name) returning * into d;
  end if;
  return jsonb_build_object('deviceId',d.device_id,'generation',p.generation,'initialized',p.initialized,'serverTimeMs',floor(extract(epoch from clock_timestamp())*1000)::bigint);
end $$;

create function sync_internal.apply_batch(p_protocol_version integer, p_generation bigint,
  p_device_id uuid, p_after_cursor bigint, p_records jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare sid uuid := sync_internal.session_id(); p public.sync_profiles; item jsonb; current_record public.sync_records;
  physical bigint; logical bigint; value jsonb; deleted boolean; outcome text;
  acknowledgements jsonb := '[]'; downloaded jsonb := '[]'; next_cursor bigint;
  server_time bigint := floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
  if p_protocol_version is distinct from 1 then raise exception 'sync_protocol_unsupported'; end if;
  if p_records is null or jsonb_typeof(p_records) <> 'array' or jsonb_array_length(p_records) > 100
    or octet_length(p_records::text) > 1048576 then raise exception 'sync_batch_limit'; end if;
  select * into p from public.sync_profiles where user_id = sync_internal.user_id() for update;
  if not found or not exists (select from public.sync_devices where user_id = sync_internal.user_id()
    and device_id = p_device_id and session_id = sid and revoked_at is null) then
    raise exception 'sync_device_revoked' using errcode = '42501';
  end if;
  if p_generation is distinct from p.generation then
    return jsonb_build_object('error','generation_changed','generation',p.generation,'serverTimeMs',server_time);
  end if;
  if p_after_cursor is null or p_after_cursor < 0 or p_after_cursor > p.cursor then raise exception 'sync_cursor_invalid'; end if;
  for item in select * from jsonb_array_elements(p_records) loop
    value := nullif(item->'payload','null'::jsonb);
    outcome := 'invalid';
    begin
      deleted := (item->>'tombstone')::boolean;
      physical := (item->>'revisionPhysicalMs')::bigint;
      logical := (item->>'revisionCounter')::bigint;
      if item - array['kind','key','payload','tombstone','revisionPhysicalMs','revisionCounter'] <> '{}'::jsonb
        or physical is null or logical is null or physical < 0 or logical < 0 or logical > 9007199254740991
        or sync_internal.valid_record(item->>'kind',item->>'key',value,deleted) is not true then
        raise exception 'invalid';
      end if;
      if physical > server_time + 300000 then outcome := 'clock_skew';
      else
        select * into current_record from public.sync_records where user_id = sync_internal.user_id() and generation = p.generation
          and kind = item->>'kind' and key = item->>'key';
        if not found or (physical,logical,p_device_id) > (current_record.revision_physical_ms,current_record.revision_counter,current_record.source_device_id) then
          p.cursor := p.cursor + 1;
          insert into public.sync_records values(sync_internal.user_id(),p.generation,item->>'kind',item->>'key',value,deleted,physical,logical,p_device_id,p.cursor)
          on conflict (user_id,generation,kind,key) do update set payload = excluded.payload,tombstone = excluded.tombstone,
            revision_physical_ms = excluded.revision_physical_ms,revision_counter = excluded.revision_counter,
            source_device_id = excluded.source_device_id,server_cursor = excluded.server_cursor
          returning * into current_record;
          outcome := 'accepted';
        else outcome := 'superseded'; end if;
      end if;
    exception when others then outcome := 'invalid'; end;
    acknowledgements := acknowledgements || jsonb_build_array(jsonb_build_object(
      'kind',item->>'kind','key',item->>'key','revisionPhysicalMs',item->'revisionPhysicalMs',
      'revisionCounter',item->'revisionCounter','status',outcome,
      'winner',case when outcome in ('accepted','superseded') then sync_internal.record_json(current_record) else null end));
  end loop;
  update public.sync_profiles set cursor = p.cursor, initialized = initialized or jsonb_array_length(p_records) > 0 where user_id = sync_internal.user_id();
  update public.sync_devices set last_seen_at = now() where user_id = sync_internal.user_id() and device_id = p_device_id;
  select coalesce(jsonb_agg(sync_internal.record_json(page) order by page.server_cursor),'[]'::jsonb), coalesce(max(page.server_cursor),p_after_cursor)
    into downloaded,next_cursor from (select r.* from public.sync_records r where user_id = sync_internal.user_id()
      and generation = p.generation and server_cursor > p_after_cursor order by server_cursor limit 100) page;
  return jsonb_build_object('protocolVersion',1,'userId',sync_internal.user_id(),'deviceId',p_device_id,'generation',p.generation,
    'serverTimeMs',server_time,'cursor',next_cursor,'records',downloaded,'acknowledgements',acknowledgements,
    'hasMore',exists(select from public.sync_records where user_id = sync_internal.user_id() and generation = p.generation and server_cursor > next_cursor));
end $$;

create function sync_internal.devices() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare sid uuid := sync_internal.session_id(); result jsonb;
begin
  if not exists(select from public.sync_devices where user_id = sync_internal.user_id() and session_id = sid and revoked_at is null) then
    raise exception 'sync_device_revoked' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('deviceId',device_id,'displayName',display_name,
    'lastSeenAt',last_seen_at,'revokedAt',revoked_at,'current',session_id = sid) order by created_at),'[]') into result
    from public.sync_devices where user_id = sync_internal.user_id();
  return result;
end $$;

create function sync_internal.revoke_device(p_device_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare sid uuid := sync_internal.session_id();
begin
  perform 1 from public.sync_profiles where user_id = sync_internal.user_id() for update;
  if not exists(select from public.sync_devices where user_id = sync_internal.user_id() and session_id = sid and revoked_at is null) then
    raise exception 'sync_device_revoked' using errcode = '42501'; end if;
  update public.sync_devices set revoked_at = coalesce(revoked_at,now()) where user_id = sync_internal.user_id() and device_id = p_device_id;
end $$;

create function sync_internal.reset_profile(p_generation bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
declare sid uuid := sync_internal.session_id(); g bigint;
begin
  select generation into g from public.sync_profiles where user_id = sync_internal.user_id() for update;
  if not exists(select from public.sync_devices where user_id = sync_internal.user_id() and session_id = sid and revoked_at is null) then
    raise exception 'sync_device_revoked' using errcode = '42501'; end if;
  if g is distinct from p_generation then raise exception 'sync_generation_changed'; end if;
  delete from public.sync_records where user_id = sync_internal.user_id();
  update public.sync_profiles set generation = generation + 1,cursor = 0,initialized = false where user_id = sync_internal.user_id() returning generation into g;
  return g;
end $$;

-- Snapshot initialization/replacement is one transaction, including all pages.
-- Any invalid record rolls back the generation change and the entire snapshot.
create function sync_internal.replace_profile(p_generation bigint,p_device_id uuid,p_records jsonb,p_replace boolean) returns bigint
language plpgsql security definer set search_path = '' as $$
declare sid uuid := sync_internal.session_id(); p public.sync_profiles; page jsonb; result jsonb; offset_rows integer := 0;
  server_time bigint := floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
  select * into p from public.sync_profiles where user_id=sync_internal.user_id() for update;
  if not found or p.generation is distinct from p_generation then raise exception 'sync_generation_changed'; end if;
  if not exists(select from public.sync_devices where user_id=sync_internal.user_id() and device_id=p_device_id and session_id=sid and revoked_at is null) then
    raise exception 'sync_device_revoked' using errcode='42501'; end if;
  if p_records is null or jsonb_typeof(p_records)<>'array' or jsonb_array_length(p_records)>1000 or octet_length(p_records::text)>4194304 then raise exception 'sync_snapshot_limit'; end if;
  if p_replace is true then p.generation:=sync_internal.reset_profile(p_generation);
  elsif p.initialized then raise exception 'sync_profile_already_initialized'; end if;
  while offset_rows<jsonb_array_length(p_records) loop
    select jsonb_agg(item || jsonb_build_object('revisionPhysicalMs',server_time,'revisionCounter',0)) into page
      from (select item from jsonb_array_elements(p_records) with ordinality a(item,n) order by n limit 10 offset offset_rows) items;
    result:=sync_internal.apply_batch(1,p.generation,p_device_id,0,page);
    if exists(select from jsonb_array_elements(result->'acknowledgements') a where a->>'status' not in ('accepted','superseded')) then
      raise exception 'sync_snapshot_invalid'; end if;
    offset_rows:=offset_rows+10;
  end loop;
  update public.sync_profiles set initialized=true where user_id=sync_internal.user_id();
  return p.generation;
end $$;

-- Executors have RLS-constrained table access; authenticated callers only have
-- execution access to these closed operations, never generic SQL or table DML.
grant create on schema sync_internal to configuration_sync_executor;
alter function sync_internal.enroll(uuid,text) owner to configuration_sync_executor;
alter function sync_internal.apply_batch(integer,bigint,uuid,bigint,jsonb) owner to configuration_sync_executor;
alter function sync_internal.devices() owner to configuration_sync_executor;
alter function sync_internal.revoke_device(uuid) owner to configuration_sync_executor;
alter function sync_internal.reset_profile(bigint) owner to configuration_sync_executor;
alter function sync_internal.replace_profile(bigint,uuid,jsonb,boolean) owner to configuration_sync_executor;
revoke create on schema sync_internal from configuration_sync_executor;
revoke all on function sync_internal.enroll(uuid,text),sync_internal.apply_batch(integer,bigint,uuid,bigint,jsonb),
  sync_internal.devices(),sync_internal.revoke_device(uuid),sync_internal.reset_profile(bigint) from public,anon;
grant execute on function sync_internal.enroll(uuid,text),sync_internal.apply_batch(integer,bigint,uuid,bigint,jsonb),
  sync_internal.devices(),sync_internal.revoke_device(uuid),sync_internal.reset_profile(bigint) to authenticated;
revoke all on function sync_internal.replace_profile(bigint,uuid,jsonb,boolean) from public,anon;
grant execute on function sync_internal.replace_profile(bigint,uuid,jsonb,boolean) to authenticated;

create function public.sync_enroll_device(p_device_id uuid,p_device_name text) returns jsonb
language sql security invoker set search_path = '' as $$ select sync_internal.enroll(p_device_id,p_device_name) $$;
create function public.sync_apply_batch(p_protocol_version integer,p_generation bigint,p_device_id uuid,p_after_cursor bigint,p_records jsonb) returns jsonb
language sql security invoker set search_path = '' as $$ select sync_internal.apply_batch(p_protocol_version,p_generation,p_device_id,p_after_cursor,p_records) $$;
create function public.sync_list_devices() returns jsonb
language sql security invoker set search_path = '' as $$ select sync_internal.devices() $$;
create function public.sync_revoke_device(p_device_id uuid) returns void
language sql security invoker set search_path = '' as $$ select sync_internal.revoke_device(p_device_id) $$;
create function public.sync_reset_profile(p_generation bigint) returns bigint
language sql security invoker set search_path = '' as $$ select sync_internal.reset_profile(p_generation) $$;
create function public.sync_replace_profile(p_generation bigint,p_device_id uuid,p_records jsonb,p_replace boolean) returns bigint
language sql security invoker set search_path = '' as $$ select sync_internal.replace_profile(p_generation,p_device_id,p_records,p_replace) $$;
revoke all on function public.sync_replace_profile(bigint,uuid,jsonb,boolean) from public,anon;
grant execute on function public.sync_replace_profile(bigint,uuid,jsonb,boolean) to authenticated;
revoke all on function public.sync_enroll_device(uuid,text),public.sync_apply_batch(integer,bigint,uuid,bigint,jsonb),
  public.sync_list_devices(),public.sync_revoke_device(uuid),public.sync_reset_profile(bigint) from public,anon;
grant execute on function public.sync_enroll_device(uuid,text),public.sync_apply_batch(integer,bigint,uuid,bigint,jsonb),
  public.sync_list_devices(),public.sync_revoke_device(uuid),public.sync_reset_profile(bigint) to authenticated;
