import { ed25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';

import { createEncryptedRevision, decryptRevisionContent } from './encrypted-revision';
import { decodeCanonicalCbor, utf8 } from './protocol';

describe('encrypted note revisions', () => {
  it('encrypts content under a fresh revision key wrapped by the collection epoch', async () => {
    const signing = ed25519.keygen(new Uint8Array(32).fill(7));
    const revision = await createEncryptedRevision({
      accountId: 'account', collectionId: 'collection', noteId: 'note', epoch: 1, revision: 1, operationId: 'operation',
      epochKey: new Uint8Array(32).fill(8), authorDeviceId: 'device', authorSigningSecretKey: signing.secretKey,
      content: { type: 'note', title: 'Private title', body: 'Private body', labels: ['private'], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    });
    const plaintext = await decryptRevisionContent({
      accountId: 'account', collectionId: 'collection', noteId: 'note', epoch: 1, revision: 1, epochKey: new Uint8Array(32).fill(8),
      encryptedContent: revision.encryptedContent, wrappedRevisionKey: revision.wrappedRevisionKey,
    });
    expect(decodeCanonicalCbor(plaintext).get(3)).toBe('Private title');
    await expect(decryptRevisionContent({
      accountId: 'account', collectionId: 'collection', noteId: 'other', epoch: 1, revision: 1, epochKey: new Uint8Array(32).fill(8),
      encryptedContent: revision.encryptedContent, wrappedRevisionKey: revision.wrappedRevisionKey,
    })).rejects.toThrow();
    expect(revision.encryptedContent.ciphertext).not.toEqual(utf8('Private body'));
  });
});
