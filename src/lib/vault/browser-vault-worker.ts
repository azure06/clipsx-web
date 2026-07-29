/// <reference lib="webworker" />

import { unwrapDeviceBundle, type BrowserDeviceBundle } from './browser-onboarding';
import { createDeviceSessionBindCommand } from './browser-session-binding';
import { createCollectionCommand } from './browser-collection-create';
import { openVaultBootstrap } from './browser-vault-bootstrap';
import { createNoteAppendCommand } from './browser-note-append';
import { createNoteDeleteCommand } from './browser-note-delete';
import { openVaultCollectionSync } from './browser-vault-sync';
import { ed25519 } from '@noble/curves/ed25519.js';
import { x25519 } from '@noble/curves/ed25519.js';
import type { VaultWorkerRequest, VaultWorkerResponse } from './browser-vault-worker-protocol';

let bundle: BrowserDeviceBundle | null = null;
const epochKeys = new Map<string, { key: Uint8Array; operationHead?: Uint8Array }>();
let recoveryKey: { id: string; encryptionPublicKey: Uint8Array } | null = null;

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
}

function respond(message: VaultWorkerResponse) {
  if (message.type === 'signed-session-bind' || message.type === 'collection-created' || message.type === 'note-created' || message.type === 'note-deleted') {
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
        if (!bundle) throw new Error('Vault is locked.');
        const result = await createCollectionCommand({
          accountId: request.accountId,
          deviceId: request.deviceId,
          deviceEncryptionPublicKey: x25519.getPublicKey(bundle.deviceEncryptionSecretKey),
          recoveryKeyId: recoveryKey?.id ?? (() => { throw new Error('Vault bootstrap is required before collection creation.'); })(),
          recoveryEncryptionPublicKey: recoveryKey?.encryptionPublicKey ?? (() => { throw new Error('Vault bootstrap is required before collection creation.'); })(),
          deviceSigningSecretKey: bundle.deviceSigningSecretKey,
          metadataTitle: request.metadataTitle,
          collectionId: request.collectionId,
          operationId: request.operationId,
        });
        epochKeys.set(result.collectionId, { key: result.epochKey });
        respond({ id: request.id, type: 'collection-created', collectionId: result.collectionId, command: result.command });
        return;
      }
      case 'open-bootstrap':
        if (!bundle) throw new Error('Vault is locked.');
        const opened = await openVaultBootstrap({
          bytes: request.bootstrap,
          accountId: request.accountId,
          deviceEncryptionSecretKey: bundle.deviceEncryptionSecretKey,
          deviceSigningSecretKey: bundle.deviceSigningSecretKey,
        });
        recoveryKey?.encryptionPublicKey.fill(0);
        recoveryKey = { id: opened.recoveryKeyId, encryptionPublicKey: opened.recoveryEncryptionPublicKey.slice() };
        for (const epochKey of epochKeys.values()) { wipe(epochKey.key); wipe(epochKey.operationHead); }
        epochKeys.clear();
        for (const entry of opened.epochKeys) epochKeys.set(entry.collectionId, { key: entry.epochKey, operationHead: entry.operationHead });
        respond({
          id: request.id,
          type: 'bootstrap-opened',
          collections: opened.collections,
        });
        return;
      case 'create-note': {
        if (!bundle) throw new Error('Vault is locked.');
        const epoch = epochKeys.get(request.collectionId);
        if (!epoch?.operationHead) throw new Error('A verified collection head is unavailable. Refresh the vault first.');
        const now = new Date().toISOString();
        const result = await createNoteAppendCommand({
          accountId: request.accountId, collectionId: request.collectionId, deviceId: request.deviceId,
          epochKey: epoch.key, deviceSigningSecretKey: bundle.deviceSigningSecretKey, expectedCollectionHead: epoch.operationHead,
          content: { ...request.content, createdAt: now, updatedAt: now },
        });
        respond({ id: request.id, type: 'note-created', noteId: result.noteId, command: result.command });
        return;
      }
      case 'update-note': {
        if (!bundle) throw new Error('Vault is locked.');
        const epoch = epochKeys.get(request.collectionId);
        if (!epoch?.operationHead) throw new Error('A verified collection head is unavailable. Refresh the vault first.');
        const now = new Date().toISOString();
        const result = await createNoteAppendCommand({ accountId: request.accountId, collectionId: request.collectionId, deviceId: request.deviceId, noteId: request.noteId, revisionNumber: request.revisionNumber, previousRevisionHash: request.previousRevisionHash, epochKey: epoch.key, deviceSigningSecretKey: bundle.deviceSigningSecretKey, expectedCollectionHead: epoch.operationHead, content: { ...request.content, createdAt: now, updatedAt: now } });
        respond({ id: request.id, type: 'note-created', noteId: result.noteId, command: result.command });
        return;
      }
      case 'delete-note': {
        if (!bundle) throw new Error('Vault is locked.');
        const epoch = epochKeys.get(request.collectionId);
        if (!epoch?.operationHead) throw new Error('A verified collection head is unavailable. Refresh the vault first.');
        respond({
          id: request.id, type: 'note-deleted', noteId: request.noteId,
          command: await createNoteDeleteCommand({
            accountId: request.accountId, collectionId: request.collectionId, deviceId: request.deviceId,
            deviceSigningSecretKey: bundle.deviceSigningSecretKey, expectedCollectionHead: epoch.operationHead,
            noteId: request.noteId, expectedRevisionHash: request.previousRevisionHash,
          }),
        });
        return;
      }
      case 'open-sync': {
        if (!bundle) throw new Error('Vault is locked.');
        const epoch = epochKeys.get(request.collectionId);
        if (!epoch) throw new Error('Collection epoch key is unavailable.');
        respond({ id: request.id, type: 'sync-opened', items: await openVaultCollectionSync({ bytes: request.sync, accountId: request.accountId, collectionId: request.collectionId, deviceId: request.deviceId, signingPublicKey: ed25519.getPublicKey(bundle.deviceSigningSecretKey), epochKey: epoch.key }) });
        return;
      }
    }
  } catch (error) {
    respond({ id: request.id, type: 'error', message: error instanceof Error ? error.message : 'Vault worker request failed.' });
  }
});
