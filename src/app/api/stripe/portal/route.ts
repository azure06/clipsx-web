import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getUser } from '@/lib/supabase/server';

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const stripe = getStripe();

  const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
  const customer = customers.data[0];

  if (!customer) {
    return NextResponse.json({ error: 'No billing customer found' }, { status: 404 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${siteUrl}/account`,
  });

  return NextResponse.json({ url: session.url });
}
