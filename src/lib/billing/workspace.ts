import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export type BillingWorkspace = {
  id: string;
  billingAccountId: string;
  kind: 'personal' | 'organization';
  name: string;
  role: 'owner' | 'admin' | 'member';
  canManageBilling: boolean;
};

type BillingAccountRow = {
  id: string;
  kind: 'personal' | 'organization';
  owner_user_id: string;
  organization_id: string | null;
};

type OrganizationRow = { id: string; name: string };
type MembershipRow = {
  organization_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'removed';
};

export async function listBillingWorkspaces(supabase: SupabaseClient, userId: string): Promise<BillingWorkspace[]> {
  const [{ data: personalAccounts, error: personalAccountError }, { data: memberships, error: membershipError }] = await Promise.all([
    supabase.schema('private').from('billing_accounts').select('id, kind, owner_user_id, organization_id')
      .eq('status', 'active').eq('kind', 'personal').eq('owner_user_id', userId),
    supabase.schema('private').from('organization_memberships').select('organization_id, role, status').eq('user_id', userId).eq('status', 'active'),
  ]);

  if (personalAccountError) throw new Error(`Unable to load personal billing account: ${personalAccountError.message}`);
  if (membershipError) throw new Error(`Unable to load organization memberships: ${membershipError.message}`);
  const typedMemberships = (memberships ?? []) as MembershipRow[];
  const organizationIds = typedMemberships.map((membership) => membership.organization_id);
  let organizationAccounts: BillingAccountRow[] = [];
  if (organizationIds.length > 0) {
    const { data, error } = await supabase.schema('private').from('billing_accounts')
      .select('id, kind, owner_user_id, organization_id').eq('status', 'active').eq('kind', 'organization').in('organization_id', organizationIds);
    if (error) throw new Error(`Unable to load organization billing accounts: ${error.message}`);
    organizationAccounts = (data ?? []) as BillingAccountRow[];
  }
  const accessibleAccounts = [...((personalAccounts ?? []) as BillingAccountRow[]), ...organizationAccounts];
  const membershipByOrganization = new Map(typedMemberships.map((membership) => [membership.organization_id, membership]));

  const accessibleOrganizationIds = accessibleAccounts
    .map((account) => account.organization_id)
    .filter((id): id is string => id !== null);
  const organizationById = new Map<string, OrganizationRow>();

  if (accessibleOrganizationIds.length > 0) {
    const { data: organizations, error } = await supabase
      .schema('private')
      .from('organizations')
      .select('id, name')
      .in('id', accessibleOrganizationIds);
    if (error) throw new Error(`Unable to load organizations: ${error.message}`);
    for (const organization of (organizations ?? []) as OrganizationRow[]) organizationById.set(organization.id, organization);
  }

  return accessibleAccounts.map((account) => {
    if (account.kind === 'personal') {
      return {
        id: 'personal',
        billingAccountId: account.id,
        kind: 'personal',
        name: 'Personal',
        role: 'owner',
        canManageBilling: true,
      };
    }
    const membership = membershipByOrganization.get(account.organization_id!);
    const organization = organizationById.get(account.organization_id!);
    if (!membership || !organization) throw new Error('Workspace membership is missing its organization');
    return {
      id: organization.id,
      billingAccountId: account.id,
      kind: 'organization',
      name: organization.name,
      role: membership.role,
      canManageBilling: membership.role === 'owner' || membership.role === 'admin',
    };
  });
}

export async function resolveBillingWorkspace(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string | undefined,
  requireBillingManager = false,
): Promise<BillingWorkspace> {
  const workspaces = await listBillingWorkspaces(supabase, userId);
  const workspace = workspaceId
    ? workspaces.find((candidate) => candidate.id === workspaceId)
    : workspaces.find((candidate) => candidate.kind === 'personal');

  if (!workspace) throw new Error('Workspace not found or not accessible');
  if (requireBillingManager && !workspace.canManageBilling) {
    throw new Error('Billing management requires an organization owner or admin');
  }
  return workspace;
}
