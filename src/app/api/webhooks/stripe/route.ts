import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  isSupportedStripeWebhookEvent,
  toStripeWebhookInboxRecord,
} from '@/lib/stripe/webhook-event';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook verification failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!isSupportedStripeWebhookEvent(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .schema('private')
      .from('billing_webhook_events')
      .insert(toStripeWebhookInboxRecord(event));

    if (error?.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (error) {
      console.error('Failed to persist Stripe webhook event', {
        eventId: event.id,
        eventType: event.type,
        error: error.message,
      });
      return NextResponse.json({ error: 'Webhook persistence failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to handle Stripe webhook event', {
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Webhook persistence failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
