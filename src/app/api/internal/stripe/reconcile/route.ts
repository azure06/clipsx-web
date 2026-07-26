import { NextRequest, NextResponse } from 'next/server';

import { getStripe } from '@/lib/stripe';
import { getStripeLivemode } from '@/lib/stripe/billing-customer';
import { createSupabaseStripeProjector } from '@/lib/stripe/supabase-projector';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  const reconciled = await createSupabaseStripeProjector(createAdminClient(), stripe)
    .reconcileMappedCustomers(getStripeLivemode());
  return NextResponse.json({ reconciled });
}
