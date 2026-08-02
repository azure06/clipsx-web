import { describe, expect, it } from 'vitest';

import { BrowserVaultRuntime } from './browser-vault-runtime';
import { createUnlockSlot, encryptBundle } from './browser-unlock-slots';
import type { VaultWorkerRequest, VaultWorkerResponse } from './browser-vault-worker-protocol';

class FakeWorker {
  onmessage: ((event: MessageEvent<VaultWorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly requests: VaultWorkerRequest[] = [];
  terminated = false;

  postMessage(request: VaultWorkerRequest, transfer?: Transferable[]) {
    const transferred = structuredClone(request, { transfer });
    this.requests.push(transferred);
    const response: VaultWorkerResponse = transferred.type === 'unlock'
      ? { id: transferred.id, type: 'unlocked' }
      : transferred.type === 'lock'
        ? { id: transferred.id, type: 'locked' }
        : transferred.type === 'status'
          ? { id: transferred.id, type: 'status', unlocked: true }
          : { id: transferred.id, type: 'locked' };
    queueMicrotask(() => this.onmessage?.({ data: response } as MessageEvent<VaultWorkerResponse>));
  }

  terminate() { this.terminated = true; }
}

describe('BrowserVaultRuntime', () => {
  it('transfers unlock material to a worker and terminates it after lock', async () => {
    const worker = new FakeWorker();
    const runtime = new BrowserVaultRuntime('account-1', () => worker);
    const material = new Uint8Array(32).fill(7);

    await runtime.unlock({
      accountId: 'account-1', deviceId: 'device-1', schemaVersion: 1,
      protectionProfile: 'vault-passphrase-wrapped', encryptedBundle: new Uint8Array([1]),
      bundleNonce: new Uint8Array(12), bundleSalt: new Uint8Array(16),
      passphraseKdfSalt: new Uint8Array(16), createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    }, material);

    expect(worker.requests[0]).toMatchObject({ type: 'unlock', accountId: 'account-1', deviceId: 'device-1' });
    expect(material).toEqual(new Uint8Array(32));

    await runtime.lock(false);
    expect(worker.requests[1]).toMatchObject({ type: 'lock' });
    expect(worker.terminated).toBe(true);
    runtime.dispose();
  });

  it('notifies the UI when a lock clears the worker session', async () => {
    const worker = new FakeWorker();
    const runtime = new BrowserVaultRuntime('account-1', () => worker);
    let locks = 0;
    runtime.onLock = () => { locks += 1; };

    await runtime.lock(false);

    expect(locks).toBe(1);
    runtime.dispose();
  });

  it('keeps a local bundle-key copy to wipe after transferring the worker copy', async () => {
    const worker = new FakeWorker();
    const runtime = new BrowserVaultRuntime('account-1', () => worker);
    const material = new Uint8Array(32).fill(7);
    const encrypted = await encryptBundle(new Uint8Array([1, 2, 3]), 'account-1', 'device-1');
    const slot = await createUnlockSlot({ kind: 'passphrase', unlockMaterial: material, bundleKey: encrypted.bundleKey, accountId: 'account-1', deviceId: 'device-1' });
    encrypted.bundleKey.fill(0);

    await expect(runtime.unlock({
      accountId: 'account-1', deviceId: 'device-1', schemaVersion: 2,
      protectionProfile: 'vault-passphrase-wrapped', encryptedBundle: encrypted.encryptedBundle.ciphertext,
      bundleNonce: encrypted.encryptedBundle.nonce, bundleSalt: slot.salt, unlockSlots: [slot],
      passphraseKdfSalt: new Uint8Array(16), createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    }, material)).resolves.toBeUndefined();

    expect(material).toEqual(new Uint8Array(32));
    expect(worker.requests[0]).toMatchObject({ type: 'unlock', bundleKey: expect.any(Uint8Array) });
    runtime.dispose();
  });
});
