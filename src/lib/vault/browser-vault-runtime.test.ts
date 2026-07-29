import { describe, expect, it } from 'vitest';

import { BrowserVaultRuntime } from './browser-vault-runtime';
import type { VaultWorkerRequest, VaultWorkerResponse } from './browser-vault-worker-protocol';

class FakeWorker {
  onmessage: ((event: MessageEvent<VaultWorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly requests: VaultWorkerRequest[] = [];
  terminated = false;

  postMessage(request: VaultWorkerRequest) {
    this.requests.push(request);
    const response: VaultWorkerResponse = request.type === 'unlock'
      ? { id: request.id, type: 'unlocked' }
      : request.type === 'lock'
        ? { id: request.id, type: 'locked' }
        : request.type === 'status'
          ? { id: request.id, type: 'status', unlocked: true }
          : { id: request.id, type: 'signed-session-bind', command: new Uint8Array([1, 2, 3]) };
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
});
