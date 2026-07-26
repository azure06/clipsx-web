begin;

select plan(12);

select has_table('private', 'organizations', 'organization workspace table exists');
select has_table('private', 'organization_memberships', 'organization membership table exists');
select has_column('private', 'billing_accounts', 'organization_id', 'organization billing accounts link to a workspace');
select col_not_null('private', 'organizations', 'created_at', 'organizations track creation time');
select col_not_null('private', 'organizations', 'updated_at', 'organizations track update time');
select col_not_null('private', 'organization_memberships', 'created_at', 'memberships track creation time');
select col_not_null('private', 'organization_memberships', 'updated_at', 'memberships track update time');
select has_index('private', 'billing_accounts', 'billing_accounts_one_account_per_organization', 'an organization has one billing account');
select has_index('private', 'organization_memberships', 'organization_memberships_active_user_idx', 'workspace lookup is indexed for active members');
select has_function('private', 'recompute_account_entitlement', array['uuid'], 'billing projection can recompute a local entitlement');
select ok(has_table_privilege('service_role', 'private.organizations', 'select'), 'service role can access organizations');
select ok(not has_table_privilege('authenticated', 'private.organizations', 'select'), 'browser role cannot access organizations directly');

select * from finish();

rollback;
