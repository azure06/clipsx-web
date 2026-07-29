import { decryptRevisionContent } from './encrypted-revision';
import { decodeCanonicalCbor, encodeCanonicalCbor, sha256, verifyProtocolRecord, type CborValue } from './protocol';

export type SyncedVaultItem = { id: string; revisionNumber: number; revisionHash: Uint8Array; type: 'note' | 'login'; title: string; body?: string; username?: string; password?: string; url?: string; labels: string[] };
const bytes = (record: Map<number, CborValue>, label: number, size?: number) => { const value = record.get(label); if (!(value instanceof Uint8Array) || (size && value.byteLength !== size)) throw new Error('Invalid vault sync record.'); return value; };
const text = (record: Map<number, CborValue>, label: number) => { const value = record.get(label); if (typeof value !== 'string' || !value) throw new Error('Invalid vault sync record.'); return value; };
const same = (a: Uint8Array, b: Uint8Array) => a.byteLength === b.byteLength && a.every((v, i) => v === b[i]);

export async function openVaultCollectionSync(input: { bytes: Uint8Array; accountId: string; collectionId: string; deviceId: string; signingPublicKey: Uint8Array; epochKey: Uint8Array }): Promise<SyncedVaultItem[]> {
  const root = decodeCanonicalCbor(input.bytes); const operations = root.get(3); const revisions = root.get(4); const tombstones = root.get(6);
  if (root.size !== 6 || root.get(1) !== 1 || root.get(2) !== input.collectionId || !Array.isArray(operations) || !Array.isArray(revisions) || !Array.isArray(tombstones)) throw new Error('Invalid vault sync.');
  const known = new Map<string, Map<number, CborValue>>(); let previous: Uint8Array | null = null;
  for (const entry of operations) {
    if (!(entry instanceof Map) || entry.size !== 8) throw new Error('Invalid vault operation.');
    const operationId = text(entry, 1); const payload = bytes(entry, 4); const hash = bytes(entry, 6, 32); const signature = bytes(entry, 8, 64);
    if (text(entry, 7) !== input.deviceId || !same(previous ?? new Uint8Array(), (entry.get(5) as Uint8Array | null) ?? new Uint8Array())) throw new Error('Unverified vault operation chain.');
    const command = decodeCanonicalCbor(payload); const type = command.get(3);
    if (command.get(1) !== 1 || command.get(2) !== operationId || command.get(5) !== `device:${input.deviceId}` || command.get(6) !== input.collectionId || typeof type !== 'string') throw new Error('Invalid vault operation.');
    command.set(10, signature);
    if (!same(await sha256(encodeCanonicalCbor(command)), hash) || !await verifyProtocolRecord(`clipsx/vault/v1/command/${type}`, payload, signature, input.signingPublicKey)) throw new Error('Unverified vault operation.');
    known.set(operationId, command); previous = hash;
  }
  const items: SyncedVaultItem[] = [];
  for (const entry of revisions) {
    if (!(entry instanceof Map) || entry.size !== 14 || entry.get(3) !== 1 || text(entry, 11) !== input.deviceId || !known.has(text(entry, 13))) throw new Error('Invalid vault revision.');
    const revisionNumber = entry.get(2); if (typeof revisionNumber !== 'number' || revisionNumber < 1) throw new Error('Invalid vault revision.');
    const id = text(entry, 1); const ciphertext = bytes(entry, 4); const contentNonce = bytes(entry, 5, 12); const wrapped = bytes(entry, 6); const wrapNonce = bytes(entry, 7, 12); const ciphertextHash = bytes(entry, 8, 32); const wrappedHash = bytes(entry, 9, 32); const revisionHash = bytes(entry, 10, 32); const signature = bytes(entry, 12, 64); const operationId = text(entry, 13); const previous = entry.get(14);
    if ((revisionNumber === 1) !== (previous === null) || (previous !== null && !(previous instanceof Uint8Array))) throw new Error('Invalid vault revision.');
    if (!same(await sha256(ciphertext), ciphertextHash) || !same(await sha256(wrapped), wrappedHash)) throw new Error('Vault revision hash mismatch.');
    const signed = encodeCanonicalCbor(new Map<number, CborValue>([[1, 1], [2, operationId], [3, input.collectionId], [4, id], [5, 1], [6, revisionNumber], [7, previous as Uint8Array | null], [8, ciphertextHash], [9, wrappedHash], [10, input.deviceId]]));
    if (!same(await sha256(signed), revisionHash) || !await verifyProtocolRecord('clipsx/vault/v1/note-revision', signed, signature, input.signingPublicKey)) throw new Error('Unverified vault revision.');
    const decoded = decodeCanonicalCbor(await decryptRevisionContent({ accountId: input.accountId, collectionId: input.collectionId, noteId: id, epoch: 1, revision: revisionNumber, epochKey: input.epochKey, encryptedContent: { ciphertext, nonce: contentNonce }, wrappedRevisionKey: { ciphertext: wrapped, nonce: wrapNonce } }));
    const type = decoded.get(2); const title = decoded.get(3); if (decoded.size !== 10 || (type !== 'note' && type !== 'login') || typeof title !== 'string' || !Array.isArray(decoded.get(8))) throw new Error('Invalid decrypted vault item.');
    const itemType: 'note' | 'login' = type;
    const item: SyncedVaultItem = { id, revisionNumber, revisionHash, type: itemType, title, ...(itemType === 'note' ? { body: decoded.get(4) as string } : { username: decoded.get(5) as string, password: decoded.get(6) as string, url: decoded.get(7) as string }), labels: decoded.get(8) as string[] };
    const prior = items.findIndex((candidate) => candidate.id === id); if (prior >= 0) items[prior] = item; else items.push(item);
  }
  for (const entry of tombstones) {
    if (!(entry instanceof Map) || entry.size !== 4) throw new Error('Invalid vault tombstone.');
    const id = text(entry, 1); const lastRevisionHash = bytes(entry, 2, 32); const deviceId = text(entry, 3); const operationId = text(entry, 4);
    const command = known.get(operationId); if (!command || command.get(3) !== 'note-delete' || command.get(5) !== `device:${input.deviceId}` || deviceId !== input.deviceId) throw new Error('Unverified vault tombstone.');
    const payload = decodeCanonicalCbor(command.get(9) as Uint8Array);
    if (payload.size !== 2 || text(payload, 1) !== id || !same(bytes(payload, 2, 32), lastRevisionHash)) throw new Error('Unverified vault tombstone.');
    const index = items.findIndex((item) => item.id === id);
    if (index >= 0) items.splice(index, 1);
  }
  return items;
}
