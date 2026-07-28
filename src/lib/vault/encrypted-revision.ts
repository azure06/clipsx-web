import {
  decryptAesGcm,
  encodeCanonicalCbor,
  encryptAesGcm,
  randomBytes,
  sha256,
  signProtocolRecord,
  utf8,
  type AesGcmCiphertext,
  type CborValue,
} from './protocol';

export type VaultNoteContent = {
  type: 'note' | 'login';
  title: string;
  body?: string;
  username?: string;
  password?: string;
  url?: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
};

export type EncryptedRevision = {
  encryptedContent: AesGcmCiphertext;
  wrappedRevisionKey: AesGcmCiphertext;
  ciphertextHash: Uint8Array;
  wrappedRevisionKeyHash: Uint8Array;
  revisionHash: Uint8Array;
  signature: Uint8Array;
};

function contentRecord(content: VaultNoteContent): Uint8Array {
  return encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1], [2, content.type], [3, content.title], [4, content.body ?? ''],
    [5, content.username ?? ''], [6, content.password ?? ''], [7, content.url ?? ''],
    [8, content.labels], [9, content.createdAt], [10, content.updatedAt],
  ]));
}

function aad(accountId: string, collectionId: string, noteId: string, epoch: number, revision: number, purpose: string): Uint8Array {
  return utf8(`clipsx/vault/v1/${purpose}\0${accountId}\0${collectionId}\0${noteId}\0${epoch}\0${revision}`);
}

export async function createEncryptedRevision(input: {
  accountId: string; collectionId: string; noteId: string; epoch: number; revision: number;
  operationId: string; previousRevisionHash?: Uint8Array; epochKey: Uint8Array;
  authorDeviceId: string; authorSigningSecretKey: Uint8Array; content: VaultNoteContent;
}): Promise<EncryptedRevision> {
  const revisionKey = randomBytes(32);
  const encryptedContent = await encryptAesGcm(revisionKey, contentRecord(input.content), aad(input.accountId, input.collectionId, input.noteId, input.epoch, input.revision, 'content'));
  const wrappedRevisionKey = await encryptAesGcm(input.epochKey, revisionKey, aad(input.accountId, input.collectionId, input.noteId, input.epoch, input.revision, 'revision-key'));
  const ciphertextHash = await sha256(encryptedContent.ciphertext);
  const wrappedRevisionKeyHash = await sha256(wrappedRevisionKey.ciphertext);
  const signed = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1], [2, input.operationId], [3, input.collectionId], [4, input.noteId], [5, input.epoch], [6, input.revision],
    [7, input.previousRevisionHash ?? null], [8, ciphertextHash], [9, wrappedRevisionKeyHash], [10, input.authorDeviceId],
  ]));
  const revisionHash = await sha256(signed);
  const signature = await signProtocolRecord('clipsx/vault/v1/note-revision', signed, input.authorSigningSecretKey);
  return { encryptedContent, wrappedRevisionKey, ciphertextHash, wrappedRevisionKeyHash, revisionHash, signature };
}

export async function decryptRevisionContent(input: {
  accountId: string; collectionId: string; noteId: string; epoch: number; revision: number;
  epochKey: Uint8Array; encryptedContent: AesGcmCiphertext; wrappedRevisionKey: AesGcmCiphertext;
}): Promise<Uint8Array> {
  const revisionKey = await decryptAesGcm(input.epochKey, input.wrappedRevisionKey, aad(input.accountId, input.collectionId, input.noteId, input.epoch, input.revision, 'revision-key'));
  return decryptAesGcm(revisionKey, input.encryptedContent, aad(input.accountId, input.collectionId, input.noteId, input.epoch, input.revision, 'content'));
}
