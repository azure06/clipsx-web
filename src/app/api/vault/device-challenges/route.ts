import { NextRequest, NextResponse } from 'next/server';

import { decodeCanonicalCbor, encodeCanonicalCbor, importHpkePublicKey, randomBytes, sealHpke, sha256, utf8 } from '@/lib/vault/protocol';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function response(status: number, body: Map<number, string | Uint8Array>) {
  const bytes = encodeCanonicalCbor(body).slice();
  return new NextResponse(bytes.buffer as ArrayBuffer, { status, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/cbor' } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get('content-type')?.split(';', 1)[0] !== 'application/cbor') return response(422, new Map([[1, 'invalid-content-type']]));
  const user = await getUser();
  if (!user) return response(401, new Map([[1, 'unauthorized']]));
  try {
    const record = decodeCanonicalCbor(new Uint8Array(await request.arrayBuffer()));
    const publicKey = record.get(2);
    if (record.size !== 2 || record.get(1) !== 1 || !(publicKey instanceof Uint8Array) || publicKey.byteLength !== 32) throw new Error('invalid-request');
    const challenge = randomBytes(32);
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    const encrypted = await sealHpke(await importHpkePublicKey(publicKey), challenge, utf8(`clipsx/vault/v1/device-registration-challenge\0${user.id}\0${id}`));
    const admin = createAdminClient();
    const { error } = await admin.schema('private').from('vault_device_registration_challenges').insert({ id, account_id: user.id, device_encryption_public_key: Buffer.from(publicKey).toString('base64'), challenge_hash: Buffer.from(await sha256(challenge)).toString('base64'), expires_at: expiresAt });
    if (error) throw new Error('challenge-store-failed');
    return response(201, new Map<number, string | Uint8Array>([[1, id], [2, encrypted.enc], [3, encrypted.ciphertext], [4, expiresAt]]));
  } catch {
    return response(422, new Map([[1, 'invalid-device-challenge-request']]));
  }
}
