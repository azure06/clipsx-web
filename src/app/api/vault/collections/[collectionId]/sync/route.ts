import { vaultReleaseGuard } from '@/lib/vault/release';
import { NextRequest } from 'next/server';

import { vaultCborError as createVaultCborError, vaultCborResponse as createVaultCborResponse } from '@/lib/vault/http';
import { decodePostgresBytea } from '@/lib/vault/postgrest-bytea';
import type { CborValue } from '@/lib/vault/protocol';
import { createClient, getVaultPrincipal } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const PAGE_SIZE = 100;

function decodeAnchor(value: string | null): Uint8Array | null {
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value)) return null;
  const decoded = new Uint8Array(Buffer.from(value, 'base64url'));
  return decoded.byteLength === 32 ? decoded : null;
}

function same(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength
    && left.every((value, index) => value === right[index]);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
) {
  const disabled = vaultReleaseGuard();
  if (disabled) return disabled;
  const requestId = crypto.randomUUID();
  const vaultCborError = (status: number, code: string) => createVaultCborError(status, code, requestId);
  const vaultCborResponse = (status: number, value: Map<number, CborValue>) => createVaultCborResponse(status, value, requestId);
  try {
    const principal = await getVaultPrincipal();
    if (!principal) return vaultCborError(401, 'unauthorized');
    const { collectionId } = await params;
    const rawAfter = request.nextUrl.searchParams.get('after') ?? '0';
    if (!/^(0|[1-9][0-9]*)$/.test(rawAfter)) return vaultCborError(422, 'invalid-cursor');
    const after = Number(rawAfter);
    if (!Number.isSafeInteger(after)) return vaultCborError(422, 'invalid-cursor');
    const rawAnchor = request.nextUrl.searchParams.get('anchor');
    const anchor = decodeAnchor(rawAnchor);
    if ((after === 0 && rawAnchor !== null) || (after > 0 && !anchor)) {
      return vaultCborError(422, 'invalid-anchor');
    }

    const supabase = await createClient();

    if (after > 0 && anchor) {
      const { data: anchorRow, error: anchorError } = await supabase
        .from('vault_collection_operations')
        .select('operation_hash')
        .eq('collection_id', collectionId)
        .eq('sequence_number', after)
        .maybeSingle();
      if (anchorError) throw anchorError;
      const storedAnchor = decodePostgresBytea(anchorRow?.operation_hash);
      if (!storedAnchor || !same(storedAnchor, anchor)) {
        return vaultCborError(409, 'anchor-mismatch');
      }
    }

    const operationResult = await supabase
      .from('vault_collection_operations')
      .select('operation_id, sequence_number, operation_type, canonical_payload, previous_operation_hash, operation_hash, author_device_id, signature')
      .eq('collection_id', collectionId)
      .gt('sequence_number', after)
      .order('sequence_number')
      .limit(PAGE_SIZE + 1);
    if (operationResult.error) throw operationResult.error;
    const hasMore = (operationResult.data?.length ?? 0) > PAGE_SIZE;
    const operations = (operationResult.data ?? []).slice(0, PAGE_SIZE);
    const operationIds = operations.map((operation) => operation.operation_id);

    const [revisionResult, tombstoneResult] = operationIds.length > 0
      ? await Promise.all([
        supabase.from('vault_note_revisions')
          .select('note_id, revision_number, collection_epoch, encrypted_content, content_nonce, wrapped_revision_key, key_wrap_nonce, ciphertext_hash, wrapped_revision_key_hash, revision_hash, previous_revision_hash, author_device_id, author_signature, operation_id')
          .eq('collection_id', collectionId).in('operation_id', operationIds),
        supabase.from('vault_tombstones')
          .select('note_id, deleted_by_device_id, delete_operation_id, last_revision_hash')
          .eq('collection_id', collectionId).in('delete_operation_id', operationIds),
      ])
      : [{ data: [], error: null }, { data: [], error: null }];
    if (revisionResult.error || tombstoneResult.error) {
      throw revisionResult.error ?? tombstoneResult.error;
    }

    const operationRecords: CborValue[] = [];
    for (const operation of operations) {
      const payload = decodePostgresBytea(operation.canonical_payload);
      const hash = decodePostgresBytea(operation.operation_hash);
      const signature = decodePostgresBytea(operation.signature);
      const previous = decodePostgresBytea(operation.previous_operation_hash);
      if (!payload || !hash || !signature) return vaultCborError(503, 'sync-record-invalid');
      operationRecords.push(new Map([
        [1, operation.operation_id],
        [2, operation.sequence_number],
        [3, operation.operation_type],
        [4, payload],
        [5, previous],
        [6, hash],
        [7, operation.author_device_id],
        [8, signature],
      ]));
    }

    const revisionRecords: CborValue[] = [];
    for (const revision of revisionResult.data ?? []) {
      const values = [
        decodePostgresBytea(revision.encrypted_content),
        decodePostgresBytea(revision.content_nonce),
        decodePostgresBytea(revision.wrapped_revision_key),
        decodePostgresBytea(revision.key_wrap_nonce),
        decodePostgresBytea(revision.ciphertext_hash),
        decodePostgresBytea(revision.wrapped_revision_key_hash),
        decodePostgresBytea(revision.revision_hash),
        decodePostgresBytea(revision.author_signature),
      ];
      if (values.some((value) => !value)) return vaultCborError(503, 'sync-record-invalid');
      revisionRecords.push(new Map([
        [1, revision.note_id],
        [2, revision.revision_number],
        [3, revision.collection_epoch],
        [4, values[0]!],
        [5, values[1]!],
        [6, values[2]!],
        [7, values[3]!],
        [8, values[4]!],
        [9, values[5]!],
        [10, values[6]!],
        [11, revision.author_device_id],
        [12, values[7]!],
        [13, revision.operation_id],
        [14, decodePostgresBytea(revision.previous_revision_hash)],
      ]));
    }

    const tombstoneRecords: CborValue[] = [];
    for (const tombstone of tombstoneResult.data ?? []) {
      const lastRevisionHash = decodePostgresBytea(tombstone.last_revision_hash);
      if (!lastRevisionHash) return vaultCborError(503, 'sync-record-invalid');
      tombstoneRecords.push(new Map([
        [1, tombstone.note_id],
        [2, lastRevisionHash],
        [3, tombstone.deleted_by_device_id],
        [4, tombstone.delete_operation_id],
      ]));
    }

    const last = operations.at(-1);
    const next = last?.sequence_number ?? after;
    const nextHash = last ? decodePostgresBytea(last.operation_hash) : anchor;
    return vaultCborResponse(200, new Map([
      [1, 1],
      [2, collectionId],
      [3, operationRecords],
      [4, revisionRecords],
      [5, next],
      [6, tombstoneRecords],
      [7, nextHash],
      [8, hasMore],
    ]));
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : undefined;
    console.error({ requestId, endpoint: 'collection-sync', stage: 'query', code });
    return vaultCborError(503, 'sync-unavailable');
  }
}
