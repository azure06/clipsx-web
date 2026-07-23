revoke all on schema private from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;

grant usage on schema private to service_role;
grant select, insert, update, delete on all tables in schema private to service_role;

alter default privileges for role postgres in schema private
  grant select, insert, update, delete on tables to service_role;
