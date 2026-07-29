/// <reference lib="webworker" />

import { unwrapDeviceBundle, type BrowserDeviceBundle } from './browser-onboarding';
import { createDeviceSessionBindCommand } from './browser-session-binding';
import { createCollectionCommand } from './browser-collection-create';
import { openVaultBootstrap } from './browser-vault-bootstrap';
import { x25519 } from '@noble/curves/ed25519.js';
import type { VaultWorkerRequest, VaultWorkerResponse } from './browser-vault-worker-protocol';

let bundle: BrowserDeviceBundle | null = null;
const epochKeys = new Map<string, Uint8Array>();
let recoveryKey: { id: string; encryptionPublicKey: Uint8Array } | null = null;

function wipe(bytes: Uint8Array | undefined) {
  bytes?.fill(0);
}

function lock() {
  if (!bundle) return;
  wipe(bundle.deviceEncryptionSecretKey);
  wipe(bundle.deviceSigningSecretKey);
  bundle = null;
  for (const epochKey of epochKeys.values()) wipe(epochKey);
  epochKeys.clear();
  recoveryKey?.encryptionPublicKey.fill(0);
  recoveryKey = null;
}

function respond(message: VaultWorkerResponse) {
  if (message.type === 'signed-session-bind' || message.type === 'collection-created') {
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
        epochKeys.set(result.collectionId, result.epochKey);
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
        respond({
          id: request.id,
          type: 'bootstrap-opened',
          collections: opened.collections,
        });
        return;
    }
  } catch (error) {
    respond({ id: request.id, type: 'error', message: error instanceof Error ? error.message : 'Vault worker request failed.' });
  }
});
