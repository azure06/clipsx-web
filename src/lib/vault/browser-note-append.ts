import { createEncryptedRevision, type VaultNoteContent } from './encrypted-revision';
import { encodeCanonicalCbor, signProtocolRecord, type CborValue } from './protocol';

export async function createNoteAppendCommand(input: {
  accountId: string; collectionId: string; deviceId: string; epochKey: Uint8Array;
  deviceSigningSecretKey: Uint8Array; expectedAccountHead: Uint8Array;
  expectedCollectionHead: Uint8Array; content: VaultNoteContent;
  noteId?: string; operationId?: string; revisionNumber?: number; previousRevisionHash?: Uint8Array; epochNumber?: number;
}): Promise<{ noteId: string; command: Uint8Array }> {
  if (input.expectedAccountHead.byteLength !== 32 || input.expectedCollectionHead.byteLength !== 32) {
    throw new Error('Expected account and collection heads must be 32 bytes.');
  }
  const noteId = input.noteId ?? crypto.randomUUID();
  const operationId = input.operationId ?? crypto.randomUUID();
  const revisionNumber = input.revisionNumber ?? 1;
  const epochNumber = input.epochNumber ?? 1;
  if (!Number.isSafeInteger(epochNumber) || epochNumber < 1) throw new Error('Invalid collection epoch.');
  if (!Number.isSafeInteger(revisionNumber) || revisionNumber < 1 || (revisionNumber === 1) !== !input.previousRevisionHash || (input.previousRevisionHash && input.previousRevisionHash.byteLength !== 32)) throw new Error('Invalid revision precondition.');
  const revision = await createEncryptedRevision({
    accountId: input.accountId, collectionId: input.collectionId, noteId, epoch: epochNumber, revision: revisionNumber,
    operationId, previousRevisionHash: input.previousRevisionHash, epochKey: input.epochKey, authorDeviceId: input.deviceId,
    authorSigningSecretKey: input.deviceSigningSecretKey, content: input.content,
  });
  const payload = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, noteId], [2, epochNumber], [3, revisionNumber], [4, revision.encryptedContent.nonce],
    [5, revision.wrappedRevisionKey.nonce], [6, revision.ciphertextHash],
    [7, revision.wrappedRevisionKeyHash], [8, revision.revisionHash],
    [9, revision.signature], [10, input.content.type],
    ...(input.previousRevisionHash ? [[11, input.previousRevisionHash] as [number, CborValue]] : []),
  ]));
  const unsigned = new Map<number, CborValue>([
    [1, 1], [2, operationId], [3, 'note-append'], [4, input.accountId], [5, `device:${input.deviceId}`],
    [6, input.collectionId], [7, input.expectedAccountHead], [8, input.expectedCollectionHead], [9, payload],
  ]);
  const signed = encodeCanonicalCbor(unsigned);
  unsigned.set(10, await signProtocolRecord('clipsx/vault/v1/command/note-append', signed, input.deviceSigningSecretKey));
  unsigned.set(11, new Map<number, CborValue>([
    [1, revision.encryptedContent.ciphertext],
    [2, revision.wrappedRevisionKey.ciphertext],
  ]));
  return { noteId, command: encodeCanonicalCbor(unsigned) };
}
