import { createEncryptedRevision, type VaultNoteContent } from './encrypted-revision';
import { encodeCanonicalCbor, signProtocolRecord, type CborValue } from './protocol';

export async function createNoteAppendCommand(input: {
  accountId: string; collectionId: string; deviceId: string; epochKey: Uint8Array;
  deviceSigningSecretKey: Uint8Array; expectedCollectionHead: Uint8Array; content: VaultNoteContent;
  noteId?: string; operationId?: string;
}): Promise<{ noteId: string; command: Uint8Array }> {
  if (input.expectedCollectionHead.byteLength !== 32) throw new Error('Expected collection head must be 32 bytes.');
  const noteId = input.noteId ?? crypto.randomUUID();
  const operationId = input.operationId ?? crypto.randomUUID();
  const revision = await createEncryptedRevision({
    accountId: input.accountId, collectionId: input.collectionId, noteId, epoch: 1, revision: 1,
    operationId, epochKey: input.epochKey, authorDeviceId: input.deviceId,
    authorSigningSecretKey: input.deviceSigningSecretKey, content: input.content,
  });
  const payload = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, noteId], [2, 1], [3, 1], [4, revision.encryptedContent.ciphertext], [5, revision.encryptedContent.nonce],
    [6, revision.wrappedRevisionKey.ciphertext], [7, revision.wrappedRevisionKey.nonce], [8, revision.ciphertextHash],
    [9, revision.wrappedRevisionKeyHash], [10, revision.revisionHash], [11, revision.signature], [12, input.content.type],
  ]));
  const unsigned = new Map<number, CborValue>([
    [1, 1], [2, operationId], [3, 'note-append'], [4, input.accountId], [5, `device:${input.deviceId}`],
    [6, input.collectionId], [8, input.expectedCollectionHead], [9, payload],
  ]);
  const signed = encodeCanonicalCbor(unsigned);
  unsigned.set(10, await signProtocolRecord('clipsx/vault/v1/command/note-append', signed, input.deviceSigningSecretKey));
  return { noteId, command: encodeCanonicalCbor(unsigned) };
}
