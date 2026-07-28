import { NextRequest, NextResponse } from 'next/server';

import { admitVaultCommand } from '@/lib/vault/command-admission';
import { encodeCanonicalCbor } from '@/lib/vault/protocol';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function cborError(status: number, code: string) {
  const body = encodeCanonicalCbor(new Map([[1, code]])).slice();
  return new NextResponse(body.buffer as ArrayBuffer, {
    status,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/cbor' },
  });
}

function bytea(value: unknown): Uint8Array | null {
  if (typeof value !== 'string') return null;
  return new Uint8Array(Buffer.from(value, 'base64'));
}

export async function POST(request: NextRequest) {
  if (request.headers.get('content-type')?.split(';', 1)[0] !== 'application/cbor') {
    return cborError(422, 'invalid-content-type');
  }
  const user = await getUser();
  if (!user) return cborError(401, 'unauthorized');

  try {
    const body = new Uint8Array(await request.arrayBuffer());
    const admin = createAdminClient();
    const { command } = await admitVaultCommand(body, user, {
      async findActiveDevice(id, accountId) {
        const { data } = await admin.from('vault_devices').select('signing_public_key').eq('id', id).eq('account_id', accountId).eq('status', 'active').maybeSingle();
        return bytea(data?.signing_public_key);
      },
      async findActiveRecoveryKey(id, accountId) {
        const { data } = await admin.from('vault_recovery_keys').select('signing_public_key').eq('id', id).eq('account_id', accountId).eq('status', 'active').maybeSingle();
        return bytea(data?.signing_public_key);
      },
    });

    // No mutation is enabled until its command-specific private transaction is
    // implemented and tested. Never fall back to a browser table write.
    return cborError(422, `operation-not-enabled:${command.operationType}`);
  } catch (error) {
    const code = error instanceof Error && /^(command-size|account-mismatch|inactive-author|invalid-signature)$/.test(error.message)
      ? error.message : 'invalid-command';
    return cborError(code === 'command-size' ? 413 : 422, code);
  }
}
