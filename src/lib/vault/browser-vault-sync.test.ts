import { ed25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';

import { createNoteDeleteCommand } from './browser-note-delete';
import { openVaultCollectionSync } from './browser-vault-sync';
import { decodeCanonicalCbor, decodeVaultCommand, encodeCanonicalCbor, sha256, verifyProtocolRecord, type CborValue } from './protocol';

describe('vault collection sync tombstones', () => {
  it('accepts a tombstone only when its signed deletion operation binds the same note and revision head', async () => {
    const signing = ed25519.keygen(new Uint8Array(32).fill(41));
    const revisionHash = new Uint8Array(32).fill(9);
    const commandBytes = await createNoteDeleteCommand({
      accountId: 'account-1', collectionId: 'collection-1', deviceId: 'device-1', deviceSigningSecretKey: signing.secretKey,
      expectedAccountHead: new Uint8Array(32).fill(7), expectedCollectionHead: new Uint8Array(32).fill(8),
      noteId: 'note-1', expectedRevisionHash: revisionHash, operationId: 'operation-1',
    });
    const command = decodeVaultCommand(commandBytes);
    const reconstructed = decodeCanonicalCbor(command.signedBytes);
    reconstructed.set(10, command.signature);
    expect(await sha256(encodeCanonicalCbor(reconstructed))).toEqual(await sha256(commandBytes));
    expect(await verifyProtocolRecord('clipsx/vault/v1/command/note-delete', command.signedBytes, command.signature, signing.publicKey)).toBe(true);
    const sync = encodeCanonicalCbor(new Map<number, CborValue>([
      [1, 1], [2, 'collection-1'],
      [3, [new Map<number, CborValue>([[1, 'operation-1'], [2, 1], [3, 'note-delete'], [4, command.signedBytes], [5, null], [6, await sha256(commandBytes)], [7, 'device-1'], [8, command.signature]])]],
      [4, []], [5, 1], [6, [new Map<number, CborValue>([[1, 'note-1'], [2, revisionHash], [3, 'device-1'], [4, 'operation-1']])]],
      [7, await sha256(commandBytes)], [8, false],
    ]));
    await expect(openVaultCollectionSync({ pages: [sync], accountId: 'account-1', collectionId: 'collection-1', deviceSigningKeys: new Map([['device-1', signing.publicKey]]), epochNumber: 1, epochKey: new Uint8Array(32).fill(3) })).resolves.toEqual([]);
  });
});
