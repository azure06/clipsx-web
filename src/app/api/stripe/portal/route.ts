import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getStripe } from '@/lib/stripe';
import { resolveBillingWorkspace } from '@/lib/billing/workspace';
import { getStripeLivemode } from '@/lib/stripe/billing-customer';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';

const body = z.object({ workspaceId: z.string().uuid().optional() }).optional();

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
    const stripe = getStripe();
    const supabase = createAdminClient();
    const parsed = body.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    const workspace = await resolveBillingWorkspace(supabase, user.id, parsed.data?.workspaceId, true);
    const billingAccountId = workspace.billingAccountId;
    const { data: customer, error } = await supabase
      .schema('private')
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('billing_account_id', billingAccountId)
      .eq('livemode', getStripeLivemode())
      .is('stripe_deleted_at', null)
      .maybeSingle();

    if (error) throw new Error(`Unable to load Stripe customer: ${error.message}`);
    if (!customer) return NextResponse.json({ error: 'No billing customer found' }, { status: 404 });

    const session = await stripe.billingPortal.sessions.create({
      customer: (customer as { stripe_customer_id: string }).stripe_customer_id,
      return_url: `${siteUrl}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Failed to create Stripe Customer Portal session', {
      userId: user.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Unable to open billing portal' }, { status: 500 });
  }
}
