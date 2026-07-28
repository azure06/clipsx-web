import { ed25519, x25519 } from '@noble/curves/ed25519.js';

import {
  createRecoveryPhrase,
  decodeCanonicalCbor,
  decryptAesGcm,
  deriveVaultKey,
  encodeCanonicalCbor,
  encryptAesGcm,
  randomBytes,
  recoveryPhraseToEntropy,
  utf8,
  type AesGcmCiphertext,
} from './protocol';

export type VaultKeyPair = { publicKey: Uint8Array; secretKey: Uint8Array };
export type BrowserVaultIdentity = {
  recoveryPhrase: string;
  recoveryEncryption: VaultKeyPair;
  recoverySigning: VaultKeyPair;
  deviceEncryption: VaultKeyPair;
  deviceSigning: VaultKeyPair;
};

export type BrowserDeviceBundle = {
  deviceEncryptionSecretKey: Uint8Array;
  deviceSigningSecretKey: Uint8Array;
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

export function encodeBrowserDeviceBundle(identity: BrowserVaultIdentity): Uint8Array {
  return encodeCanonicalCbor(new Map<number, number | Uint8Array>([
    [1, 1],
    [2, identity.deviceEncryption.secretKey],
    [3, identity.deviceSigning.secretKey],
  ]));
}

export async function unwrapDeviceBundle(
  unlockMaterial: Uint8Array,
  accountId: string,
  deviceId: string,
  salt: Uint8Array,
  encrypted: AesGcmCiphertext,
): Promise<BrowserDeviceBundle> {
  const key = await deriveVaultKey(unlockMaterial, salt, 'browserUnlock', utf8(`${accountId}\0${deviceId}\0bundle:1`));
  const record = decodeCanonicalCbor(await decryptAesGcm(key, encrypted, utf8(`clipsx/vault/v1/device-bundle\0${accountId}\0${deviceId}`)));
  const encryption = record.get(2);
  const signing = record.get(3);
  if (
    record.size !== 3
    || record.get(1) !== 1
    || !(encryption instanceof Uint8Array)
    || encryption.byteLength !== 32
    || !(signing instanceof Uint8Array)
    || signing.byteLength !== 32
  ) {
    throw new Error('Invalid browser device bundle.');
  }
  return { deviceEncryptionSecretKey: encryption, deviceSigningSecretKey: signing };
}
