import { createEpochEnvelope } from './browser-collection-create';
import { decodeCanonicalCbor, encodeCanonicalCbor, signProtocolRecord, type CborValue } from './protocol';
import { decodePendingDeviceOffer } from './browser-device-approval';

/** Builds a recovery-root-signed device authorization. The phrase-derived
 * private key stays in caller memory and is never serialized into the command. */
export async function createRecoveryDeviceAuthorizationCommand(input: {
  accountId: string; recoveryKeyId: string; recoverySigningSecretKey: Uint8Array;
  expectedAccountHead: Uint8Array; offer: string;
  epochs: Array<{ collectionId: string; epochNumber: number; key: Uint8Array }>; operationId?: string;
}) {
  const target = await decodePendingDeviceOffer(input.offer, input.accountId);
  const envelopes = await Promise.all(input.epochs.map(async (epoch) => {
    const envelope = await createEpochEnvelope({
      collectionId: epoch.collectionId, epochNumber: epoch.epochNumber, recipientKind: 'device', recipientId: target.deviceId,
      senderId: input.recoveryKeyId, recipientEncryptionPublicKey: target.encryptionPublicKey,
      epochKey: epoch.key, signingSecretKey: input.recoverySigningSecretKey,
    });
    const decoded = decodeCanonicalCbor(envelope.payload);
    return new Map<number, CborValue>([[1, epoch.collectionId], [2, epoch.epochNumber], [3, decoded.get(7)!], [4, decoded.get(8)!], [5, envelope.payload], [6, envelope.signature]]);
  }));
  const payload = encodeCanonicalCbor(new Map<number, CborValue>([[1, target.deviceId], [2, 'recovery'], [3, target.pendingCommandHash], [4, envelopes]]));
  const unsigned = new Map<number, CborValue>([
    [1, 1], [2, input.operationId ?? crypto.randomUUID()], [3, 'device-authorize'], [4, input.accountId],
    [5, `recovery:${input.recoveryKeyId}`], [7, input.expectedAccountHead], [9, payload],
  ]);
  const signed = encodeCanonicalCbor(unsigned);
  unsigned.set(10, await signProtocolRecord('clipsx/vault/v1/command/device-authorize', signed, input.recoverySigningSecretKey));
  return { command: encodeCanonicalCbor(unsigned), deviceId: target.deviceId };
}
