import { describe, expect, it, vi } from 'vitest';

import { createBrowserVaultIdentity, encodeBrowserDeviceBundle, wrapDeviceBundle } from './browser-onboarding';
import type { VaultWorkerRequest, VaultWorkerResponse } from './browser-vault-worker-protocol';
import { encodeCanonicalCbor, sha256, signProtocolRecord, type CborValue } from './protocol';

async function initialAccountFixture() {
  const accountId = 'account-1'; const deviceId = 'device-1'; const recoveryKeyId = 'recovery-1';
  const identity = await createBrowserVaultIdentity(accountId, deviceId);
  const proofFields = new Map<number, CborValue>([
    [1, deviceId], [2, recoveryKeyId], [3, 'Browser'], [4, 'test'], [5, 'https://vault.test'],
    [6, 'vault-passphrase-wrapped'], [7, new Uint8Array(32)], [8, identity.deviceEncryption.publicKey],
    [9, identity.deviceSigning.publicKey], [10, identity.recoveryEncryption.publicKey], [11, identity.recoverySigning.publicKey],
    [12, 1], [13, 'challenge-1'], [14, new Uint8Array(32)],
  ]);
  const proofPayload = encodeCanonicalCbor(proofFields);
  proofFields.set(15, await signProtocolRecord('clipsx/vault/v1/device-register-proof', proofPayload, identity.deviceSigning.secretKey));
  const command = new Map<number, CborValue>([[1, 1], [2, 'operation-1'], [3, 'device-register'], [4, accountId], [5, `recovery:${recoveryKeyId}`], [9, encodeCanonicalCbor(proofFields)]]);
  const signedBytes = encodeCanonicalCbor(command);
  const signature = await signProtocolRecord('clipsx/vault/v1/command/device-register', signedBytes, identity.recoverySigning.secretKey);
  command.set(10, signature);
  const accountHead = await sha256(encodeCanonicalCbor(command));
  const accountPage = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1], [2, accountId], [3, [new Map<number, CborValue>([[1, 'operation-1'], [2, 1], [3, 'device-register'], [4, signedBytes], [5, null], [6, accountHead], [7, null], [8, recoveryKeyId], [9, signature]])]],
    [4, [new Map<number, CborValue>([[1, deviceId], [2, 'active'], [3, identity.deviceEncryption.publicKey], [4, identity.deviceSigning.publicKey], [5, null]])]],
    [5, [new Map<number, CborValue>([[1, recoveryKeyId], [2, 'active'], [3, 1], [4, identity.recoveryEncryption.publicKey], [5, identity.recoverySigning.publicKey], [6, signedBytes], [7, signature]])]],
    [6, []], [7, 1], [8, accountHead], [9, false],
  ]));
  const bootstrap = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1], [2, deviceId], [3, identity.deviceSigning.publicKey], [4, identity.deviceEncryption.publicKey],
    [5, recoveryKeyId], [6, identity.recoveryEncryption.publicKey], [7, []], [8, accountHead],
  ]));
  return { accountId, deviceId, identity, accountPage, bootstrap };
}

describe('vault worker lifecycle', () => {
  it('opens account sync before bootstrap when unlock starts without an account head', async () => {
    const fixture = await initialAccountFixture();
    let listener: ((event: MessageEvent<VaultWorkerRequest>) => Promise<void>) | undefined;
    const responses: VaultWorkerResponse[] = [];
    vi.stubGlobal('self', {
      addEventListener: (_type: string, callback: typeof listener) => { listener = callback; },
      postMessage: (response: VaultWorkerResponse) => { responses.push(response); },
    });
    await import('./browser-vault-worker');
    expect(listener).toBeDefined();

    const unlockMaterial = new Uint8Array(32).fill(5);
    const wrapped = await wrapDeviceBundle(unlockMaterial, fixture.accountId, fixture.deviceId, encodeBrowserDeviceBundle(fixture.identity));
    await listener!({ data: { id: 'unlock', type: 'unlock', accountId: fixture.accountId, deviceId: fixture.deviceId, unlockMaterial, bundleSalt: wrapped.salt, bundleNonce: wrapped.encrypted.nonce, encryptedBundle: wrapped.encrypted.ciphertext } } as MessageEvent<VaultWorkerRequest>);
    await listener!({ data: { id: 'sync', type: 'open-account-sync', accountId: fixture.accountId, deviceId: fixture.deviceId, pages: [fixture.accountPage] } } as MessageEvent<VaultWorkerRequest>);
    await listener!({ data: { id: 'bootstrap', type: 'open-bootstrap', accountId: fixture.accountId, bootstrap: fixture.bootstrap } } as MessageEvent<VaultWorkerRequest>);

    expect(responses.map((response) => response.type)).toEqual(['unlocked', 'account-sync-opened', 'bootstrap-opened']);
    const opened = responses.at(-1);
    expect(opened).toMatchObject({ id: 'bootstrap', type: 'bootstrap-opened', collections: [] });
  });
});
