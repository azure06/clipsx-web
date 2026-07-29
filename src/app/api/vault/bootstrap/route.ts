import { NextResponse } from 'next/server';

import { encodeCanonicalCbor } from '@/lib/vault/protocol';
import { createClient, getVaultPrincipal } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function bytes(value: string | null): Uint8Array | null {
  return typeof value === 'string' ? new Uint8Array(Buffer.from(value, 'base64')) : null;
}

function response(status: number, body: Map<number, import('@/lib/vault/protocol').CborValue>) {
  const encoded = encodeCanonicalCbor(body).slice();
  return new NextResponse(encoded.buffer as ArrayBuffer, { status, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/cbor' } });
}

export async function GET() {
  const principal = await getVaultPrincipal();
  if (!principal) return response(401, new Map([[1, 'unauthorized']]));
  const supabase = await createClient();
  const { data: devices } = await supabase.from('vault_devices')
    .select('id, signing_public_key, encryption_public_key')
    .eq('account_id', principal.user.id).eq('status', 'active').eq('auth_session_id', principal.sessionId);
  const device = devices?.[0];
  const signingPublicKey = bytes(device?.signing_public_key ?? null);
  const encryptionPublicKey = bytes(device?.encryption_public_key ?? null);
  const { data: recoveryKeys } = await supabase.from('vault_recovery_keys').select('id, encryption_public_key').eq('account_id', principal.user.id).eq('status', 'active');
  const recovery = recoveryKeys?.[0]; const recoveryEncryptionPublicKey = bytes(recovery?.encryption_public_key ?? null);
  if (!device || !signingPublicKey || !encryptionPublicKey || !recovery || !recoveryEncryptionPublicKey) return response(403, new Map([[1, 'unbound-session']]));

  const { data: collections, error: collectionsError } = await supabase.from('vault_collections')
    .select('id, encrypted_metadata, metadata_nonce, current_epoch_number, current_epoch_transition_hash');
  if (collectionsError) return response(422, new Map([[1, 'bootstrap-unavailable']]));
  const collectionIds = collections?.map((collection) => collection.id) ?? [];
  if (collectionIds.length === 0) return response(200, new Map([[1, 1], [2, device.id], [3, signingPublicKey], [4, encryptionPublicKey], [5, recovery.id], [6, recoveryEncryptionPublicKey], [7, []]]));

  const [{ data: epochs }, { data: envelopes }, { data: operations }] = await Promise.all([
    supabase.from('vault_collection_epochs').select('collection_id, epoch_number, transition_payload, transition_signature, transition_hash, created_by_device_id').in('collection_id', collectionIds).eq('state', 'current'),
    supabase.from('vault_device_epoch_envelopes').select('collection_id, epoch_number, encapsulation, ciphertext, envelope_payload, envelope_payload_hash, signature, sender_device_id').eq('recipient_device_id', device.id).in('collection_id', collectionIds),
    supabase.from('vault_collection_operations').select('collection_id, sequence_number, operation_hash, canonical_payload, signature, author_device_id').in('collection_id', collectionIds).order('sequence_number', { ascending: false }),
  ]);
  const epochByCollection = new Map((epochs ?? []).map((epoch) => [epoch.collection_id, epoch]));
  const envelopeByCollection = new Map((envelopes ?? []).map((envelope) => [envelope.collection_id, envelope]));
  const headByCollection = new Map<string, { hash: Uint8Array; payload: Uint8Array; signature: Uint8Array; authorDeviceId: string }>();
  for (const operation of operations ?? []) if (!headByCollection.has(operation.collection_id)) {
    const hash = bytes(operation.operation_hash); const payload = bytes(operation.canonical_payload); const signature = bytes(operation.signature);
    if (hash && payload && signature && typeof operation.author_device_id === 'string') headByCollection.set(operation.collection_id, { hash, payload, signature, authorDeviceId: operation.author_device_id });
  }
  const records: import('@/lib/vault/protocol').CborValue[] = [];
  for (const collection of collections ?? []) {
    const epoch = epochByCollection.get(collection.id);
    const envelope = envelopeByCollection.get(collection.id);
    const metadata = bytes(collection.encrypted_metadata); const nonce = bytes(collection.metadata_nonce);
    const transitionPayload = bytes(epoch?.transition_payload ?? null); const transitionSignature = bytes(epoch?.transition_signature ?? null); const transitionHash = bytes(epoch?.transition_hash ?? null);
    const encapsulation = bytes(envelope?.encapsulation ?? null); const ciphertext = bytes(envelope?.ciphertext ?? null); const envelopePayload = bytes(envelope?.envelope_payload ?? null); const envelopeHash = bytes(envelope?.envelope_payload_hash ?? null); const envelopeSignature = bytes(envelope?.signature ?? null);
    const operationHead = headByCollection.get(collection.id);
    if (!epoch || !envelope || !metadata || !nonce || !transitionPayload || !transitionSignature || !transitionHash || !encapsulation || !ciphertext || !envelopePayload || !envelopeHash || !envelopeSignature || !operationHead) continue;
    records.push(new Map([[1, collection.id], [2, metadata], [3, nonce], [4, epoch.epoch_number], [5, transitionPayload], [6, transitionSignature], [7, transitionHash], [8, encapsulation], [9, ciphertext], [10, envelopePayload], [11, envelopeHash], [12, envelopeSignature], [13, envelope.sender_device_id], [14, operationHead.hash], [15, operationHead.payload], [16, operationHead.signature], [17, operationHead.authorDeviceId]]));
  }
  return response(200, new Map([[1, 1], [2, device.id], [3, signingPublicKey], [4, encryptionPublicKey], [5, recovery.id], [6, recoveryEncryptionPublicKey], [7, records]]));
}
