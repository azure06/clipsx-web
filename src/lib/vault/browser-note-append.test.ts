import { ed25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';

import { admitItemAppend } from './command-admission';
import { createItemAppendCommand } from './browser-note-append';
import { decodeVaultCommand } from './protocol';

describe('item append command', () => {
  it('binds the first encrypted revision to the current collection head', async () => {
    const signing = ed25519.keygen(new Uint8Array(32).fill(19));
    const result = await createItemAppendCommand({
      accountId: 'account-1', collectionId: 'collection-1', deviceId: 'device-1', epochKey: new Uint8Array(32).fill(7),
      deviceSigningSecretKey: signing.secretKey, expectedAccountHead: new Uint8Array(32).fill(6),
      expectedCollectionHead: new Uint8Array(32).fill(8), epochNumber: 3,
      itemId: 'item-1', operationId: 'operation-1', content: { mediaType: 'text/plain', title: 'Private', content: new TextEncoder().encode('Text'), properties: {}, labels: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    });
    const command = decodeVaultCommand(result.command);
    expect(command.operationType).toBe('item-append');
    expect(command.expectedCollectionHead).toEqual(new Uint8Array(32).fill(8));
    expect(result.itemId).toBe('item-1');
    await expect(admitItemAppend(command, signing.publicKey)).resolves.toMatchObject({ itemId: 'item-1', collectionEpoch: 3, revisionNumber: 1 });
  });
});
