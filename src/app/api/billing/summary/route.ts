import { NextRequest, NextResponse } from 'next/server';

import { getBillingSummary } from '@/lib/billing/summary';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const workspaceId = request.nextUrl.searchParams.get('workspace') ?? undefined;
    const summary = await getBillingSummary(createAdminClient(), user.id, workspaceId);
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load billing summary';
    const status = message.includes('not found') || message.includes('not accessible') ? 404 : 500;
    return NextResponse.json({ error: status === 404 ? 'Workspace not found' : 'Unable to load billing summary' }, { status });
  }
}
