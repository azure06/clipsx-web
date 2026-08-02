import { encodeCanonicalCbor, signProtocolRecord, type CborValue } from './protocol';

export async function createItemDeleteCommand(input: {
  accountId: string;
  collectionId: string;
  deviceId: string;
  deviceSigningSecretKey: Uint8Array;
  expectedAccountHead: Uint8Array;
  expectedCollectionHead: Uint8Array;
  itemId: string;
  expectedRevisionHash: Uint8Array;
  operationId?: string;
}): Promise<Uint8Array> {
  if (input.expectedAccountHead.byteLength !== 32 || input.expectedCollectionHead.byteLength !== 32 || input.expectedRevisionHash.byteLength !== 32) {
    throw new Error('Delete preconditions must be 32 bytes.');
  }
  const unsigned = new Map<number, CborValue>([
    [1, 1], [2, input.operationId ?? crypto.randomUUID()], [3, 'item-delete'], [4, input.accountId],
    [5, `device:${input.deviceId}`], [6, input.collectionId], [7, input.expectedAccountHead],
    [8, input.expectedCollectionHead],
    [9, encodeCanonicalCbor(new Map<number, CborValue>([[1, input.itemId], [2, input.expectedRevisionHash]]))],
  ]);
  const signed = encodeCanonicalCbor(unsigned);
  unsigned.set(10, await signProtocolRecord('clipsx/vault/v1/command/item-delete', signed, input.deviceSigningSecretKey));
  return encodeCanonicalCbor(unsigned);
}
/** @deprecated use createItemDeleteCommand */
export const createNoteDeleteCommand = createItemDeleteCommand;
