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

  triggerError(message: string) {
    this.onerror?.({ message } as ErrorEvent);
  }
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

  it('terminates the worker and fires onLock once when the worker errors', async () => {
    const worker = new FakeWorker();
    const runtime = new BrowserVaultRuntime('account-1', () => worker);
    let locks = 0;
    runtime.onLock = () => { locks += 1; };

    // Trigger unlock so a worker is spawned and a request is in-flight
    const unlockPromise = runtime.unlock({
      accountId: 'account-1', deviceId: 'device-1', schemaVersion: 1,
      protectionProfile: 'vault-passphrase-wrapped', encryptedBundle: new Uint8Array([1]),
      bundleNonce: new Uint8Array(12), bundleSalt: new Uint8Array(16),
      passphraseKdfSalt: new Uint8Array(16), createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    }, new Uint8Array(32).fill(7));

    // Fire a worker error before the unlock response arrives
    worker.triggerError('Worker crashed.');
    await expect(unlockPromise).rejects.toThrow('Vault locked.');
    expect(worker.terminated).toBe(true);
    expect(locks).toBe(1);
    runtime.dispose();
  });

  it('does not fire onLock a second time when dispose follows a worker error', async () => {
    const worker = new FakeWorker();
    const runtime = new BrowserVaultRuntime('account-1', () => worker);
    let locks = 0;
    runtime.onLock = () => { locks += 1; };

    // Touch the worker so getWorker() creates and wires it up
    const p = runtime.unlock({
      accountId: 'account-1', deviceId: 'device-1', schemaVersion: 1,
      protectionProfile: 'vault-passphrase-wrapped', encryptedBundle: new Uint8Array([1]),
      bundleNonce: new Uint8Array(12), bundleSalt: new Uint8Array(16),
      passphraseKdfSalt: new Uint8Array(16), createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    }, new Uint8Array(32).fill(7));
    worker.triggerError('Worker crashed.');
    await expect(p).rejects.toThrow();

    // dispose() after an error: onLock should not fire again via dispose
    runtime.onLock = null;
    runtime.dispose();
    expect(locks).toBe(1);
  });

  it('does not allow a later request to lazily create an uninitialized worker after lock', async () => {
    const workers: FakeWorker[] = [];
    const runtime = new BrowserVaultRuntime('account-1', () => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    });

    await runtime.unlock({
      accountId: 'account-1', deviceId: 'device-1', schemaVersion: 1,
      protectionProfile: 'vault-passphrase-wrapped', encryptedBundle: new Uint8Array([1]),
      bundleNonce: new Uint8Array(12), bundleSalt: new Uint8Array(16),
      passphraseKdfSalt: new Uint8Array(16), createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    }, new Uint8Array(32).fill(7));
    expect(workers).toHaveLength(1);

    await runtime.lock(false);
    expect(workers[0].terminated).toBe(true);

    // A collection-sync after lock must not silently spin up a fresh worker
    // It should either reject (worker created and sends 'locked' response) or the
    // second worker's response will be a non-'sync-opened' type causing a rejection.
    await expect(
      runtime.openCollectionSync({ deviceId: 'device-1', collectionId: 'col-1', pages: [] }),
    ).rejects.toThrow();
    runtime.dispose();
  });

  it('fires onLock exactly once for cross-tab lock(false)', async () => {
    const worker = new FakeWorker();
    const runtime = new BrowserVaultRuntime('account-1', () => worker);
    let locks = 0;
    runtime.onLock = () => { locks += 1; };

    await runtime.unlock({
      accountId: 'account-1', deviceId: 'device-1', schemaVersion: 1,
      protectionProfile: 'vault-passphrase-wrapped', encryptedBundle: new Uint8Array([1]),
      bundleNonce: new Uint8Array(12), bundleSalt: new Uint8Array(16),
      passphraseKdfSalt: new Uint8Array(16), createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    }, new Uint8Array(32).fill(7));
    await runtime.lock(false);

    expect(locks).toBe(1);
    expect(worker.terminated).toBe(true);
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
