-- Supabase installs this event-trigger function to enable RLS automatically on
-- newly created public tables. Event triggers do not require Data API roles to
-- execute the backing function, so keep it unavailable as a public RPC.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
