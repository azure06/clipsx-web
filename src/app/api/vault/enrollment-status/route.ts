import { NextRequest } from 'next/server';

import { vaultCborError as createVaultCborError, vaultCborResponse as createVaultCborResponse } from '@/lib/vault/http';
import type { CborValue } from '@/lib/vault/protocol';
import { createClient, getVaultPrincipal } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const vaultCborError = (status: number, code: string) => createVaultCborError(status, code, requestId);
  const vaultCborResponse = (status: number, value: Map<number, CborValue>) => createVaultCborResponse(status, value, requestId);
  try {
    const principal = await getVaultPrincipal();
    if (!principal) return vaultCborError(401, 'unauthorized');
    const deviceId = request.nextUrl.searchParams.get('deviceId');
    const supabase = await createClient();
    const [deviceCount, deviceResult] = await Promise.all([
      supabase.from('vault_devices').select('id', { count: 'exact', head: true }).eq('account_id', principal.user.id).eq('status', 'active'),
      deviceId
        ? supabase.from('vault_devices').select('status').eq('account_id', principal.user.id).eq('id', deviceId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (deviceCount.error || deviceResult.error) {
      console.error({
        requestId,
        endpoint: 'enrollment-status',
        stage: 'query',
        code: deviceCount.error?.code ?? deviceResult.error?.code,
      });
      return vaultCborError(503, 'enrollment-status-unavailable');
    }
    return vaultCborResponse(200, new Map<number, CborValue>([
      [1, 1],
      [2, (deviceCount.count ?? 0) > 0],
      [3, typeof deviceResult.data?.status === 'string' ? deviceResult.data.status : 'unknown'],
    ]));
  } catch {
    console.error({ requestId, endpoint: 'enrollment-status', stage: 'unexpected' });
    return vaultCborError(503, 'enrollment-status-unavailable');
  }
}
