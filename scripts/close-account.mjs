import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Administrative lifecycle command. Nothing is selected implicitly.
const args = process.argv.slice(2);
const accountId = args[args.indexOf('--user') + 1];
const confirmation = args[args.indexOf('--confirm') + 1];
if (!args.includes('--user') || !args.includes('--confirm') || accountId !== confirmation
  || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId ?? '')) {
  throw new Error('Usage: node --env-file=.env.local scripts/close-account.mjs --user UUID --confirm UUID');
}
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: accounts, error: accountError } = await db.schema('private').from('billing_accounts').select('id').eq('owner_user_id', accountId);
if (accountError) throw new Error(`Account lookup failed (${accountError.code})`);
const { data: customers, error: customerError } = await db.schema('private').from('billing_customers')
  .select('stripe_customer_id,livemode').in('billing_account_id', accounts.map((account) => account.id));
if (customerError) throw new Error(`Customer lookup failed (${customerError.code})`);

// Cancel in Stripe first. Retrying is safe; retained financial records stay in
// Stripe and the local billing projection. Webhooks establish local completion.
for (const customer of customers) {
  const key = customer.livemode ? process.env.STRIPE_SECRET_KEY : process.env.STRIPE_TEST_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes('_live_') !== customer.livemode) throw new Error('A matching Stripe key is required for every customer mode.');
  const stripe = new Stripe(key, { apiVersion: '2026-06-24.dahlia' });
  for await (const subscription of stripe.subscriptions.list({ customer: customer.stripe_customer_id, status: 'all', limit: 100 })) {
    if (!['canceled', 'incomplete_expired'].includes(subscription.status)) await stripe.subscriptions.cancel(subscription.id);
  }
}
const { data: closed, error: closeError } = await db.schema('private').rpc('close_account', { p_account_id: accountId });
if (closeError) {
  if (closeError.message.includes('cancel_subscriptions_before_closure')) throw new Error('Wait for cancellation webhooks (or replay them), then retry closure. The database has not been closed.');
  throw new Error(`Account closure failed (${closeError.code}): ${closeError.message}`);
}
if (!closed) throw new Error('Account principal was not found.');
const { error: deleteError } = await db.auth.admin.deleteUser(accountId);
if (deleteError && deleteError.status !== 404) throw new Error('App data is closed and sessions revoked; retry to finish Auth identity deletion.');
console.log('Account closed; Auth identity removed. Billing records and public keys needed by other members’ signed history are retained.');
