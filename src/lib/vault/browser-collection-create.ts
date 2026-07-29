import {
  encryptAesGcm,
  encodeCanonicalCbor,
  importHpkePublicKey,
  randomBytes,
  sealHpke,
  sha256,
  signProtocolRecord,
  utf8,
  type CborValue,
} from './protocol';

export type CollectionCreateCommand = { collectionId: string; command: Uint8Array; epochKey: Uint8Array };

async function envelope(input: {
  collectionId: string;
  recipientKind: 'device' | 'recovery';
  recipientId: string;
  senderDeviceId: string;
  recipientEncryptionPublicKey: Uint8Array;
  epochKey: Uint8Array;
  signingSecretKey: Uint8Array;
}) {
  const aad = utf8(`clipsx/vault/v1/epoch-envelope\0${input.collectionId}\0${1}\0${input.recipientKind}\0${input.recipientId}`);
  const sealed = await sealHpke(await importHpkePublicKey(input.recipientEncryptionPublicKey), input.epochKey, aad);
  const payload = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1], [2, input.collectionId], [3, 1], [4, input.recipientKind], [5, input.recipientId],
    [6, input.senderDeviceId], [7, sealed.enc], [8, sealed.ciphertext],
  ]));
  return {
    payload,
    signature: await signProtocolRecord('clipsx/vault/v1/epoch-envelope', payload, input.signingSecretKey),
  };
}

export async function createCollectionCommand(input: {
  accountId: string;
  deviceId: string;
  deviceEncryptionPublicKey: Uint8Array;
  recoveryKeyId: string;
  recoveryEncryptionPublicKey: Uint8Array;
  deviceSigningSecretKey: Uint8Array;
  encryptedMetadata: Uint8Array;
  collectionId?: string;
  operationId?: string;
}): Promise<CollectionCreateCommand> {
  const collectionId = input.collectionId ?? crypto.randomUUID();
  const epochKey = randomBytes(32);
  const metadata = await encryptAesGcm(epochKey, input.encryptedMetadata, utf8(`clipsx/vault/v1/collection-metadata\0${input.accountId}\0${collectionId}`));
  const membershipStateHash = await sha256(encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1], [2, collectionId], [3, input.accountId], [4, input.deviceId], [5, 'owner'], [6, 'active'],
  ])));
  const deviceEnvelope = await envelope({
    collectionId, recipientKind: 'device', recipientId: input.deviceId, senderDeviceId: input.deviceId,
    recipientEncryptionPublicKey: input.deviceEncryptionPublicKey, epochKey, signingSecretKey: input.deviceSigningSecretKey,
  });
  const recoveryEnvelope = await envelope({
    collectionId, recipientKind: 'recovery', recipientId: input.recoveryKeyId, senderDeviceId: input.deviceId,
    recipientEncryptionPublicKey: input.recoveryEncryptionPublicKey, epochKey, signingSecretKey: input.deviceSigningSecretKey,
  });
  const recipientSetCommitment = await sha256(encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1], [2, await sha256(deviceEnvelope.payload)], [3, await sha256(recoveryEnvelope.payload)],
  ])));
  const transitionPayload = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1], [2, collectionId], [3, 1], [4, 'collection-created'], [5, membershipStateHash], [6, recipientSetCommitment],
  ]));
  const transitionSignature = await signProtocolRecord('clipsx/vault/v1/epoch-transition', transitionPayload, input.deviceSigningSecretKey);
  const transitionHash = await sha256(transitionPayload);
  const payload = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, collectionId], [2, metadata.ciphertext], [3, metadata.nonce], [4, membershipStateHash],
    [5, recipientSetCommitment], [6, transitionPayload], [7, transitionSignature], [8, transitionHash],
    [9, deviceEnvelope.payload], [10, deviceEnvelope.signature], [11, recoveryEnvelope.payload],
    [12, recoveryEnvelope.signature], [13, input.recoveryKeyId],
  ]));
  const unsigned = new Map<number, CborValue>([
    [1, 1], [2, input.operationId ?? crypto.randomUUID()], [3, 'collection-create'], [4, input.accountId],
    [5, `device:${input.deviceId}`], [6, collectionId], [9, payload],
  ]);
  const signed = encodeCanonicalCbor(unsigned);
  unsigned.set(10, await signProtocolRecord('clipsx/vault/v1/command/collection-create', signed, input.deviceSigningSecretKey));
  return { collectionId, command: encodeCanonicalCbor(unsigned), epochKey };
}
