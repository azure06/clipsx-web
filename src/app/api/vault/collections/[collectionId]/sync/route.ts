import { NextRequest, NextResponse } from 'next/server';

import { encodeCanonicalCbor } from '@/lib/vault/protocol';
import { createClient, getVaultPrincipal } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function bytes(value: string | null): Uint8Array | null { return typeof value === 'string' ? new Uint8Array(Buffer.from(value, 'base64')) : null; }
function response(status: number, value: Map<number, import('@/lib/vault/protocol').CborValue>) {
  const body = encodeCanonicalCbor(value).slice();
  return new NextResponse(body.buffer as ArrayBuffer, { status, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/cbor' } });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ collectionId: string }> }) {
  const principal = await getVaultPrincipal();
  if (!principal) return response(401, new Map([[1, 'unauthorized']]));
  const { collectionId } = await params;
  const after = Number(new URL(request.url).searchParams.get('after') ?? '0');
  // A signed anchor is required before accepting later pages; checkpointed
  // paging arrives with the rollback-detection feature. Do not return a page
  // the current worker cannot verify from genesis.
  if (!Number.isSafeInteger(after) || after !== 0) return response(422, new Map([[1, 'invalid-cursor']]));
  const supabase = await createClient();
  const [{ data: operations, error: operationError }, { data: revisions, error: revisionError }] = await Promise.all([
    supabase.from('vault_collection_operations').select('operation_id, sequence_number, operation_type, canonical_payload, previous_operation_hash, operation_hash, author_device_id, signature').eq('collection_id', collectionId).gt('sequence_number', after).order('sequence_number').limit(100),
    supabase.from('vault_note_revisions').select('note_id, revision_number, collection_epoch, encrypted_content, content_nonce, wrapped_revision_key, key_wrap_nonce, ciphertext_hash, wrapped_revision_key_hash, revision_hash, author_device_id, author_signature, operation_id').eq('collection_id', collectionId).order('created_at').limit(100),
  ]);
  if (operationError || revisionError) return response(422, new Map([[1, 'sync-unavailable']]));
  const operationRecords: import('@/lib/vault/protocol').CborValue[] = [];
  for (const op of operations ?? []) {
    const payload = bytes(op.canonical_payload); const hash = bytes(op.operation_hash); const signature = bytes(op.signature); const previous = bytes(op.previous_operation_hash);
    if (!payload || !hash || !signature) continue;
    operationRecords.push(new Map([[1, op.operation_id], [2, op.sequence_number], [3, op.operation_type], [4, payload], [5, previous], [6, hash], [7, op.author_device_id], [8, signature]]));
  }
  const revisionRecords: import('@/lib/vault/protocol').CborValue[] = [];
  for (const revision of revisions ?? []) {
    const values = [bytes(revision.encrypted_content), bytes(revision.content_nonce), bytes(revision.wrapped_revision_key), bytes(revision.key_wrap_nonce), bytes(revision.ciphertext_hash), bytes(revision.wrapped_revision_key_hash), bytes(revision.revision_hash), bytes(revision.author_signature)];
    if (values.some((value) => !value)) continue;
    revisionRecords.push(new Map([[1, revision.note_id], [2, revision.revision_number], [3, revision.collection_epoch], [4, values[0]!], [5, values[1]!], [6, values[2]!], [7, values[3]!], [8, values[4]!], [9, values[5]!], [10, values[6]!], [11, revision.author_device_id], [12, values[7]!], [13, revision.operation_id]]));
  }
  return response(200, new Map<number, import('@/lib/vault/protocol').CborValue>([[1, 1], [2, collectionId], [3, operationRecords], [4, revisionRecords], [5, after + operationRecords.length]]));
}
