import { decryptRevisionContent } from './encrypted-revision';
import { decodeCanonicalCbor, encodeCanonicalCbor, sha256, verifyProtocolRecord, type CborValue } from './protocol';
import { decodeItemText, decodeVaultItem, type VaultItemContent } from './vault-item';

export type SyncedVaultItem = VaultItemContent & { id: string; revisionNumber: number; revisionHash: Uint8Array; authorDeviceId: string };
const bytes = (record: Map<number, CborValue>, label: number, size?: number) => { const value = record.get(label); if (!(value instanceof Uint8Array) || (size && value.byteLength !== size)) throw new Error('Invalid vault sync record.'); return value; };
const text = (record: Map<number, CborValue>, label: number) => { const value = record.get(label); if (typeof value !== 'string' || !value) throw new Error('Invalid vault sync record.'); return value; };
const same = (a: Uint8Array, b: Uint8Array) => a.byteLength === b.byteLength && a.every((v, i) => v === b[i]);

export async function openVaultCollectionSync(input: {
  pages: Uint8Array[];
  accountId: string;
  collectionId: string;
  deviceSigningKeys: Map<string, Uint8Array>;
  epochNumber: number;
  epochKey: Uint8Array;
}): Promise<SyncedVaultItem[]> {
  if (input.pages.length === 0) throw new Error('Vault collection sync returned no pages.');
  const known = new Map<string, Map<number, CborValue>>();
  const items: SyncedVaultItem[] = [];
  let operationHead: Uint8Array | null = null;
  let expectedSequence = 0;

  for (const [pageIndex, pageBytes] of input.pages.entries()) {
    const root = decodeCanonicalCbor(pageBytes); const operations = root.get(3); const revisions = root.get(4); const tombstones = root.get(6);
    const pageSequence = root.get(5); const pageHead = root.get(7); const hasMore = root.get(8);
    if (root.size !== 8 || root.get(1) !== 1 || root.get(2) !== input.collectionId || !Array.isArray(operations) || !Array.isArray(revisions) || !Array.isArray(tombstones)
      || !Number.isSafeInteger(pageSequence) || (pageHead !== null && !(pageHead instanceof Uint8Array)) || typeof hasMore !== 'boolean'
      || (pageIndex < input.pages.length - 1) !== hasMore) throw new Error('Invalid vault sync.');

    for (const entry of operations) {
      if (!(entry instanceof Map) || entry.size !== 8) throw new Error('Invalid vault operation.');
      const operationId = text(entry, 1); const sequence = entry.get(2); const payload = bytes(entry, 4); const hash = bytes(entry, 6, 32); const authorId = text(entry, 7); const signature = bytes(entry, 8, 64);
      const signingKey = input.deviceSigningKeys.get(authorId);
      if (!Number.isSafeInteger(sequence) || sequence !== expectedSequence + 1 || !signingKey
        || !same(operationHead ?? new Uint8Array(), (entry.get(5) as Uint8Array | null) ?? new Uint8Array())) throw new Error('Unverified vault operation chain.');
      const command = decodeCanonicalCbor(payload); const type = command.get(3);
      if (command.get(1) !== 1 || command.get(2) !== operationId || command.get(5) !== `device:${authorId}` || command.get(6) !== input.collectionId || typeof type !== 'string') throw new Error('Invalid vault operation.');
      command.set(10, signature);
      if (!same(await sha256(encodeCanonicalCbor(command)), hash) || !await verifyProtocolRecord(`clipsx/vault/v1/command/${type}`, payload, signature, signingKey)) throw new Error('Unverified vault operation.');
      known.set(operationId, command); operationHead = hash; expectedSequence = sequence as number;
    }
    if (pageSequence !== expectedSequence || !same((pageHead as Uint8Array | null) ?? new Uint8Array(), operationHead ?? new Uint8Array())) throw new Error('Vault sync page head mismatch.');

    for (const entry of revisions) {
      if (!(entry instanceof Map) || entry.size !== 14) throw new Error('Invalid vault revision.');
      const authorId = text(entry, 11); const signingKey = input.deviceSigningKeys.get(authorId); const epochNumber = entry.get(3);
      const operationId = text(entry, 13);
      if (!signingKey || epochNumber !== input.epochNumber || !known.has(operationId)) throw new Error('Invalid vault revision.');
      const revisionNumber = entry.get(2); if (typeof revisionNumber !== 'number' || !Number.isSafeInteger(revisionNumber) || revisionNumber < 1) throw new Error('Invalid vault revision.');
      const id = text(entry, 1); const ciphertext = bytes(entry, 4); const contentNonce = bytes(entry, 5, 12); const wrapped = bytes(entry, 6); const wrapNonce = bytes(entry, 7, 12); const ciphertextHash = bytes(entry, 8, 32); const wrappedHash = bytes(entry, 9, 32); const revisionHash = bytes(entry, 10, 32); const signature = bytes(entry, 12, 64); const previous = entry.get(14);
      if ((revisionNumber === 1) !== (previous === null) || (previous !== null && !(previous instanceof Uint8Array))) throw new Error('Invalid vault revision.');
      if (!same(await sha256(ciphertext), ciphertextHash) || !same(await sha256(wrapped), wrappedHash)) throw new Error('Vault revision hash mismatch.');
      const signed = encodeCanonicalCbor(new Map<number, CborValue>([[1, 1], [2, operationId], [3, input.collectionId], [4, id], [5, epochNumber], [6, revisionNumber], [7, previous as Uint8Array | null], [8, ciphertextHash], [9, wrappedHash], [10, authorId]]));
      if (!same(await sha256(signed), revisionHash) || !await verifyProtocolRecord('clipsx/vault/v1/item-revision', signed, signature, signingKey)) throw new Error('Unverified vault revision.');
      const content = decodeVaultItem(await decryptRevisionContent({ accountId: input.accountId, collectionId: input.collectionId, itemId: id, epoch: epochNumber, revision: revisionNumber, epochKey: input.epochKey, encryptedContent: { ciphertext, nonce: contentNonce }, wrappedRevisionKey: { ciphertext: wrapped, nonce: wrapNonce } }));
      // Temporary presentation adapter for the legacy shell. The encrypted
      // envelope remains generic and has no persisted `type` field.
      const item: SyncedVaultItem = { id, revisionNumber, revisionHash, authorDeviceId: authorId, ...content, type: 'note', body: content.mediaType?.startsWith('text/') || content.mediaType === 'application/vnd.clipsx.env' ? decodeItemText(content) : undefined };
      const prior = items.findIndex((candidate) => candidate.id === id); if (prior >= 0) items[prior] = item; else items.push(item);
    }
    for (const entry of tombstones) {
      if (!(entry instanceof Map) || entry.size !== 4) throw new Error('Invalid vault tombstone.');
      const id = text(entry, 1); const lastRevisionHash = bytes(entry, 2, 32); const authorId = text(entry, 3); const operationId = text(entry, 4);
      const command = known.get(operationId); if (!command || command.get(3) !== 'item-delete' || command.get(5) !== `device:${authorId}`) throw new Error('Unverified vault tombstone.');
      const payload = decodeCanonicalCbor(command.get(9) as Uint8Array);
      if (payload.size !== 2 || text(payload, 1) !== id || !same(bytes(payload, 2, 32), lastRevisionHash)) throw new Error('Unverified vault tombstone.');
      const index = items.findIndex((item) => item.id === id); if (index >= 0) items.splice(index, 1);
    }
  }
  return items;
}
