import { describe, expect, it } from 'vitest';
import Stripe from 'stripe';

import {
  isSupportedStripeWebhookEvent,
  toStripeWebhookInboxRecord,
} from './webhook-event';

function createEvent(type: string): Stripe.Event {
  return {
    id: 'evt_123',
    type,
    livemode: false,
    created: 1_721_728_000,
    data: {
      object: {
        id: 'sub_123',
        object: 'subscription',
      },
    },
  } as unknown as Stripe.Event;
}

describe('Stripe webhook event helpers', () => {
  it('accepts billing events required by the ClipsX projection', () => {
    expect(isSupportedStripeWebhookEvent('customer.subscription.updated')).toBe(true);
    expect(isSupportedStripeWebhookEvent('invoice.paid')).toBe(true);
    expect(isSupportedStripeWebhookEvent('charge.succeeded')).toBe(false);
  });

  it('creates a durable inbox record without retaining the raw payload', () => {
    expect(toStripeWebhookInboxRecord(createEvent('customer.subscription.updated'))).toEqual({
      livemode: false,
      stripe_event_id: 'evt_123',
      event_type: 'customer.subscription.updated',
      object_type: 'subscription',
      object_id: 'sub_123',
      stripe_event_created_at: '2024-07-23T09:46:40.000Z',
    });
  });
});
