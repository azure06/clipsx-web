-- Removed entries leave the list and quota; their session remains blocked until Auth expires it.
alter table public.sync_devices add column removed_at timestamptz;
alter table public.sync_devices add constraint sync_removed_device_is_revoked
  check (removed_at is null or revoked_at is not null);

create or replace function sync_internal.enroll(p_device_id uuid, p_device_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare sid uuid := sync_internal.session_id(); p public.sync_profiles; d public.sync_devices;
begin
  insert into public.sync_profiles(user_id) values(sync_internal.user_id()) on conflict do nothing;
  select * into p from public.sync_profiles where user_id = sync_internal.user_id() for update;
  select * into d from public.sync_devices where user_id = sync_internal.user_id() and session_id = sid;
  if found then
    if d.revoked_at is not null then raise exception 'sync_device_revoked' using errcode = '42501'; end if;
    if d.display_name = 'This device' then
      update public.sync_devices set display_name = btrim(p_device_name) where user_id = d.user_id and device_id = d.device_id;
    end if;
  else
    -- Expired Auth sessions cannot re-enroll; their device records are safe to remove.
    delete from public.sync_devices expired_device where expired_device.user_id = sync_internal.user_id()
      and not sync_internal.is_live_session(expired_device.session_id);
    if (select count(*) from public.sync_devices where user_id = sync_internal.user_id() and removed_at is null) >= 64 then
      raise exception 'sync_device_limit';
    end if;
    insert into public.sync_devices(user_id, device_id, session_id, display_name)
      values(sync_internal.user_id(),case when exists(select from public.sync_devices where user_id=sync_internal.user_id() and device_id=p_device_id) then gen_random_uuid() else p_device_id end,sid,p_device_name) returning * into d;
  end if;
  return jsonb_build_object('deviceId',d.device_id,'generation',p.generation,'initialized',p.initialized,'serverTimeMs',floor(extract(epoch from clock_timestamp())*1000)::bigint);
end $$;

create or replace function sync_internal.devices() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare sid uuid := sync_internal.session_id(); result jsonb;
begin
  if not exists(select from public.sync_devices where user_id = sync_internal.user_id() and session_id = sid and revoked_at is null) then
    raise exception 'sync_device_revoked' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('deviceId',device_id,'displayName',display_name,
    'lastSeenAt',last_seen_at,'revokedAt',revoked_at,'current',session_id = sid) order by (session_id = sid) desc, last_seen_at desc, device_id),'[]') into result
    from public.sync_devices where user_id = sync_internal.user_id() and removed_at is null
      and sync_internal.is_live_session(session_id);
  return result;
end $$;

create function sync_internal.rename_device(p_device_id uuid, p_device_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare sid uuid := sync_internal.session_id();
begin
  perform 1 from public.sync_profiles where user_id = sync_internal.user_id() for update;
  if not exists(select from public.sync_devices where user_id = sync_internal.user_id() and session_id = sid and revoked_at is null) then
    raise exception 'sync_device_revoked' using errcode = '42501'; end if;
  if p_device_name is null or length(btrim(p_device_name)) not between 1 and 120 or p_device_name ~ '[[:cntrl:]]' then
    raise exception 'sync_device_name_invalid' using errcode = '22023'; end if;
  update public.sync_devices set display_name = btrim(p_device_name)
    where user_id = sync_internal.user_id() and device_id = p_device_id and removed_at is null;
  if not found then raise exception 'sync_device_not_found' using errcode = '22023'; end if;
end $$;

create function sync_internal.remove_device(p_device_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare sid uuid := sync_internal.session_id();
begin
  perform 1 from public.sync_profiles where user_id = sync_internal.user_id() for update;
  if not exists(select from public.sync_devices where user_id = sync_internal.user_id() and session_id = sid and revoked_at is null) then
    raise exception 'sync_device_revoked' using errcode = '42501'; end if;
  update public.sync_devices set revoked_at = coalesce(revoked_at,now()), removed_at = coalesce(removed_at,now()), display_name = 'Removed device'
    where user_id = sync_internal.user_id() and device_id = p_device_id;
  if not found then raise exception 'sync_device_not_found' using errcode = '22023'; end if;
end $$;

grant create on schema sync_internal to configuration_sync_executor;
alter function sync_internal.rename_device(uuid,text) owner to configuration_sync_executor;
alter function sync_internal.remove_device(uuid) owner to configuration_sync_executor;
revoke create on schema sync_internal from configuration_sync_executor;
revoke all on function sync_internal.rename_device(uuid,text), sync_internal.remove_device(uuid) from public, anon;
grant execute on function sync_internal.rename_device(uuid,text), sync_internal.remove_device(uuid) to authenticated;

create function public.sync_rename_device(p_device_id uuid,p_device_name text) returns void
language sql security invoker set search_path = '' as $$ select sync_internal.rename_device(p_device_id,p_device_name) $$;
create function public.sync_remove_device(p_device_id uuid) returns void
language sql security invoker set search_path = '' as $$ select sync_internal.remove_device(p_device_id) $$;
revoke all on function public.sync_rename_device(uuid,text), public.sync_remove_device(uuid) from public, anon;
grant execute on function public.sync_rename_device(uuid,text), public.sync_remove_device(uuid) to authenticated;
