import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';

import { admitCollectionCreation } from './command-admission';
import { createCollectionCommand } from './browser-collection-create';
import { openVaultBootstrap } from './browser-vault-bootstrap';
import { decodeCanonicalCbor, decodeVaultCommand, encodeCanonicalCbor, sha256, type CborValue } from './protocol';

describe('vault bootstrap', () => {
  it('verifies the signed records and decrypts collection metadata locally', async () => {
    const signing = ed25519.keygen(new Uint8Array(32).fill(11));
    const deviceEncryption = x25519.keygen(new Uint8Array(32).fill(12));
    const recoveryEncryption = x25519.keygen(new Uint8Array(32).fill(13));
    const created = await createCollectionCommand({
      accountId: 'account-1', deviceId: 'device-1', deviceEncryptionPublicKey: deviceEncryption.publicKey,
      recoveryKeyId: 'recovery-1', recoveryEncryptionPublicKey: recoveryEncryption.publicKey,
      deviceSigningSecretKey: signing.secretKey, metadataTitle: 'Personal', collectionId: 'collection-1', operationId: 'operation-1',
    });
    const creation = admitCollectionCreation(decodeVaultCommand(created.command));
    const deviceEnvelope = decodeCanonicalCbor(creation.deviceEnvelope.payload);
    const bootstrap = encodeCanonicalCbor(new Map<number, CborValue>([
      [1, 1], [2, 'device-1'], [3, signing.publicKey], [4, deviceEncryption.publicKey], [5, 'recovery-1'], [6, recoveryEncryption.publicKey], [7, [new Map<number, CborValue>([
        [1, 'collection-1'], [2, creation.encryptedMetadata], [3, creation.metadataNonce], [4, 1],
        [5, creation.transitionPayload], [6, creation.transitionSignature], [7, creation.transitionHash],
        [8, deviceEnvelope.get(7)!], [9, deviceEnvelope.get(8)!], [10, creation.deviceEnvelope.payload], [11, await sha256(creation.deviceEnvelope.payload)],
        [12, creation.deviceEnvelope.signature], [13, 'device-1'], [14, await sha256(created.command)], [15, decodeVaultCommand(created.command).signedBytes], [16, decodeVaultCommand(created.command).signature], [17, 'device-1'],
      ])]], [8, new Uint8Array(32).fill(9)],
    ]));
    await expect(openVaultBootstrap({
      bytes: bootstrap, accountId: 'account-1', deviceEncryptionSecretKey: deviceEncryption.secretKey, deviceSigningSecretKey: signing.secretKey,
    })).resolves.toMatchObject({ collections: [{ id: 'collection-1', title: 'Personal' }] });
  });
});
