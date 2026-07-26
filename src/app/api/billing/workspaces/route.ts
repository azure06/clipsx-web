import { NextResponse } from 'next/server';

import { listBillingWorkspaces } from '@/lib/billing/workspace';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    return NextResponse.json(await listBillingWorkspaces(createAdminClient(), user.id));
  } catch {
    return NextResponse.json({ error: 'Unable to load workspaces' }, { status: 500 });
  }
}
