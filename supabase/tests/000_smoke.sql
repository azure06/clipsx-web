begin;

select plan(3);

select ok(true, 'the local pgTAP harness is available');

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and has_function_privilege('anon', p.oid, 'execute')
  ),
  'anonymous callers cannot execute the platform RLS event-trigger function'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and has_function_privilege('authenticated', p.oid, 'execute')
  ),
  'authenticated callers cannot execute the platform RLS event-trigger function'
);

select * from finish();

rollback;
