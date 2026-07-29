/// <reference lib="webworker" />

import { unwrapDeviceBundle, type BrowserDeviceBundle } from './browser-onboarding';
import { createDeviceSessionBindCommand } from './browser-session-binding';
import type { VaultWorkerRequest, VaultWorkerResponse } from './browser-vault-worker-protocol';

let bundle: BrowserDeviceBundle | null = null;

function wipe(bytes: Uint8Array | undefined) {
  bytes?.fill(0);
}

function lock() {
  if (!bundle) return;
  wipe(bundle.deviceEncryptionSecretKey);
  wipe(bundle.deviceSigningSecretKey);
  bundle = null;
}

function respond(message: VaultWorkerResponse) {
  if (message.type === 'signed-session-bind') {
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
    }
  } catch (error) {
    respond({ id: request.id, type: 'error', message: error instanceof Error ? error.message : 'Vault worker request failed.' });
  }
});
