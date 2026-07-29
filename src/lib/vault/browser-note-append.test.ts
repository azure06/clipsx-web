import { ed25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';

import { admitNoteAppend } from './command-admission';
import { createNoteAppendCommand } from './browser-note-append';
import { decodeVaultCommand } from './protocol';

describe('note append command', () => {
  it('binds the first encrypted revision to the current collection head', async () => {
    const signing = ed25519.keygen(new Uint8Array(32).fill(19));
    const result = await createNoteAppendCommand({
      accountId: 'account-1', collectionId: 'collection-1', deviceId: 'device-1', epochKey: new Uint8Array(32).fill(7),
      deviceSigningSecretKey: signing.secretKey, expectedCollectionHead: new Uint8Array(32).fill(8),
      noteId: 'note-1', operationId: 'operation-1', content: { type: 'note', title: 'Private', body: 'Text', labels: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    });
    const command = decodeVaultCommand(result.command);
    expect(command.operationType).toBe('note-append');
    expect(command.expectedCollectionHead).toEqual(new Uint8Array(32).fill(8));
    expect(result.noteId).toBe('note-1');
    await expect(admitNoteAppend(command, signing.publicKey)).resolves.toMatchObject({ noteId: 'note-1', collectionEpoch: 1, revisionNumber: 1 });
  });
});
