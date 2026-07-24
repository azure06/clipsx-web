import { describe, expect, it } from 'vitest';

import { createCheckoutIntegrationIdentifier, getStripeLivemode } from './billing-customer';

describe('Stripe billing customer helpers', () => {
  it('keeps Stripe test and live customer mappings separate', () => {
    expect(getStripeLivemode('sk_test_example')).toBe(false);
    expect(getStripeLivemode('rk_test_example')).toBe(false);
    expect(getStripeLivemode('sk_live_example')).toBe(true);
    expect(getStripeLivemode('rk_live_example')).toBe(true);
  });

  it('rejects keys with an unknown mode prefix', () => {
    expect(() => getStripeLivemode('not-a-stripe-key')).toThrow('Unable to determine Stripe livemode');
  });

  it('creates an eight-letter Checkout integration identifier suffix', () => {
    expect(createCheckoutIntegrationIdentifier('12345678-ABCD')).toBe('clipsx_checkout_abcdxxxx');
  });
});
