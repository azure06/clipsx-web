begin;
select plan(6);

select has_function(
  'private', 'append_vault_note_revision',
  'private note-append transaction exists'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.append_vault_note_revision(uuid,uuid,uuid,uuid,bytea,uuid,bytea,integer,bytea,bytea,bytea,bytea,bytea,bytea,bytea,bytea,uuid,bytea,bytea,bytea)',
    'execute'
  ),
  'browser roles cannot execute note append directly'
);
select ok(
  not has_function_privilege(
    'anon',
    'private.append_vault_note_revision(uuid,uuid,uuid,uuid,bytea,uuid,bytea,integer,bytea,bytea,bytea,bytea,bytea,bytea,bytea,bytea,uuid,bytea,bytea,bytea)',
    'execute'
  ),
  'anonymous roles cannot execute note append directly'
);
select is(
  private.append_vault_note_revision(gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), decode(repeat('00', 32), 'hex'), gen_random_uuid(), null, 1, decode(repeat('00', 16), 'hex'), decode(repeat('00', 12), 'hex'), decode(repeat('00', 16), 'hex'), decode(repeat('00', 12), 'hex'), decode(repeat('00', 32), 'hex'), decode(repeat('00', 32), 'hex'), decode(repeat('00', 32), 'hex'), decode(repeat('00', 64), 'hex'), gen_random_uuid(), decode('00', 'hex'), decode(repeat('00', 32), 'hex'), decode(repeat('00', 64), 'hex')),
  false,
  'wrong session or membership is rejected without a write'
);
select is((select count(*) from public.vault_notes), 0::bigint, 'rejected append leaves no note row');
select is((select count(*) from public.vault_note_revisions), 0::bigint, 'rejected append leaves no revision row');

select * from finish();
rollback;
