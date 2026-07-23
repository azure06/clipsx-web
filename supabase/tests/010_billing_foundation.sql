begin;

select plan(8);

select has_schema('private', 'private schema exists for server-only billing data');
select has_table('private', 'billing_accounts', 'billing accounts table exists');
select has_column('private', 'billing_accounts', 'id', 'billing account has an ID');
select col_type_is('private', 'billing_accounts', 'id', 'uuid', 'billing account ID is UUID');
select col_not_null('private', 'billing_accounts', 'owner_user_id', 'billing account owner is required');
select has_column('private', 'billing_accounts', 'created_at', 'billing account tracks creation time');
select has_column('private', 'billing_accounts', 'updated_at', 'billing account tracks update time');
select hasnt_table('public', 'billing_accounts', 'billing accounts are not in the public schema');

select * from finish();

rollback;
