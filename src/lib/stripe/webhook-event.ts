import Stripe from 'stripe';

export const supportedStripeWebhookEvents = new Set([
  'product.created',
  'product.updated',
  'product.deleted',
  'price.created',
  'price.updated',
  'customer.created',
  'customer.updated',
  'customer.deleted',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.finalization_failed',
  'invoice.voided',
  'invoice.marked_uncollectible',
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.expired',
]);

type StripeWebhookObject = {
  id: string;
  object: string;
};

export type StripeWebhookInboxRecord = {
  livemode: boolean;
  stripe_event_id: string;
  event_type: string;
  object_type: string;
  object_id: string;
  stripe_event_created_at: string;
};

export function isSupportedStripeWebhookEvent(eventType: string) {
  return supportedStripeWebhookEvents.has(eventType);
}

export function toStripeWebhookInboxRecord(event: Stripe.Event): StripeWebhookInboxRecord {
  const object = event.data.object as unknown as StripeWebhookObject;

  if (!object.id || !object.object) {
    throw new Error(`Stripe event ${event.id} does not contain an object identity`);
  }

  return {
    livemode: event.livemode,
    stripe_event_id: event.id,
    event_type: event.type,
    object_type: object.object,
    object_id: object.id,
    stripe_event_created_at: new Date(event.created * 1000).toISOString(),
  };
}
