import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';
import { createCollectionCommand, createEpochEnvelope } from './browser-collection-create';
import { admitCollectionCreation } from './command-admission';
import { openVaultBootstrap } from './browser-vault-bootstrap';
import { decodeCanonicalCbor, decodeVaultCommand, encodeCanonicalCbor, encryptAesGcm, importHpkePrivateKey, openHpke, sha256, signProtocolRecord, utf8, type CborValue } from './protocol';

describe('retained epoch delivery', () => {
  it('encrypts a new collection key for every supplied active device', async () => {
    const signer = ed25519.keygen(); const first = x25519.keygen(); const second = x25519.keygen();
    const created = await createCollectionCommand({ accountId: 'a', deviceId: 'd1', deviceEncryptionPublicKey: first.publicKey,
      recoveryKeyId: 'r', recoveryEncryptionPublicKey: x25519.keygen().publicKey, deviceSigningSecretKey: signer.secretKey,
      expectedAccountHead: new Uint8Array(32), metadataTitle: 'Shared', additionalDevices: [{ id: 'd2', encryptionPublicKey: second.publicKey }] });
    const admitted = admitCollectionCreation(decodeVaultCommand(created.command));
    expect(admitted.additionalDeviceEnvelopes).toHaveLength(1);
    const envelope = admitted.additionalDeviceEnvelopes[0];
    expect(await openHpke(await importHpkePrivateKey(second.secretKey), { enc: envelope.encapsulation, ciphertext: envelope.ciphertext },
      utf8(`clipsx/vault/v1/epoch-envelope\0${created.collectionId}\0${1}\0device\0d2`))).toEqual(created.epochKey);
  });

  it('opens rotated metadata and historical keys when envelope and transition authors differ', async () => {
    const creator = ed25519.keygen(); const approver = ed25519.keygen(); const recipient = ed25519.keygen(); const encryption = x25519.keygen();
    const key1 = new Uint8Array(32).fill(1); const key2 = new Uint8Array(32).fill(2);
    const metadata = await encryptAesGcm(key2, encodeCanonicalCbor(new Map<number, CborValue>([[1, 1], [2, 'Rotated']])), utf8('clipsx/vault/v1/collection-metadata\0c'));
    const envelopes = await Promise.all([key1, key2].map((epochKey, index) => createEpochEnvelope({ collectionId: 'c', epochNumber: index + 1,
      recipientKind: 'device', recipientId: 'recipient', senderId: 'approver', recipientEncryptionPublicKey: encryption.publicKey, epochKey, signingSecretKey: approver.secretKey })));
    const transition = encodeCanonicalCbor(new Map<number, CborValue>([[1, 1], [2, 'c'], [3, 2]]));
    const operation = new Map<number, CborValue>([[1, 1], [2, 'o'], [3, 'member-add'], [4, 'a'], [5, 'device:creator'], [6, 'c']]);
    const operationPayload = encodeCanonicalCbor(operation);
    const operationSignature = await signProtocolRecord('clipsx/vault/v1/command/member-add', operationPayload, creator.secretKey);
    operation.set(10, operationSignature);
    const current = decodeCanonicalCbor(envelopes[1].payload);
    const collection = new Map<number, CborValue>([[1, 'c'], [2, metadata.ciphertext], [3, metadata.nonce], [4, 2], [5, transition],
      [6, await signProtocolRecord('clipsx/vault/v1/epoch-transition', transition, creator.secretKey)], [7, await sha256(transition)],
      [8, current.get(7)!], [9, current.get(8)!], [10, envelopes[1].payload], [11, await sha256(envelopes[1].payload)], [12, envelopes[1].signature],
      [13, 'approver'], [14, await sha256(encodeCanonicalCbor(operation))], [15, operationPayload], [16, operationSignature], [17, 'creator'], [18, 'creator'],
      [19, [new Map<number, CborValue>([[1, 1], [2, envelopes[0].payload], [3, envelopes[0].signature], [4, 'device'], [5, 'approver']])]], [20, 'device']]);
    const root = new Map<number, CborValue>([[1, 1], [2, 'recipient'], [3, recipient.publicKey], [4, encryption.publicKey], [5, 'r'], [6, x25519.keygen().publicKey], [7, [collection]], [8, new Uint8Array(32)]]);
    const input = { bytes: encodeCanonicalCbor(root), accountId: 'a', deviceEncryptionSecretKey: encryption.secretKey, deviceSigningSecretKey: recipient.secretKey,
      expectedAccountHead: new Uint8Array(32), deviceSigningKeys: new Map([['creator', creator.publicKey], ['approver', approver.publicKey]]) };
    const opened = await openVaultBootstrap(input);
    expect(opened.collections).toEqual([{ id: 'c', title: 'Rotated' }]);
    expect(opened.epochKeys.map((entry) => entry.epochKey)).toEqual([key1, key2]);
    collection.set(19, [new Map<number, CborValue>([[1, 1], [2, envelopes[1].payload], [3, envelopes[1].signature], [4, 'device'], [5, 'approver']])]);
    await expect(openVaultBootstrap({ ...input, bytes: encodeCanonicalCbor(root) })).rejects.toThrow('binding mismatch');
  });
});
