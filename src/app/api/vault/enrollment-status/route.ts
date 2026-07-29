import { NextRequest, NextResponse } from 'next/server';

import { encodeCanonicalCbor } from '@/lib/vault/protocol';
import { createClient, getVaultPrincipal } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function response(status: number, values: Map<number, import('@/lib/vault/protocol').CborValue>) {
  const encoded = encodeCanonicalCbor(values).slice();
  return new NextResponse(encoded.buffer as ArrayBuffer, { status, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/cbor' } });
}

export async function GET(request: NextRequest) {
  const principal = await getVaultPrincipal();
  if (!principal) return response(401, new Map([[1, 'unauthorized']]));
  const deviceId = request.nextUrl.searchParams.get('deviceId');
  const supabase = await createClient();
  const [{ count }, { data: device }, { data: operations }] = await Promise.all([
    supabase.from('vault_devices').select('id', { count: 'exact', head: true }).eq('account_id', principal.user.id).eq('status', 'active'),
    deviceId ? supabase.from('vault_devices').select('status').eq('account_id', principal.user.id).eq('id', deviceId).maybeSingle() : Promise.resolve({ data: null }),
    deviceId ? supabase.from('vault_account_operations').select('operation_hash').eq('account_id', principal.user.id).order('sequence_number', { ascending: false }).limit(1) : Promise.resolve({ data: null }),
  ]);
  const head = typeof operations?.[0]?.operation_hash === 'string' ? new Uint8Array(Buffer.from(operations[0].operation_hash, 'base64')) : null;
  return response(200, new Map<number, import('@/lib/vault/protocol').CborValue>([
    [1, 1], [2, (count ?? 0) > 0], [3, typeof device?.status === 'string' ? device.status : 'unknown'],
    ...(head ? [[4, head] as [number, Uint8Array]] : []), [5, principal.sessionId],
  ]));
}
