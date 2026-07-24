import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getStripe } from '@/lib/stripe';
import {
  BILLING_ACCOUNT_METADATA_KEY,
  createCheckoutIntegrationIdentifier,
  getOrCreateStripeCustomer,
  getPersonalBillingAccountId,
  getStripeLivemode,
} from '@/lib/stripe/billing-customer';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';

const body = z.object({
  plan: z.literal('pro'),
  interval: z.enum(['monthly', 'yearly']),
});

function getProPriceId(interval: 'monthly' | 'yearly') {
  return interval === 'monthly'
    ? process.env.STRIPE_PRICE_ID_PRO_MONTHLY
    : process.env.STRIPE_PRICE_ID_PRO_YEARLY;
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = body.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const priceId = getProPriceId(parsed.data.interval);
  if (!priceId) {
    return NextResponse.json({ error: 'Pro checkout is not configured' }, { status: 503 });
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
    const stripe = getStripe();
    const supabase = createAdminClient();
    const billingAccountId = await getPersonalBillingAccountId(supabase, user.id);
    const customerId = await getOrCreateStripeCustomer({
      supabase,
      stripe,
      billingAccountId,
      email: user.email,
      livemode: getStripeLivemode(),
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: billingAccountId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/account?checkout=success`,
      cancel_url: `${siteUrl}/pricing`,
      integration_identifier: createCheckoutIntegrationIdentifier(),
      metadata: {
        [BILLING_ACCOUNT_METADATA_KEY]: billingAccountId,
        plan: parsed.data.plan,
      },
      subscription_data: {
        metadata: { [BILLING_ACCOUNT_METADATA_KEY]: billingAccountId },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Failed to create Stripe Checkout session', {
      userId: user.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Unable to start checkout' }, { status: 500 });
  }
}
