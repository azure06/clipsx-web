import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import { buildStripeProjectionPayload } from './supabase-projector';

describe('Stripe subscription snapshot completeness', () => {
  it('loads every item page before replacing the local active item set', async () => {
    const product = { id: 'prod_pro', active: true, name: 'Pro', metadata: { clipsx_plan_code: 'pro' } };
    const item = (id: string) => ({ id, price: { id: `price_${id}`, product, currency: 'usd', active: true, billing_scheme: 'per_unit' }, quantity: 1 });
    const list = vi.fn(() => (async function* () { yield item('one'); yield item('two'); })());
    const stripe = {
      subscriptions: { retrieve: vi.fn(async () => ({ id: 'sub_1', customer: { id: 'cus_1', metadata: {} }, metadata: {}, status: 'active', items: { has_more: true, data: [item('one')] } })) },
      subscriptionItems: { list },
    } as unknown as Parameters<typeof buildStripeProjectionPayload>[1];
    const event = { data: { object: { object: 'subscription', id: 'sub_1' } } } as Stripe.Event;
    const result = await buildStripeProjectionPayload(event, stripe);
    expect(result.subscription_items.map((entry) => entry.id)).toEqual(['one', 'two']);
    expect(list).toHaveBeenCalledWith({ subscription: 'sub_1', limit: 100, expand: ['data.price.product'] });
  });
});
