import { describe, expect, it } from 'vitest';

import {
  createBrowserVaultIdentity,
  encodeBrowserDeviceBundle,
  unwrapDeviceBundle,
  wrapDeviceBundle,
} from './browser-onboarding';

describe('browser vault onboarding', () => {
  it('encrypts a device-only bundle and restores its private keys', async () => {
    const identity = await createBrowserVaultIdentity('account-1', 'device-1');
    const unlockMaterial = new Uint8Array(32).fill(9);
    const wrapped = await wrapDeviceBundle(
      unlockMaterial,
      'account-1',
      'device-1',
      encodeBrowserDeviceBundle(identity),
    );

    const bundle = await unwrapDeviceBundle(
      unlockMaterial,
      'account-1',
      'device-1',
      wrapped.salt,
      wrapped.encrypted,
    );

    expect(bundle.deviceEncryptionSecretKey).toEqual(identity.deviceEncryption.secretKey);
    expect(bundle.deviceSigningSecretKey).toEqual(identity.deviceSigning.secretKey);
    expect(encodeBrowserDeviceBundle(identity)).not.toContain(identity.recoveryPhrase);
  });

  it('binds the encrypted bundle to its account and device', async () => {
    const identity = await createBrowserVaultIdentity('account-1', 'device-1');
    const wrapped = await wrapDeviceBundle(
      new Uint8Array(32).fill(9),
      'account-1',
      'device-1',
      encodeBrowserDeviceBundle(identity),
    );

    await expect(unwrapDeviceBundle(
      new Uint8Array(32).fill(9),
      'account-1',
      'device-2',
      wrapped.salt,
      wrapped.encrypted,
    )).rejects.toThrow();
  });
});
