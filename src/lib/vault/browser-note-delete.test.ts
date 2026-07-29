import { ed25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';

import { admitNoteDelete } from './command-admission';
import { createNoteDeleteCommand } from './browser-note-delete';
import { decodeVaultCommand } from './protocol';

describe('note delete command', () => {
  it('binds the collection and exact accepted revision heads', async () => {
    const signing = ed25519.keygen(new Uint8Array(32).fill(23));
    const command = decodeVaultCommand(await createNoteDeleteCommand({
      accountId: 'account-1', collectionId: 'collection-1', deviceId: 'device-1', deviceSigningSecretKey: signing.secretKey,
      expectedAccountHead: new Uint8Array(32).fill(6), expectedCollectionHead: new Uint8Array(32).fill(7),
      noteId: 'note-1', expectedRevisionHash: new Uint8Array(32).fill(8), operationId: 'operation-1',
    }));
    expect(command.operationType).toBe('note-delete');
    expect(command.expectedCollectionHead).toEqual(new Uint8Array(32).fill(7));
    expect(admitNoteDelete(command)).toEqual({ noteId: 'note-1', expectedRevisionHash: new Uint8Array(32).fill(8) });
  });
});
