import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const required = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL'];
for (const name of required) if (!process.env[name]) throw new Error(`${name} is required`);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const webhookUrl = process.env.STRIPE_REPLAY_WEBHOOK_URL ?? 'http://127.0.0.1:3000/api/webhooks/stripe';
const livemode = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') || process.env.STRIPE_SECRET_KEY.startsWith('rk_live_');

const suppliedIds = process.env.STRIPE_REPLAY_EVENT_IDS?.split(',').map((id) => id.trim()).filter(Boolean);
let eventIds = suppliedIds ?? [];

if (eventIds.length === 0) {
  const { data, error } = await supabase.schema('private').from('billing_webhook_events')
    .select('stripe_event_id').eq('livemode', livemode).or(`processing_state.in.(pending,failed),and(processing_state.eq.processing,lease_expires_at.lt.${new Date().toISOString()})`).order('received_at');
  if (error) throw new Error(`Unable to load pending Stripe events: ${error.message}`);
  eventIds = (data ?? []).map((row) => row.stripe_event_id);
}

if (eventIds.length === 0) console.log('No pending or failed Stripe events to replay.');

for (const eventId of eventIds) {
  const event = await stripe.events.retrieve(eventId);
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const response = await fetch(webhookUrl, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body: payload });
  console.log(`${eventId}: ${response.status} ${await response.text()}`);
}
