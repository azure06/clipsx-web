create function private.read_vault_account_sync_page(
  p_requester_account_id uuid,
  p_requester_session_id uuid,
  p_target_account_id uuid,
  p_collection_id uuid,
  p_after bigint,
  p_anchor bytea,
  p_limit integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_after < 0 or p_limit < 1 or p_limit > 100
     or (p_after = 0 and p_anchor is not null)
     or (p_after > 0 and octet_length(p_anchor) <> 32)
     or not exists (
       select 1 from auth.sessions s
       where s.id = p_requester_session_id and s.user_id = p_requester_account_id
     )
     or (
       p_target_account_id <> p_requester_account_id
       and (
         p_collection_id is null
         or not exists (
           select 1 from public.vault_collection_memberships requester
           where requester.collection_id = p_collection_id
             and requester.account_id = p_requester_account_id
             and requester.status = 'active'
         )
         or not exists (
           select 1 from public.vault_collection_memberships target
           where target.collection_id = p_collection_id
             and target.account_id = p_target_account_id
             and target.status in ('active', 'removed')
         )
       )
     )
     or (
       p_after > 0 and not exists (
         select 1 from public.vault_account_operations operation
         where operation.account_id = p_target_account_id
           and operation.sequence_number = p_after
           and operation.operation_hash = p_anchor
       )
     ) then
    return null;
  end if;

  with page as (
    select operation.*
    from public.vault_account_operations operation
    where operation.account_id = p_target_account_id
      and operation.sequence_number > p_after
    order by operation.sequence_number
    limit p_limit + 1
  ), visible_page as (
    select * from page order by sequence_number limit p_limit
  )
  select jsonb_build_object(
    'operations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'operation_id', operation_id,
        'sequence_number', sequence_number,
        'operation_type', operation_type,
        'canonical_payload', encode(canonical_payload, 'base64'),
        'previous_operation_hash', case when previous_operation_hash is null then null else encode(previous_operation_hash, 'base64') end,
        'operation_hash', encode(operation_hash, 'base64'),
        'author_device_id', author_device_id,
        'recovery_key_id', recovery_key_id,
        'signature', encode(signature, 'base64')
      ) order by sequence_number) from visible_page
    ), '[]'::jsonb),
    'has_more', (select count(*) > p_limit from page),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'status', d.status,
        'encryption_public_key', encode(d.encryption_public_key, 'base64'),
        'signing_public_key', encode(d.signing_public_key, 'base64'),
        'revoked_at', d.revoked_at
      ) order by d.created_at, d.id)
      from public.vault_devices d where d.account_id = p_target_account_id
    ), '[]'::jsonb),
    'recovery_keys', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', key.id,
        'status', key.status,
        'key_version', key.key_version,
        'encryption_public_key', encode(key.encryption_public_key, 'base64'),
        'signing_public_key', encode(key.signing_public_key, 'base64'),
        'authorization_payload', encode(key.authorization_payload, 'base64'),
        'authorization_signature', encode(key.authorization_signature, 'base64')
      ) order by key.key_version)
      from public.vault_recovery_keys key where key.account_id = p_target_account_id
    ), '[]'::jsonb),
    'authorizations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'device_id', authz.device_id,
        'authorized_by_device_id', authz.authorized_by_device_id,
        'recovery_key_id', authz.recovery_key_id,
        'authorization_method', authz.authorization_method,
        'authorization_payload', encode(authz.authorization_payload, 'base64'),
        'authorization_payload_hash', encode(authz.authorization_payload_hash, 'base64'),
        'proof_payload', encode(authz.proof_of_possession_payload, 'base64'),
        'proof_signature', encode(authz.proof_of_possession_signature, 'base64'),
        'signature', encode(authz.signature, 'base64')
      ) order by authz.created_at, authz.id)
      from public.vault_device_authorizations authz
      where authz.account_id = p_target_account_id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function private.read_vault_account_sync_page(
  uuid, uuid, uuid, uuid, bigint, bytea, integer
) from public, anon, authenticated;

grant execute on function private.read_vault_account_sync_page( uuid, uuid, uuid, uuid, bigint, bytea, integer ) to service_role;
