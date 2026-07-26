import { NextRequest, NextResponse } from 'next/server';

import { getStripe } from '@/lib/stripe';
import { processStripeWebhookInbox } from '@/lib/stripe/projection-worker';
import { createSupabaseStripeProjector } from '@/lib/stripe/supabase-projector';
import { createSupabaseBillingWebhookInbox } from '@/lib/stripe/supabase-webhook-inbox';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const result = await processStripeWebhookInbox(
    createSupabaseBillingWebhookInbox(supabase),
    getStripe(),
    createSupabaseStripeProjector(supabase, getStripe()),
    { workerId: `vercel-cron-${crypto.randomUUID()}` },
  );
  return NextResponse.json(result);
}
