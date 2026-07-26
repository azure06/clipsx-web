import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { applyStripeWebhookProjection } from '@/lib/stripe/supabase-projector';

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
    const record = toStripeWebhookInboxRecord(event);
    const requestId = crypto.randomUUID();
    const { data: claim, error: claimError } = await supabase.schema('private').rpc('claim_stripe_webhook_event', {
      p_livemode: record.livemode,
      p_stripe_event_id: record.stripe_event_id,
      p_event_type: record.event_type,
      p_object_type: record.object_type,
      p_object_id: record.object_id,
      p_stripe_event_created_at: record.stripe_event_created_at,
      p_request_id: requestId,
      p_lease_seconds: 25,
    });

    if (claimError) throw new Error(`Webhook claim failed: ${claimError.message}`);
    if (claim === 'processed') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (claim === 'in_progress') {
      return NextResponse.json({ error: 'Webhook event is still processing' }, { status: 500 });
    }

    try {
      await applyStripeWebhookProjection({ supabase, stripe, event, record, requestId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown projection failure';
      await supabase.schema('private').rpc('fail_stripe_webhook_event', {
        p_livemode: record.livemode,
        p_stripe_event_id: record.stripe_event_id,
        p_request_id: requestId,
        p_error: message,
      });
      throw error;
    }
  } catch (error) {
    console.error('Failed to handle Stripe webhook event', {
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Webhook projection failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
