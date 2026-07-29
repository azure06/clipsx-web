import { encodeCanonicalCbor, signProtocolRecord, type CborValue } from './protocol';

export async function createNoteDeleteCommand(input: {
  accountId: string;
  collectionId: string;
  deviceId: string;
  deviceSigningSecretKey: Uint8Array;
  expectedCollectionHead: Uint8Array;
  noteId: string;
  expectedRevisionHash: Uint8Array;
  operationId?: string;
}): Promise<Uint8Array> {
  if (input.expectedCollectionHead.byteLength !== 32 || input.expectedRevisionHash.byteLength !== 32) {
    throw new Error('Delete preconditions must be 32 bytes.');
  }
  const unsigned = new Map<number, CborValue>([
    [1, 1], [2, input.operationId ?? crypto.randomUUID()], [3, 'note-delete'], [4, input.accountId],
    [5, `device:${input.deviceId}`], [6, input.collectionId], [8, input.expectedCollectionHead],
    [9, encodeCanonicalCbor(new Map<number, CborValue>([[1, input.noteId], [2, input.expectedRevisionHash]]))],
  ]);
  const signed = encodeCanonicalCbor(unsigned);
  unsigned.set(10, await signProtocolRecord('clipsx/vault/v1/command/note-delete', signed, input.deviceSigningSecretKey));
  return encodeCanonicalCbor(unsigned);
}
