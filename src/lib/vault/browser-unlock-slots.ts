import { decryptAesGcm, deriveVaultKey, encryptAesGcm, randomBytes, utf8, type AesGcmCiphertext } from './protocol';

export type BrowserUnlockSlot = {
  id: string;
  kind: 'passkey' | 'passphrase';
  salt: Uint8Array;
  wrappedBundleKey: AesGcmCiphertext;
  createdAt: string;
  passphraseKdfSalt?: Uint8Array;
  webauthnCredentialId?: Uint8Array;
  webauthnRpId?: string;
  prfInput?: Uint8Array;
};

const bundleAad = (accountId: string, deviceId: string) => utf8(`clipsx/vault/v1/device-bundle-v2\0${accountId}\0${deviceId}`);
const slotAad = (accountId: string, deviceId: string, slotId: string) => utf8(`clipsx/vault/v1/unlock-slot-v1\0${accountId}\0${deviceId}\0${slotId}`);

export async function encryptBundle(bundle: Uint8Array, accountId: string, deviceId: string): Promise<{ bundleKey: Uint8Array; encryptedBundle: AesGcmCiphertext }> {
  const bundleKey = randomBytes(32);
  return { bundleKey, encryptedBundle: await encryptAesGcm(bundleKey, bundle, bundleAad(accountId, deviceId)) };
}

export async function createUnlockSlot(input: { kind: BrowserUnlockSlot['kind']; unlockMaterial: Uint8Array; bundleKey: Uint8Array; accountId: string; deviceId: string; id?: string }): Promise<BrowserUnlockSlot> {
  const id = input.id ?? crypto.randomUUID(); const salt = randomBytes(16);
  const wrappingKey = await deriveVaultKey(input.unlockMaterial, salt, 'browserUnlockSlot', slotAad(input.accountId, input.deviceId, id));
  return { id, kind: input.kind, salt, wrappedBundleKey: await encryptAesGcm(wrappingKey, input.bundleKey, slotAad(input.accountId, input.deviceId, id)), createdAt: new Date().toISOString() };
}

export async function unwrapBundleKey(input: { slot: BrowserUnlockSlot; unlockMaterial: Uint8Array; accountId: string; deviceId: string }): Promise<Uint8Array> {
  const wrappingKey = await deriveVaultKey(input.unlockMaterial, input.slot.salt, 'browserUnlockSlot', slotAad(input.accountId, input.deviceId, input.slot.id));
  return decryptAesGcm(wrappingKey, input.slot.wrappedBundleKey, slotAad(input.accountId, input.deviceId, input.slot.id));
}

export async function decryptBundle(bundleKey: Uint8Array, encryptedBundle: AesGcmCiphertext, accountId: string, deviceId: string): Promise<Uint8Array> {
  return decryptAesGcm(bundleKey, encryptedBundle, bundleAad(accountId, deviceId));
}

export function removeUnlockSlot(slots: BrowserUnlockSlot[], id: string): BrowserUnlockSlot[] {
  if (slots.length <= 1) throw new Error('At least one vault unlock slot is required.');
  const next = slots.filter((slot) => slot.id !== id); if (next.length === slots.length) throw new Error('Unlock slot was not found.');
  return next;
}
