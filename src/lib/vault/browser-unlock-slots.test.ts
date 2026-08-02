import { describe, expect, it } from 'vitest';
import { createUnlockSlot, decryptBundle, encryptBundle, removeUnlockSlot, unwrapBundleKey } from './browser-unlock-slots';

describe('browser unlock slots', () => {
  it('lets alternative slots unwrap one random bundle key', async () => {
    const bundle = new Uint8Array([1, 2, 3]); const accountId = 'account'; const deviceId = 'device';
    const encrypted = await encryptBundle(bundle, accountId, deviceId); const first = await createUnlockSlot({ kind: 'passkey', unlockMaterial: new Uint8Array(32).fill(1), bundleKey: encrypted.bundleKey, accountId, deviceId }); const second = await createUnlockSlot({ kind: 'passphrase', unlockMaterial: new Uint8Array(32).fill(2), bundleKey: encrypted.bundleKey, accountId, deviceId });
    await expect(decryptBundle(await unwrapBundleKey({ slot: first, unlockMaterial: new Uint8Array(32).fill(1), accountId, deviceId }), encrypted.encryptedBundle, accountId, deviceId)).resolves.toEqual(bundle);
    await expect(decryptBundle(await unwrapBundleKey({ slot: second, unlockMaterial: new Uint8Array(32).fill(2), accountId, deviceId }), encrypted.encryptedBundle, accountId, deviceId)).resolves.toEqual(bundle);
    expect(() => removeUnlockSlot([first], first.id)).toThrow('At least one');
  });
});
