import { describe, expect, it } from 'vitest';

import { createBrowserVaultIdentity } from './browser-onboarding';
import { createInitialDeviceRegistrationCommand } from './browser-registration';
import { decodeVaultCommand, importHpkePublicKey, sealHpke, utf8 } from './protocol';

describe('browser device registration', () => {
  it('builds a recovery-signed first-device command bound to its HPKE challenge', async () => {
    const accountId = '11111111-1111-4111-8111-111111111111';
    const identity = await createBrowserVaultIdentity(accountId, '22222222-2222-4222-8222-222222222222');
    const challengeId = '33333333-3333-4333-8333-333333333333';
    const encrypted = await sealHpke(
      await importHpkePublicKey(identity.deviceEncryption.publicKey),
      new Uint8Array(32).fill(4),
      utf8(`clipsx/vault/v1/device-registration-challenge\0${accountId}\0${challengeId}`),
    );
    const command = await createInitialDeviceRegistrationCommand({
      accountId, deviceId: '22222222-2222-4222-8222-222222222222', recoveryKeyId: '44444444-4444-4444-8444-444444444444',
      displayName: 'Chrome', platform: 'web', protectionProfile: 'vault-passphrase-wrapped', capabilities: utf8('v1'),
      challenge: { id: challengeId, encapsulatedKey: encrypted.enc, ciphertext: encrypted.ciphertext, expiresAt: '2099-07-28T00:00:00.000Z' }, identity,
      operationId: '55555555-5555-4555-8555-555555555555',
    });

    const parsed = decodeVaultCommand(command);
    expect(parsed.operationType).toBe('device-register');
    expect(parsed.recoveryKeyId).toBe('44444444-4444-4444-8444-444444444444');
  });
});
