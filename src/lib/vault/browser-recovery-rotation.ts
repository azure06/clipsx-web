import { createEpochEnvelope } from './browser-collection-create';
import { decodeCanonicalCbor, encodeCanonicalCbor, signProtocolRecord, type CborValue } from './protocol';

/** Creates a recovery-root rotation command. The existing recovery root signs
 * the command while a currently bound device co-signs the replacement payload. */
export async function createRecoveryRootRotationCommand(input: {
  accountId: string; oldRecoveryKeyId: string; oldRecoverySigningSecretKey: Uint8Array;
  newRecoveryKeyId: string; newRecoveryEncryptionPublicKey: Uint8Array; newRecoverySigningPublicKey: Uint8Array; newRecoverySigningSecretKey: Uint8Array;
  activeDeviceId: string; activeDeviceSigningSecretKey: Uint8Array; expectedAccountHead: Uint8Array;
  epochs: Array<{ collectionId: string; epochNumber: number; key: Uint8Array }>; operationId?: string;
}) {
  const envelopes = await Promise.all(input.epochs.map(async (epoch) => {
    const envelope = await createEpochEnvelope({
      collectionId: epoch.collectionId, epochNumber: epoch.epochNumber, recipientKind: 'recovery', recipientId: input.newRecoveryKeyId,
      senderId: input.newRecoveryKeyId, recipientEncryptionPublicKey: input.newRecoveryEncryptionPublicKey,
      epochKey: epoch.key, signingSecretKey: input.newRecoverySigningSecretKey,
    });
    const decoded = decodeCanonicalCbor(envelope.payload);
    return new Map<number, CborValue>([[1, epoch.collectionId], [2, epoch.epochNumber], [3, decoded.get(7)!], [4, decoded.get(8)!], [5, envelope.payload], [6, envelope.signature]]);
  }));
  const unsignedPayload = new Map<number, CborValue>([
    [1, input.newRecoveryKeyId], [2, input.newRecoveryEncryptionPublicKey], [3, input.newRecoverySigningPublicKey],
    [4, input.activeDeviceId], [6, envelopes],
  ]);
  const activeSignature = await signProtocolRecord('clipsx/vault/v1/recovery-rotate-active', encodeCanonicalCbor(unsignedPayload), input.activeDeviceSigningSecretKey);
  const payload = new Map(unsignedPayload); payload.set(5, activeSignature);
  const command = new Map<number, CborValue>([
    [1, 1], [2, input.operationId ?? crypto.randomUUID()], [3, 'recovery-rotate'], [4, input.accountId],
    [5, `recovery:${input.oldRecoveryKeyId}`], [7, input.expectedAccountHead], [9, encodeCanonicalCbor(payload)],
  ]);
  command.set(10, await signProtocolRecord('clipsx/vault/v1/command/recovery-rotate', encodeCanonicalCbor(command), input.oldRecoverySigningSecretKey));
  return encodeCanonicalCbor(command);
}
