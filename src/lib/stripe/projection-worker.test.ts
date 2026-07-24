import { describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';

import {
  type BillingWebhookInboxStore,
  type ClaimedStripeWebhookEvent,
  processStripeWebhookInbox,
} from './projection-worker';

const event: ClaimedStripeWebhookEvent = {
  livemode: false,
  stripe_event_id: 'evt_123',
  event_type: 'customer.subscription.updated',
  object_type: 'subscription',
  object_id: 'sub_123',
  stripe_event_created_at: '2026-07-24T00:00:00.000Z',
  attempts: 1,
};

function createStore(overrides: Partial<BillingWebhookInboxStore> = {}): BillingWebhookInboxStore {
  return {
    claim: vi.fn().mockResolvedValue([event]),
    complete: vi.fn().mockResolvedValue(true),
    fail: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function createStripeEvent(): Stripe.Event {
  return {
    id: event.stripe_event_id,
    livemode: event.livemode,
    type: event.event_type,
    data: { object: { id: event.object_id, object: event.object_type } },
  } as unknown as Stripe.Event;
}

describe('processStripeWebhookInbox', () => {
  it('projects a canonical Stripe event and completes its lease', async () => {
    const store = createStore();
    const stripe = { events: { retrieve: vi.fn().mockResolvedValue(createStripeEvent()) } } as unknown as Pick<Stripe, 'events'>;
    const projector = { project: vi.fn().mockResolvedValue(undefined) };

    await expect(processStripeWebhookInbox(store, stripe, projector, { workerId: 'worker-a' })).resolves.toEqual({
      claimed: 1,
      processed: 1,
      failed: 0,
      leaseLost: 0,
    });
    expect(projector.project).toHaveBeenCalledWith(event, expect.objectContaining({ id: 'evt_123' }));
    expect(store.complete).toHaveBeenCalledWith(event, 'worker-a');
  });

  it('retries with exponential backoff when canonical retrieval or projection fails', async () => {
    const store = createStore();
    const stripe = { events: { retrieve: vi.fn().mockRejectedValue(new Error('Stripe is unavailable')) } } as unknown as Pick<Stripe, 'events'>;
    const projector = { project: vi.fn() };

    await expect(processStripeWebhookInbox(store, stripe, projector, { workerId: 'worker-a' })).resolves.toEqual({
      claimed: 1,
      processed: 0,
      failed: 1,
      leaseLost: 0,
    });
    expect(store.fail).toHaveBeenCalledWith(event, 'worker-a', 30, 'Stripe is unavailable');
  });

  it('does not overwrite an event after its lease has been reclaimed', async () => {
    const store = createStore({ complete: vi.fn().mockResolvedValue(false) });
    const stripe = { events: { retrieve: vi.fn().mockResolvedValue(createStripeEvent()) } } as unknown as Pick<Stripe, 'events'>;
    const projector = { project: vi.fn().mockResolvedValue(undefined) };

    await expect(processStripeWebhookInbox(store, stripe, projector, { workerId: 'worker-a' })).resolves.toEqual({
      claimed: 1,
      processed: 0,
      failed: 0,
      leaseLost: 1,
    });
  });
});
