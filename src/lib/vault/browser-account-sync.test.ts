import { describe, expect, it } from 'vitest';

import { createBrowserVaultIdentity } from './browser-onboarding';
import { verifyVaultAccountSync } from './browser-account-sync';
import { decodeCanonicalCbor, encodeCanonicalCbor, sha256, signProtocolRecord, type CborValue } from './protocol';

async function fixture() {
  const accountId = 'account-1'; const deviceId = 'device-1'; const recoveryKeyId = 'recovery-1';
  const identity = await createBrowserVaultIdentity(accountId, deviceId);
  // Registration challenge opening is tested separately. Build the signed
  // ledger record directly so this test is only about trust-chain verification.
  const payload = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, deviceId], [2, recoveryKeyId], [3, 'Browser'], [4, 'test'], [5, 'https://vault.test'],
    [6, 'vault-passphrase-wrapped'], [7, new Uint8Array(32)], [8, identity.deviceEncryption.publicKey],
    [9, identity.deviceSigning.publicKey], [10, identity.recoveryEncryption.publicKey], [11, identity.recoverySigning.publicKey],
    [12, 1], [13, 'challenge-1'], [14, new Uint8Array(32)],
  ]));
  const proof = await signProtocolRecord('clipsx/vault/v1/device-register-proof', payload, identity.deviceSigning.secretKey);
  const registration = decodeCanonicalCbor(payload); registration.set(15, proof);
  const unsigned = new Map<number, CborValue>([[1, 1], [2, 'operation-1'], [3, 'device-register'], [4, accountId], [5, `recovery:${recoveryKeyId}`], [9, encodeCanonicalCbor(registration)]]);
  const signedBytes = encodeCanonicalCbor(unsigned);
  const signature = await signProtocolRecord('clipsx/vault/v1/command/device-register', signedBytes, identity.recoverySigning.secretKey);
  unsigned.set(10, signature);
  const operationHash = await sha256(encodeCanonicalCbor(unsigned));
  const page = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1], [2, accountId], [3, [new Map<number, CborValue>([[1, 'operation-1'], [2, 1], [3, 'device-register'], [4, signedBytes], [5, null], [6, operationHash], [7, null], [8, recoveryKeyId], [9, signature]])]],
    [4, [new Map<number, CborValue>([[1, deviceId], [2, 'active'], [3, identity.deviceEncryption.publicKey], [4, identity.deviceSigning.publicKey], [5, null]])]],
    [5, [new Map<number, CborValue>([[1, recoveryKeyId], [2, 'active'], [3, 1], [4, identity.recoveryEncryption.publicKey], [5, identity.recoverySigning.publicKey], [6, signedBytes], [7, signature]])]],
    [6, []], [7, 1], [8, operationHash], [9, false],
  ]));
  return { accountId, deviceId, identity, operationHash, page };
}

describe('verified vault account sync', () => {
  it('anchors the initial recovery root to the local device key', async () => {
    const value = await fixture();
    await expect(verifyVaultAccountSync({ pages: [value.page], accountId: value.accountId, localDeviceId: value.deviceId, localDeviceSigningSecretKey: value.identity.deviceSigning.secretKey }))
      .resolves.toMatchObject({ sequence: 1, accountHead: value.operationHash });
  });

  it('rejects a checkpoint that is newer than the returned ledger', async () => {
    const value = await fixture();
    await expect(verifyVaultAccountSync({ pages: [value.page], accountId: value.accountId, localDeviceId: value.deviceId, localDeviceSigningSecretKey: value.identity.deviceSigning.secretKey, checkpointSequence: 2, checkpointHash: new Uint8Array(32) }))
      .rejects.toThrow('rollback');
  });
});
