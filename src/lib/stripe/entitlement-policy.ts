import Stripe from 'stripe';

export type DerivedEntitlement = {
  status: 'active' | 'read_only';
  paidThrough: Date | null;
};

export function deriveSubscriptionEntitlement(subscription: Pick<Stripe.Subscription, 'status' | 'cancel_at_period_end' | 'items'>): DerivedEntitlement {
  const paidThrough = subscription.items.data.reduce<Date | null>((latest, item) => {
    const periodEnd = item.current_period_end ? new Date(item.current_period_end * 1000) : null;
    return periodEnd && (!latest || periodEnd > latest) ? periodEnd : latest;
  }, null);

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return { status: 'active', paidThrough };
  }

  return { status: 'read_only', paidThrough };
}
