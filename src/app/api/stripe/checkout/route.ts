import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe';
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/account?checkout=success`,
    cancel_url: `${siteUrl}/pricing`,
    metadata: { userId: user.id, plan: parsed.data.plan },
  });

  return NextResponse.json({ url: session.url });
}
