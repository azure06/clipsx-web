import type { NextRequest } from 'next/server';

import { vaultCborError as createVaultCborError, vaultCborResponse as createVaultCborResponse } from '@/lib/vault/http';
import type { CborValue } from '@/lib/vault/protocol';
import { decodePostgresBytea } from '@/lib/vault/postgrest-bytea';
import { createClient, getVaultPrincipal } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const vaultCborError = (status: number, code: string) => createVaultCborError(status, code, requestId);
  const vaultCborResponse = (status: number, value: Map<number, CborValue>) => createVaultCborResponse(status, value, requestId);
  try {
    const principal = await getVaultPrincipal();
    if (!principal) return vaultCborError(401, 'unauthorized');
    const deviceId = request.nextUrl.searchParams.get('deviceId');
    if (!deviceId || !UUID.test(deviceId)) return vaultCborError(422, 'invalid-device-id');
    const supabase = await createClient();
    const { data: device, error: deviceError } = await supabase.from('vault_devices')
      .select('id, signing_public_key, encryption_public_key')
      .eq('id', deviceId).eq('account_id', principal.user.id).eq('status', 'active').maybeSingle();
    if (deviceError) throw deviceError;
    const signingPublicKey = decodePostgresBytea(device?.signing_public_key);
    const encryptionPublicKey = decodePostgresBytea(device?.encryption_public_key);
    const { data: recoveryKeys, error: recoveryError } = await supabase.from('vault_recovery_keys').select('id, encryption_public_key').eq('account_id', principal.user.id).eq('status', 'active');
    if (recoveryError) throw recoveryError;
    const recovery = recoveryKeys?.[0];
    const recoveryEncryptionPublicKey = decodePostgresBytea(recovery?.encryption_public_key);
    if (!device || !signingPublicKey || !encryptionPublicKey || !recovery || !recoveryEncryptionPublicKey) {
      return vaultCborError(403, 'inactive-device');
    }
    const { data: accountOperations, error: accountOperationError } = await supabase.from('vault_account_operations').select('operation_hash').eq('account_id', principal.user.id).order('sequence_number', { ascending: false }).limit(1);
    if (accountOperationError) throw accountOperationError;
    const accountHead = decodePostgresBytea(accountOperations?.[0]?.operation_hash);
    if (!accountHead) return vaultCborError(422, 'bootstrap-unavailable');

    const { data: collections, error: collectionsError } = await supabase.from('vault_collections')
      .select('id, encrypted_metadata, metadata_nonce, current_epoch_number, current_epoch_transition_hash');
    if (collectionsError) throw collectionsError;
    const collectionIds = collections?.map((collection) => collection.id) ?? [];
    if (collectionIds.length === 0) {
      return vaultCborResponse(200, new Map([[1, 1], [2, device.id], [3, signingPublicKey], [4, encryptionPublicKey], [5, recovery.id], [6, recoveryEncryptionPublicKey], [7, []], [8, accountHead]]));
    }

    const [epochResult, envelopeResult, operationResult] = await Promise.all([
      supabase.from('vault_collection_epochs').select('collection_id, epoch_number, transition_payload, transition_signature, transition_hash, created_by_device_id').in('collection_id', collectionIds).eq('state', 'current'),
      supabase.from('vault_device_epoch_envelopes').select('collection_id, epoch_number, encapsulation, ciphertext, envelope_payload, envelope_payload_hash, signature, sender_device_id').eq('recipient_device_id', device.id).in('collection_id', collectionIds),
      supabase.from('vault_collection_operations').select('collection_id, sequence_number, operation_hash, canonical_payload, signature, author_device_id').in('collection_id', collectionIds).order('sequence_number', { ascending: false }),
    ]);
    if (epochResult.error || envelopeResult.error || operationResult.error) {
      throw epochResult.error ?? envelopeResult.error ?? operationResult.error;
    }
    const epochByCollection = new Map((epochResult.data ?? []).map((epoch) => [epoch.collection_id, epoch]));
    const envelopeByCollection = new Map((envelopeResult.data ?? []).map((envelope) => [`${envelope.collection_id}:${envelope.epoch_number}`, envelope]));
    const headByCollection = new Map<string, { hash: Uint8Array; payload: Uint8Array; signature: Uint8Array; authorDeviceId: string }>();
    for (const operation of operationResult.data ?? []) if (!headByCollection.has(operation.collection_id)) {
      const hash = decodePostgresBytea(operation.operation_hash);
      const payload = decodePostgresBytea(operation.canonical_payload);
      const signature = decodePostgresBytea(operation.signature);
      if (hash && payload && signature && typeof operation.author_device_id === 'string') {
        headByCollection.set(operation.collection_id, { hash, payload, signature, authorDeviceId: operation.author_device_id });
      }
    }
    const records: import('@/lib/vault/protocol').CborValue[] = [];
    for (const collection of collections ?? []) {
      const epoch = epochByCollection.get(collection.id);
      const envelope = envelopeByCollection.get(`${collection.id}:${collection.current_epoch_number}`);
      const metadata = decodePostgresBytea(collection.encrypted_metadata);
      const nonce = decodePostgresBytea(collection.metadata_nonce);
      const transitionPayload = decodePostgresBytea(epoch?.transition_payload);
      const transitionSignature = decodePostgresBytea(epoch?.transition_signature);
      const transitionHash = decodePostgresBytea(epoch?.transition_hash);
      const encapsulation = decodePostgresBytea(envelope?.encapsulation);
      const ciphertext = decodePostgresBytea(envelope?.ciphertext);
      const envelopePayload = decodePostgresBytea(envelope?.envelope_payload);
      const envelopeHash = decodePostgresBytea(envelope?.envelope_payload_hash);
      const envelopeSignature = decodePostgresBytea(envelope?.signature);
      const operationHead = headByCollection.get(collection.id);
      if (!epoch || !envelope || !metadata || !nonce || !transitionPayload || !transitionSignature || !transitionHash || !encapsulation || !ciphertext || !envelopePayload || !envelopeHash || !envelopeSignature || !operationHead) {
        console.error({ requestId, endpoint: 'bootstrap', stage: 'incomplete-record', collectionId: collection.id });
        return vaultCborError(503, 'bootstrap-unavailable');
      }
      records.push(new Map([[1, collection.id], [2, metadata], [3, nonce], [4, epoch.epoch_number], [5, transitionPayload], [6, transitionSignature], [7, transitionHash], [8, encapsulation], [9, ciphertext], [10, envelopePayload], [11, envelopeHash], [12, envelopeSignature], [13, envelope.sender_device_id], [14, operationHead.hash], [15, operationHead.payload], [16, operationHead.signature], [17, operationHead.authorDeviceId], [18, epoch.created_by_device_id]]));
    }
    return vaultCborResponse(200, new Map([[1, 1], [2, device.id], [3, signingPublicKey], [4, encryptionPublicKey], [5, recovery.id], [6, recoveryEncryptionPublicKey], [7, records], [8, accountHead]]));
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : undefined;
    console.error({ requestId, endpoint: 'bootstrap', stage: 'query', code });
    return vaultCborError(503, 'bootstrap-unavailable');
  }
}
