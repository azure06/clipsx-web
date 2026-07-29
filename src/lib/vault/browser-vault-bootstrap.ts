import { ed25519 } from '@noble/curves/ed25519.js';

import { decryptAesGcm, decodeCanonicalCbor, importHpkePrivateKey, openHpke, sha256, utf8, verifyProtocolRecord, type CborValue } from './protocol';

type BootstrapCollection = {
  id: string;
  metadataCiphertext: Uint8Array;
  metadataNonce: Uint8Array;
  epochNumber: number;
  transitionPayload: Uint8Array;
  transitionSignature: Uint8Array;
  transitionHash: Uint8Array;
  envelopeEncapsulation: Uint8Array;
  envelopeCiphertext: Uint8Array;
  envelopePayload: Uint8Array;
  envelopePayloadHash: Uint8Array;
  envelopeSignature: Uint8Array;
  senderDeviceId: string;
};

function text(record: Map<number, CborValue>, label: number): string {
  const value = record.get(label); if (typeof value !== 'string' || value.length === 0) throw new Error('Invalid vault bootstrap.'); return value;
}
function bytes(record: Map<number, CborValue>, label: number, length?: number): Uint8Array {
  const value = record.get(label); if (!(value instanceof Uint8Array) || (length !== undefined && value.byteLength !== length)) throw new Error('Invalid vault bootstrap.'); return value;
}

export function decodeVaultBootstrap(input: Uint8Array): { deviceId: string; deviceSigningPublicKey: Uint8Array; collections: BootstrapCollection[] } {
  const record = decodeCanonicalCbor(input);
  const collections = record.get(4);
  if (record.size !== 4 || record.get(1) !== 1 || !Array.isArray(collections)) throw new Error('Invalid vault bootstrap.');
  return {
    deviceId: text(record, 2), deviceSigningPublicKey: bytes(record, 3, 32),
    collections: collections.map((entry) => {
      if (!(entry instanceof Map) || entry.size !== 13 || entry.get(4) !== 1) throw new Error('Invalid vault bootstrap.');
      return {
        id: text(entry, 1), metadataCiphertext: bytes(entry, 2), metadataNonce: bytes(entry, 3, 12), epochNumber: 1,
        transitionPayload: bytes(entry, 5), transitionSignature: bytes(entry, 6, 64), transitionHash: bytes(entry, 7, 32),
        envelopeEncapsulation: bytes(entry, 8, 32), envelopeCiphertext: bytes(entry, 9), envelopePayload: bytes(entry, 10), envelopePayloadHash: bytes(entry, 11, 32),
        envelopeSignature: bytes(entry, 12, 64), senderDeviceId: text(entry, 13),
      };
    }),
  };
}

export async function openVaultBootstrap(input: {
  bytes: Uint8Array;
  accountId: string;
  deviceEncryptionSecretKey: Uint8Array;
  deviceSigningSecretKey: Uint8Array;
}): Promise<Array<{ id: string; title: string }>> {
  const bootstrap = decodeVaultBootstrap(input.bytes);
  const signingPublicKey = ed25519.getPublicKey(input.deviceSigningSecretKey);
  if (!signingPublicKey.every((value, index) => value === bootstrap.deviceSigningPublicKey[index])) throw new Error('Vault device key mismatch.');
  return Promise.all(bootstrap.collections.map(async (collection) => {
    if (collection.senderDeviceId !== bootstrap.deviceId
      || !(await verifyProtocolRecord('clipsx/vault/v1/epoch-transition', collection.transitionPayload, collection.transitionSignature, signingPublicKey))
      || !(await verifyProtocolRecord('clipsx/vault/v1/epoch-envelope', collection.envelopePayload, collection.envelopeSignature, signingPublicKey))) {
      throw new Error('Unverified vault collection record.');
    }
    const transitionHash = await sha256(collection.transitionPayload);
    const envelopeHash = await sha256(collection.envelopePayload);
    if (!transitionHash.every((value, index) => value === collection.transitionHash[index])) throw new Error('Vault transition hash mismatch.');
    if (!envelopeHash.every((value, index) => value === collection.envelopePayloadHash[index])) throw new Error('Vault envelope hash mismatch.');
    const envelope = decodeCanonicalCbor(collection.envelopePayload);
    if (envelope.size !== 8 || envelope.get(1) !== 1 || envelope.get(2) !== collection.id || envelope.get(3) !== collection.epochNumber
      || envelope.get(4) !== 'device' || envelope.get(5) !== bootstrap.deviceId || envelope.get(6) !== collection.senderDeviceId
      || !sameBytes(bytes(envelope, 7, 32), collection.envelopeEncapsulation) || !sameBytes(bytes(envelope, 8), collection.envelopeCiphertext)) {
      throw new Error('Vault envelope does not match bootstrap record.');
    }
    const epochKey = await openHpke(
      await importHpkePrivateKey(input.deviceEncryptionSecretKey),
      { enc: collection.envelopeEncapsulation, ciphertext: collection.envelopeCiphertext },
      utf8(`clipsx/vault/v1/epoch-envelope\0${collection.id}\0${collection.epochNumber}\0device\0${bootstrap.deviceId}`),
    );
    try {
      const metadata = await decryptAesGcm(epochKey, { nonce: collection.metadataNonce, ciphertext: collection.metadataCiphertext }, utf8(`clipsx/vault/v1/collection-metadata\0${input.accountId}\0${collection.id}`));
      const decoded = decodeCanonicalCbor(metadata);
      const title = decoded.get(2);
      if (decoded.size !== 2 || decoded.get(1) !== 1 || typeof title !== 'string' || !title) throw new Error('Invalid encrypted collection metadata.');
      return { id: collection.id, title };
    } finally {
      epochKey.fill(0);
    }
  }));
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((value, index) => value === right[index]);
}
