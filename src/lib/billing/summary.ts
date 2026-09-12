import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { getStripeLivemode } from '../stripe/billing-customer';

import { resolveBillingWorkspace, type BillingWorkspace } from './workspace';

export type BillingSummary = BillingWorkspace & {
  planCode: 'free' | 'pro';
  entitlementStatus: 'active' | 'read_only';
  paidThrough: string | null;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
};

export async function getBillingSummary(
  supabase: SupabaseClient,
  userId: string,
  workspaceId?: string,
): Promise<BillingSummary> {
  const workspace = await resolveBillingWorkspace(supabase, userId, workspaceId);
  const { data, error } = await supabase
    .schema('private')
    .from('account_entitlements')
    .select('status, paid_through, source_subscription_id, plans!inner(code)')
    .eq('billing_account_id', workspace.billingAccountId)
    .eq('livemode', getStripeLivemode())
    .single();
  if (error) throw new Error(`Unable to load account entitlement: ${error.message}`);

  const entitlement = data as unknown as {
    status: 'active' | 'read_only';
    paid_through: string | null;
    source_subscription_id: string | null;
    plans: { code: 'free' | 'pro' };
  };
  let subscriptionStatus: string | null = null;
  let cancelAtPeriodEnd = false;
  if (entitlement.source_subscription_id) {
    const { data: subscription, error: subscriptionError } = await supabase
      .schema('private')
      .from('billing_subscriptions')
      .select('status, cancel_at_period_end')
      .eq('id', entitlement.source_subscription_id)
      .maybeSingle();
    if (subscriptionError) throw new Error(`Unable to load subscription: ${subscriptionError.message}`);
    if (subscription) {
      subscriptionStatus = (subscription as { status: string }).status;
      cancelAtPeriodEnd = (subscription as { cancel_at_period_end: boolean }).cancel_at_period_end;
    }
  }

  return {
    ...workspace,
    planCode: entitlement.plans.code,
    entitlementStatus: entitlement.status === 'active' && entitlement.paid_through !== null
      && Date.parse(entitlement.paid_through) <= Date.now() ? 'read_only' : entitlement.status,
    paidThrough: entitlement.paid_through,
    subscriptionStatus,
    cancelAtPeriodEnd,
  };
}
