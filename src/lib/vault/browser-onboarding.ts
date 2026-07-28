import { ed25519, x25519 } from '@noble/curves/ed25519.js';

import { createRecoveryPhrase, deriveVaultKey, encryptAesGcm, randomBytes, recoveryPhraseToEntropy, utf8, type AesGcmCiphertext } from './protocol';

export type VaultKeyPair = { publicKey: Uint8Array; secretKey: Uint8Array };
export type BrowserVaultIdentity = {
  recoveryPhrase: string;
  recoveryEncryption: VaultKeyPair;
  recoverySigning: VaultKeyPair;
  deviceEncryption: VaultKeyPair;
  deviceSigning: VaultKeyPair;
};

export async function createBrowserVaultIdentity(accountId: string, deviceId: string): Promise<BrowserVaultIdentity> {
  const recovery = createRecoveryPhrase();
  const entropy = recoveryPhraseToEntropy(recovery.phrase);
  const recoveryEncryption = x25519.keygen(await deriveVaultKey(entropy, utf8(accountId), 'recoveryEncryptionKey', utf8(`${accountId}\0recovery:1`)));
  const recoverySigning = ed25519.keygen(await deriveVaultKey(entropy, utf8(accountId), 'recoverySigningKey', utf8(`${accountId}\0recovery:1`)));
  const deviceEncryption = x25519.keygen(randomBytes(32));
  const deviceSigning = ed25519.keygen(randomBytes(32));
  void deviceId;
  return { recoveryPhrase: recovery.phrase, recoveryEncryption, recoverySigning, deviceEncryption, deviceSigning };
}

export async function wrapDeviceBundle(
  unlockMaterial: Uint8Array,
  accountId: string,
  deviceId: string,
  bundle: Uint8Array,
): Promise<{ salt: Uint8Array; encrypted: AesGcmCiphertext }> {
  const salt = randomBytes(16);
  const key = await deriveVaultKey(unlockMaterial, salt, 'browserUnlock', new TextEncoder().encode(`${accountId}\0${deviceId}\0bundle:1`));
  return { salt, encrypted: await encryptAesGcm(key, bundle, new TextEncoder().encode(`clipsx/vault/v1/device-bundle\0${accountId}\0${deviceId}`)) };
}
