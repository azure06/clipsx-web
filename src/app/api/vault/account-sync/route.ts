import { NextRequest } from 'next/server';

import { vaultCborError as createVaultCborError, vaultCborResponse as createVaultCborResponse } from '@/lib/vault/http';
import { decodeJsonBase64, encodePostgresBytea } from '@/lib/vault/postgrest-bytea';
import type { CborValue } from '@/lib/vault/protocol';
import { createAdminClient } from '@/lib/supabase/admin';
import { getVaultPrincipal } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const PAGE_SIZE = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function requiredBytes(value: unknown): Uint8Array | null {
  const decoded = decodeJsonBase64(value);
  return decoded?.byteLength ? decoded : null;
}

function optionalBytes(value: unknown): Uint8Array | null | undefined {
  return value === null ? null : requiredBytes(value) ?? undefined;
}

function uuid(value: unknown): string | null {
  return typeof value === 'string' && UUID.test(value) ? value : null;
}

function decodeAnchor(value: string | null): Uint8Array | null {
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value)) return null;
  const decoded = new Uint8Array(Buffer.from(value, 'base64url'));
  return decoded.byteLength === 32 ? decoded : null;
}

function operationRecord(value: unknown): CborValue | null {
  const row = record(value);
  if (!row) return null;
  const operationId = uuid(row.operation_id);
  const sequence = row.sequence_number;
  const operationType = row.operation_type;
  const payload = requiredBytes(row.canonical_payload);
  const previous = optionalBytes(row.previous_operation_hash);
  const hash = requiredBytes(row.operation_hash);
  const authorDeviceId = row.author_device_id === null ? null : uuid(row.author_device_id);
  const recoveryKeyId = row.recovery_key_id === null ? null : uuid(row.recovery_key_id);
  const signature = requiredBytes(row.signature);
  if (
    !operationId || typeof sequence !== 'number' || !Number.isSafeInteger(sequence)
    || sequence < 1 || typeof operationType !== 'string' || !payload
    || previous === undefined || !hash || hash.byteLength !== 32
    || (authorDeviceId === null) === (recoveryKeyId === null) || !signature
  ) return null;
  return new Map<number, CborValue>([
    [1, operationId], [2, sequence], [3, operationType], [4, payload],
    [5, previous], [6, hash], [7, authorDeviceId], [8, recoveryKeyId], [9, signature],
  ]);
}

function deviceRecord(value: unknown): CborValue | null {
  const row = record(value);
  if (!row) return null;
  const id = uuid(row.id);
  const encryptionKey = requiredBytes(row.encryption_public_key);
  const signingKey = requiredBytes(row.signing_public_key);
  if (!id || typeof row.status !== 'string' || !encryptionKey || !signingKey) return null;
  return new Map<number, CborValue>([
    [1, id], [2, row.status], [3, encryptionKey], [4, signingKey],
    [5, typeof row.revoked_at === 'string' ? row.revoked_at : null],
  ]);
}

function recoveryRecord(value: unknown): CborValue | null {
  const row = record(value);
  if (!row) return null;
  const id = uuid(row.id);
  const encryptionKey = requiredBytes(row.encryption_public_key);
  const signingKey = requiredBytes(row.signing_public_key);
  const payload = requiredBytes(row.authorization_payload);
  const signature = requiredBytes(row.authorization_signature);
  if (
    !id || typeof row.status !== 'string' || typeof row.key_version !== 'number'
    || !encryptionKey || !signingKey || !payload || !signature
  ) return null;
  return new Map<number, CborValue>([
    [1, id], [2, row.status], [3, row.key_version], [4, encryptionKey],
    [5, signingKey], [6, payload], [7, signature],
  ]);
}

function authorizationRecord(value: unknown): CborValue | null {
  const row = record(value);
  if (!row) return null;
  const deviceId = uuid(row.device_id);
  const authorizedByDeviceId = row.authorized_by_device_id === null
    ? null : uuid(row.authorized_by_device_id);
  const recoveryKeyId = row.recovery_key_id === null ? null : uuid(row.recovery_key_id);
  const payload = requiredBytes(row.authorization_payload);
  const payloadHash = requiredBytes(row.authorization_payload_hash);
  const proofPayload = requiredBytes(row.proof_payload);
  const proofSignature = requiredBytes(row.proof_signature);
  const signature = requiredBytes(row.signature);
  if (
    !deviceId || (authorizedByDeviceId === null) === (recoveryKeyId === null)
    || typeof row.authorization_method !== 'string' || !payload
    || !payloadHash || payloadHash.byteLength !== 32 || !proofPayload
    || !proofSignature || !signature
  ) return null;
  return new Map<number, CborValue>([
    [1, deviceId], [2, authorizedByDeviceId], [3, recoveryKeyId],
    [4, row.authorization_method], [5, payload], [6, payloadHash],
    [7, proofPayload], [8, proofSignature], [9, signature],
  ]);
}

function decodeArray(
  value: unknown,
  decoder: (item: unknown) => CborValue | null,
): CborValue[] | null {
  if (!Array.isArray(value)) return null;
  const decoded = value.map(decoder);
  return decoded.some((item) => item === null) ? null : decoded as CborValue[];
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const vaultCborError = (status: number, code: string) => createVaultCborError(status, code, requestId);
  const vaultCborResponse = (status: number, value: Map<number, CborValue>) => createVaultCborResponse(status, value, requestId);
  try {
    const principal = await getVaultPrincipal();
    if (!principal) return vaultCborError(401, 'unauthorized');

    const accountId = request.nextUrl.searchParams.get('accountId');
    const collectionId = request.nextUrl.searchParams.get('collectionId');
    const rawAfter = request.nextUrl.searchParams.get('after') ?? '0';
    const rawAnchor = request.nextUrl.searchParams.get('anchor');
    if (!accountId || !UUID.test(accountId) || (collectionId !== null && !UUID.test(collectionId))) {
      return vaultCborError(422, 'invalid-scope');
    }
    if (!/^(0|[1-9][0-9]*)$/.test(rawAfter)) return vaultCborError(422, 'invalid-cursor');
    const after = Number(rawAfter);
    if (!Number.isSafeInteger(after)) return vaultCborError(422, 'invalid-cursor');
    const anchor = decodeAnchor(rawAnchor);
    if ((after === 0 && rawAnchor !== null) || (after > 0 && !anchor)) {
      return vaultCborError(422, 'invalid-anchor');
    }
    if (accountId !== principal.user.id) {
      return vaultCborError(403, 'cross-account-proof-forbidden');
    }

    const admin = createAdminClient();
    const { data, error } = await admin.schema('private').rpc('read_vault_account_sync_page', {
      p_requester_account_id: principal.user.id,
      p_requester_session_id: principal.sessionId,
      p_target_account_id: accountId,
      p_collection_id: collectionId,
      p_after: after,
      p_anchor: anchor ? encodePostgresBytea(anchor) : null,
      p_limit: PAGE_SIZE,
    });
    if (error) throw error;
    if (!data) return vaultCborError(403, 'account-sync-forbidden');
    const page = record(data);
    const operations = decodeArray(page?.operations, operationRecord);
    const devices = decodeArray(page?.devices, deviceRecord);
    const recoveryKeys = decodeArray(page?.recovery_keys, recoveryRecord);
    const authorizations = decodeArray(page?.authorizations, authorizationRecord);
    if (!page || !operations || !devices || !recoveryKeys || !authorizations
      || typeof page.has_more !== 'boolean') {
      return vaultCborError(503, 'account-sync-record-invalid');
    }
    const last = operations.at(-1);
    const lastMap = last instanceof Map ? last : null;
    const nextSequence = lastMap?.get(2) ?? after;
    const nextHash = lastMap?.get(6) ?? anchor;
    return vaultCborResponse(200, new Map<number, CborValue>([
      [1, 1], [2, accountId], [3, operations], [4, devices],
      [5, recoveryKeys], [6, authorizations], [7, nextSequence],
      [8, nextHash], [9, page.has_more],
    ]));
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error
      ? String(error.code) : undefined;
    console.error({ requestId, endpoint: 'account-sync', stage: 'query', code });
    return vaultCborError(503, 'account-sync-unavailable');
  }
}
