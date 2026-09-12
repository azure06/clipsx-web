import { vaultReleaseGuard } from '@/lib/vault/release';
import { NextRequest } from 'next/server';

import { readVaultCborRequest, VaultHttpError, vaultCborError, vaultCborResponse } from '@/lib/vault/http';
import { encodePostgresBytea } from '@/lib/vault/postgrest-bytea';
import { decodeCanonicalCbor, importHpkePublicKey, randomBytes, sealHpke, sha256, utf8, type CborValue } from '@/lib/vault/protocol';
import { createAdminClient, VaultConfigurationError } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const disabled = vaultReleaseGuard();
  if (disabled) return disabled;
  const requestId = crypto.randomUUID();
  try {
    const bytes = await readVaultCborRequest(request, 512);
    const user = await getUser();
    if (!user) return vaultCborError(401, 'unauthorized', requestId);
    const record = decodeCanonicalCbor(bytes);
    const publicKey = record.get(2);
    if (record.size !== 2 || record.get(1) !== 1 || !(publicKey instanceof Uint8Array) || publicKey.byteLength !== 32) throw new Error('invalid-request');
    const challenge = randomBytes(32);
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    const encrypted = await sealHpke(await importHpkePublicKey(publicKey), challenge, utf8(`clipsx/vault/v1/device-registration-challenge\0${user.id}\0${id}`));
    const admin = createAdminClient();
    const { error } = await admin.schema('private').from('vault_device_registration_challenges').insert({
      id,
      account_id: user.id,
      device_encryption_public_key: encodePostgresBytea(publicKey),
      challenge_hash: encodePostgresBytea(await sha256(challenge)),
      expires_at: expiresAt,
    });
    challenge.fill(0);
    if (error) {
      console.error({ requestId, endpoint: 'device-challenges', stage: 'challenge-store', code: error.code, details: error.details, hint: error.hint });
      throw new Error('challenge-store-failed');
    }
    return vaultCborResponse(201, new Map<number, CborValue>([[1, id], [2, encrypted.enc], [3, encrypted.ciphertext], [4, expiresAt]]), requestId);
  } catch (error) {
    if (error instanceof VaultHttpError && error.code) {
      return vaultCborError(error.status, error.code, requestId);
    }
    const code = error instanceof VaultConfigurationError ? 'vault-service-misconfigured'
      : error instanceof Error && error.message === 'challenge-store-failed' ? 'challenge-store-failed' : 'invalid-device-challenge-request';
    console.error({ requestId, endpoint: 'device-challenges', stage: code });
    return vaultCborError(code === 'challenge-store-failed' || code === 'vault-service-misconfigured' ? 503 : 422, code, requestId);
  }
}
