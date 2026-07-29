import { describe, expect, it } from 'vitest';

import { createPendingDeviceRegistrationCommand } from './browser-device-approval';
import { deriveRecoveryIdentity } from './browser-onboarding';
import { createRecoveryDeviceAuthorizationCommand } from './browser-recovery-enrollment';
import { decodeCanonicalCbor, decodeVaultCommand, importHpkePublicKey, sealHpke, utf8 } from './protocol';
import { createBrowserDeviceIdentity } from './browser-onboarding';

describe('recovery device enrollment', () => {
  it('derives stable local recovery keys and signs recovery authorization', async () => {
    const accountId = '11111111-1111-4111-8111-111111111111';
    const phrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
    const recovery = await deriveRecoveryIdentity(accountId, phrase);
    expect((await deriveRecoveryIdentity(accountId, phrase)).recoverySigning.publicKey).toEqual(recovery.recoverySigning.publicKey);
    const target = createBrowserDeviceIdentity(); const challengeId = '33333333-3333-4333-8333-333333333333';
    const sealed = await sealHpke(await importHpkePublicKey(target.deviceEncryption.publicKey), new Uint8Array(32).fill(4), utf8(`clipsx/vault/v1/device-registration-challenge\0${accountId}\0${challengeId}`));
    const pending = await createPendingDeviceRegistrationCommand({
      accountId, deviceId: '22222222-2222-4222-8222-222222222222', displayName: 'Recovered browser', platform: 'web', enrollmentOrigin: 'http://localhost:3000', protectionProfile: 'vault-passphrase-wrapped', capabilities: utf8('v1'),
      challenge: { id: challengeId, encapsulatedKey: sealed.enc, ciphertext: sealed.ciphertext, expiresAt: '2099-01-01T00:00:00.000Z' },
      deviceEncryptionPublicKey: target.deviceEncryption.publicKey, deviceEncryptionSecretKey: target.deviceEncryption.secretKey, deviceSigningPublicKey: target.deviceSigning.publicKey, deviceSigningSecretKey: target.deviceSigning.secretKey, sasSecret: new Uint8Array(32).fill(7),
    });
    const authorized = await createRecoveryDeviceAuthorizationCommand({ accountId, recoveryKeyId: '44444444-4444-4444-8444-444444444444', recoverySigningSecretKey: recovery.recoverySigning.secretKey, expectedAccountHead: new Uint8Array(32).fill(8), offer: pending.offer, epochs: [] });
    expect(decodeVaultCommand(authorized.command).recoveryKeyId).toBe('44444444-4444-4444-8444-444444444444');
    expect(decodeCanonicalCbor(decodeVaultCommand(pending.command).payload).get(4)).toBe('http://localhost:3000');
  });
});
