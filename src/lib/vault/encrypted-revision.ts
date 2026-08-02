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
import { encodeVaultItem, type VaultItemContent } from './vault-item';

export type { VaultItemContent } from './vault-item';

export type EncryptedRevision = {
  encryptedContent: AesGcmCiphertext;
  wrappedRevisionKey: AesGcmCiphertext;
  ciphertextHash: Uint8Array;
  wrappedRevisionKeyHash: Uint8Array;
  revisionHash: Uint8Array;
  signature: Uint8Array;
};

function aad(accountId: string, collectionId: string, itemId: string, epoch: number, revision: number, purpose: string): Uint8Array {
  return utf8(`clipsx/vault/v1/${purpose}\0${accountId}\0${collectionId}\0${itemId}\0${epoch}\0${revision}`);
}

export async function createEncryptedRevision(input: {
  accountId: string; collectionId: string; itemId: string; epoch: number; revision: number;
  operationId: string; previousRevisionHash?: Uint8Array; epochKey: Uint8Array;
  authorDeviceId: string; authorSigningSecretKey: Uint8Array; content: VaultItemContent;
}): Promise<EncryptedRevision> {
  const revisionKey = randomBytes(32);
  const encryptedContent = await encryptAesGcm(revisionKey, encodeVaultItem(input.content), aad(input.accountId, input.collectionId, input.itemId, input.epoch, input.revision, 'content'));
  const wrappedRevisionKey = await encryptAesGcm(input.epochKey, revisionKey, aad(input.accountId, input.collectionId, input.itemId, input.epoch, input.revision, 'revision-key'));
  const ciphertextHash = await sha256(encryptedContent.ciphertext);
  const wrappedRevisionKeyHash = await sha256(wrappedRevisionKey.ciphertext);
  const signed = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1], [2, input.operationId], [3, input.collectionId], [4, input.itemId], [5, input.epoch], [6, input.revision],
    [7, input.previousRevisionHash ?? null], [8, ciphertextHash], [9, wrappedRevisionKeyHash], [10, input.authorDeviceId],
  ]));
  const revisionHash = await sha256(signed);
  const signature = await signProtocolRecord('clipsx/vault/v1/item-revision', signed, input.authorSigningSecretKey);
  return { encryptedContent, wrappedRevisionKey, ciphertextHash, wrappedRevisionKeyHash, revisionHash, signature };
}

export async function decryptRevisionContent(input: {
  accountId: string; collectionId: string; itemId: string; epoch: number; revision: number;
  epochKey: Uint8Array; encryptedContent: AesGcmCiphertext; wrappedRevisionKey: AesGcmCiphertext;
}): Promise<Uint8Array> {
  const revisionKey = await decryptAesGcm(input.epochKey, input.wrappedRevisionKey, aad(input.accountId, input.collectionId, input.itemId, input.epoch, input.revision, 'revision-key'));
  return decryptAesGcm(revisionKey, input.encryptedContent, aad(input.accountId, input.collectionId, input.itemId, input.epoch, input.revision, 'content'));
}
