/// <reference lib="webworker" />

import { unwrapDeviceBundle, type BrowserDeviceBundle } from './browser-onboarding';
import { createDeviceSessionBindCommand } from './browser-session-binding';
import { createCollectionCommand } from './browser-collection-create';
import { openVaultBootstrap } from './browser-vault-bootstrap';
import { createNoteAppendCommand } from './browser-note-append';
import { createNoteDeleteCommand } from './browser-note-delete';
import { openVaultCollectionSync } from './browser-vault-sync';
import { createDeviceAuthorizationCommand } from './browser-device-approval';
import { verifyVaultAccountSync } from './browser-account-sync';
import { x25519 } from '@noble/curves/ed25519.js';
import type { VaultWorkerRequest, VaultWorkerResponse } from './browser-vault-worker-protocol';

let bundle: BrowserDeviceBundle | null = null;
const epochKeys = new Map<string, { key: Uint8Array; operationHead?: Uint8Array; epochNumber?: number }>();
let recoveryKey: { id: string; encryptionPublicKey: Uint8Array } | null = null;
let accountHead: Uint8Array | null = null;
let accountSequence = 0;
const deviceSigningKeys = new Map<string, Uint8Array>();

function wipe(bytes: Uint8Array | undefined) {
  bytes?.fill(0);
}

function lock() {
  if (!bundle) return;
  wipe(bundle.deviceEncryptionSecretKey);
  wipe(bundle.deviceSigningSecretKey);
  bundle = null;
  for (const epochKey of epochKeys.values()) { wipe(epochKey.key); wipe(epochKey.operationHead); }
  epochKeys.clear();
  recoveryKey?.encryptionPublicKey.fill(0);
  recoveryKey = null;
  wipe(accountHead ?? undefined); accountHead = null;
  accountSequence = 0;
  for (const key of deviceSigningKeys.values()) wipe(key);
  deviceSigningKeys.clear();
}

function respond(message: VaultWorkerResponse) {
  if (message.type === 'signed-session-bind' || message.type === 'collection-created' || message.type === 'note-created' || message.type === 'note-deleted' || message.type === 'device-authorized') {
    self.postMessage(message, [message.command.buffer]);
    return;
  }
  self.postMessage(message);
}

self.addEventListener('message', async (event: MessageEvent<VaultWorkerRequest>) => {
  const request = event.data;
  try {
    switch (request.type) {
      case 'unlock': {
        lock();
        try {
          bundle = await unwrapDeviceBundle(
            request.unlockMaterial,
            request.accountId,
            request.deviceId,
            request.bundleSalt,
            { nonce: request.bundleNonce, ciphertext: request.encryptedBundle },
          );
        } finally {
          wipe(request.unlockMaterial);
        }
        respond({ id: request.id, type: 'unlocked' });
        return;
      }
      case 'open-account-sync': {
        if (!bundle) throw new Error('Vault is locked.');
        const opened = await verifyVaultAccountSync({
          pages: request.pages,
          accountId: request.accountId,
          localDeviceId: request.deviceId,
          localDeviceSigningSecretKey: bundle.deviceSigningSecretKey,
          checkpointSequence: request.checkpointSequence,
          checkpointHash: request.checkpointHash,
        });
        wipe(accountHead ?? undefined);
        accountHead = opened.accountHead.slice();
        accountSequence = opened.sequence;
        for (const key of deviceSigningKeys.values()) wipe(key);
        deviceSigningKeys.clear();
        for (const [id, key] of opened.deviceSigningKeys) deviceSigningKeys.set(id, key.slice());
        respond({ id: request.id, type: 'account-sync-opened', sequence: accountSequence, accountHead: accountHead.slice() });
        return;
      }
      case 'lock':
        lock();
        respond({ id: request.id, type: 'locked' });
        return;
      case 'status':
        respond({ id: request.id, type: 'status', unlocked: bundle !== null });
        return;
      case 'sign-session-bind':
        if (!bundle) throw new Error('Vault is locked.');
        respond({
          id: request.id,
          type: 'signed-session-bind',
          command: await createDeviceSessionBindCommand({
            accountId: request.accountId,
            deviceId: request.deviceId,
            sessionId: request.sessionId,
            expectedAccountHead: request.expectedAccountHead,
            deviceSigningSecretKey: bundle.deviceSigningSecretKey,
            operationId: request.operationId,
          }),
        });
        return;
      case 'create-collection': {
        if (!bundle || !accountHead) throw new Error('Verified account head is required before collection creation.');
        const result = await createCollectionCommand({
          accountId: request.accountId,
          deviceId: request.deviceId,
          deviceEncryptionPublicKey: x25519.getPublicKey(bundle.deviceEncryptionSecretKey),
          recoveryKeyId: recoveryKey?.id ?? (() => { throw new Error('Vault bootstrap is required before collection creation.'); })(),
          recoveryEncryptionPublicKey: recoveryKey?.encryptionPublicKey ?? (() => { throw new Error('Vault bootstrap is required before collection creation.'); })(),
          deviceSigningSecretKey: bundle.deviceSigningSecretKey,
          expectedAccountHead: accountHead,
          metadataTitle: request.metadataTitle,
          collectionId: request.collectionId,
          operationId: request.operationId,
        });
        result.epochKey.fill(0);
        respond({ id: request.id, type: 'collection-created', collectionId: result.collectionId, command: result.command });
        return;
      }
      case 'open-bootstrap':
        if (!bundle || !accountHead) throw new Error('Verified account sync is required before bootstrap.');
        const opened = await openVaultBootstrap({
          bytes: request.bootstrap,
          accountId: request.accountId,
          deviceEncryptionSecretKey: bundle.deviceEncryptionSecretKey,
          deviceSigningSecretKey: bundle.deviceSigningSecretKey,
          expectedAccountHead: accountHead,
          deviceSigningKeys,
        });
        recoveryKey?.encryptionPublicKey.fill(0);
        recoveryKey = { id: opened.recoveryKeyId, encryptionPublicKey: opened.recoveryEncryptionPublicKey.slice() };
        wipe(accountHead ?? undefined); accountHead = opened.accountHead.slice();
        for (const epochKey of epochKeys.values()) { wipe(epochKey.key); wipe(epochKey.operationHead); }
        epochKeys.clear();
        for (const entry of opened.epochKeys) epochKeys.set(entry.collectionId, { key: entry.epochKey, operationHead: entry.operationHead, epochNumber: entry.epochNumber });
        respond({
          id: request.id,
          type: 'bootstrap-opened',
          collections: opened.collections,
        });
        return;
      case 'authorize-device': {
        if (!bundle || !accountHead) throw new Error('Verified vault bootstrap is required before device approval.');
        const authorized = await createDeviceAuthorizationCommand({
          accountId: request.accountId, authorDeviceId: request.deviceId, expectedAccountHead: accountHead,
          deviceSigningSecretKey: bundle.deviceSigningSecretKey, offer: request.offer, operationId: request.operationId,
          epochs: [...epochKeys].map(([collectionId, value]) => ({ collectionId, epochNumber: value.epochNumber ?? 1, key: value.key })),
        });
        respond({ id: request.id, type: 'device-authorized', ...authorized });
        return;
      }
      case 'create-note': {
        if (!bundle || !accountHead) throw new Error('Verified account head is required before note creation.');
        const epoch = epochKeys.get(request.collectionId);
        if (!epoch?.operationHead) throw new Error('A verified collection head is unavailable. Refresh the vault first.');
        const now = new Date().toISOString();
        const result = await createNoteAppendCommand({
          accountId: request.accountId, collectionId: request.collectionId, deviceId: request.deviceId,
          epochKey: epoch.key, deviceSigningSecretKey: bundle.deviceSigningSecretKey,
          expectedAccountHead: accountHead, expectedCollectionHead: epoch.operationHead,
          epochNumber: epoch.epochNumber,
          content: { ...request.content, createdAt: now, updatedAt: now },
        });
        respond({ id: request.id, type: 'note-created', noteId: result.noteId, command: result.command });
        return;
      }
      case 'update-note': {
        if (!bundle || !accountHead) throw new Error('Verified account head is required before note update.');
        const epoch = epochKeys.get(request.collectionId);
        if (!epoch?.operationHead) throw new Error('A verified collection head is unavailable. Refresh the vault first.');
        const now = new Date().toISOString();
        const result = await createNoteAppendCommand({ accountId: request.accountId, collectionId: request.collectionId, deviceId: request.deviceId, noteId: request.noteId, revisionNumber: request.revisionNumber, previousRevisionHash: request.previousRevisionHash, epochNumber: epoch.epochNumber, epochKey: epoch.key, deviceSigningSecretKey: bundle.deviceSigningSecretKey, expectedAccountHead: accountHead, expectedCollectionHead: epoch.operationHead, content: { ...request.content, createdAt: now, updatedAt: now } });
        respond({ id: request.id, type: 'note-created', noteId: result.noteId, command: result.command });
        return;
      }
      case 'delete-note': {
        if (!bundle || !accountHead) throw new Error('Verified account head is required before note deletion.');
        const epoch = epochKeys.get(request.collectionId);
        if (!epoch?.operationHead) throw new Error('A verified collection head is unavailable. Refresh the vault first.');
        respond({
          id: request.id, type: 'note-deleted', noteId: request.noteId,
          command: await createNoteDeleteCommand({
            accountId: request.accountId, collectionId: request.collectionId, deviceId: request.deviceId,
            deviceSigningSecretKey: bundle.deviceSigningSecretKey, expectedAccountHead: accountHead,
            expectedCollectionHead: epoch.operationHead,
            noteId: request.noteId, expectedRevisionHash: request.previousRevisionHash,
          }),
        });
        return;
      }
      case 'open-sync': {
        if (!bundle || !accountHead) throw new Error('Verified account sync is required before collection sync.');
        const epoch = epochKeys.get(request.collectionId);
        if (!epoch) throw new Error('Collection epoch key is unavailable.');
        respond({ id: request.id, type: 'sync-opened', items: await openVaultCollectionSync({ pages: request.pages, accountId: request.accountId, collectionId: request.collectionId, deviceSigningKeys, epochNumber: epoch.epochNumber ?? 1, epochKey: epoch.key }) });
        return;
      }
    }
  } catch (error) {
    respond({ id: request.id, type: 'error', message: error instanceof Error ? error.message : 'Vault worker request failed.' });
  }
});
