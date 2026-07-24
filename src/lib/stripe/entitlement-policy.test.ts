import { describe, expect, it } from 'vitest';
import Stripe from 'stripe';

import { deriveSubscriptionEntitlement } from './entitlement-policy';

function subscription(status: Stripe.Subscription.Status) {
  return {
    status,
    cancel_at_period_end: false,
    items: { data: [{ current_period_end: 1_800_000_000 }] },
  } as unknown as Pick<Stripe.Subscription, 'status' | 'cancel_at_period_end' | 'items'>;
}

describe('deriveSubscriptionEntitlement', () => {
  it('keeps active and trialing subscriptions writable', () => {
    expect(deriveSubscriptionEntitlement(subscription('active')).status).toBe('active');
    expect(deriveSubscriptionEntitlement(subscription('trialing')).status).toBe('active');
  });

  it.each(['past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'canceled', 'paused'] as const)(
    'immediately makes %s subscriptions read-only',
    (status) => expect(deriveSubscriptionEntitlement(subscription(status)).status).toBe('read_only'),
  );
});
