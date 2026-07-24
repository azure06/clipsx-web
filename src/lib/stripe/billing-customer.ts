import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

const BILLING_ACCOUNT_METADATA_KEY = 'clipsx_billing_account_id';

type BillingAccount = { id: string };
type BillingCustomer = { stripe_customer_id: string };

export function getStripeLivemode(secretKey = process.env.STRIPE_SECRET_KEY) {
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  if (secretKey.startsWith('sk_live_') || secretKey.startsWith('rk_live_')) return true;
  if (secretKey.startsWith('sk_test_') || secretKey.startsWith('rk_test_')) return false;
  throw new Error('Unable to determine Stripe livemode from STRIPE_SECRET_KEY');
}

export function createCheckoutIntegrationIdentifier(random = crypto.randomUUID()) {
  return `clipsx_checkout_${random.replace(/[^a-z]/gi, '').toLowerCase().slice(0, 8).padEnd(8, 'x')}`;
}

export async function getPersonalBillingAccountId(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .schema('private')
    .from('billing_accounts')
    .select('id')
    .eq('owner_user_id', userId)
    .eq('kind', 'personal')
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw new Error(`Unable to load billing account: ${error.message}`);
  if (!data) throw new Error('No active personal billing account exists for this user');
  return (data as BillingAccount).id;
}

export async function getOrCreateStripeCustomer({
  supabase,
  stripe,
  billingAccountId,
  email,
  livemode,
}: {
  supabase: SupabaseClient;
  stripe: Pick<Stripe, 'customers'>;
  billingAccountId: string;
  email?: string;
  livemode: boolean;
}) {
  const existing = await supabase
    .schema('private')
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('billing_account_id', billingAccountId)
    .eq('livemode', livemode)
    .is('stripe_deleted_at', null)
    .maybeSingle();

  if (existing.error) throw new Error(`Unable to load Stripe customer: ${existing.error.message}`);
  if (existing.data) return (existing.data as BillingCustomer).stripe_customer_id;

  const customer = await stripe.customers.create(
    { email, metadata: { [BILLING_ACCOUNT_METADATA_KEY]: billingAccountId } },
    { idempotencyKey: `clipsx-billing-customer-${livemode ? 'live' : 'test'}-${billingAccountId}` },
  );

  if (customer.livemode !== livemode) {
    throw new Error('Created Stripe customer does not match the configured livemode');
  }

  const inserted = await supabase.schema('private').from('billing_customers').insert({
    billing_account_id: billingAccountId,
    stripe_customer_id: customer.id,
    livemode,
    stripe_created_at: new Date(customer.created * 1000).toISOString(),
  });

  if (!inserted.error) return customer.id;
  if (inserted.error.code !== '23505') {
    throw new Error(`Unable to persist Stripe customer mapping: ${inserted.error.message}`);
  }

  const concurrent = await supabase
    .schema('private')
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('billing_account_id', billingAccountId)
    .eq('livemode', livemode)
    .maybeSingle();

  if (concurrent.error || !concurrent.data) {
    throw new Error(`Unable to resolve concurrent Stripe customer mapping: ${concurrent.error?.message ?? 'not found'}`);
  }

  return (concurrent.data as BillingCustomer).stripe_customer_id;
}

export { BILLING_ACCOUNT_METADATA_KEY };
