import { ed25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';

import {
  AES_GCM_NONCE_BYTES,
  createRecoveryPhrase,
  decodeVaultCommand,
  decodeCanonicalCbor,
  decodeUtf8,
  decryptAesGcm,
  deriveVaultKey,
  encodeCanonicalCbor,
  encryptAesGcm,
  generateHpkeKeyPair,
  openHpke,
  recoveryPhraseToEntropy,
  sealHpke,
  sha256,
  signProtocolRecord,
  utf8,
  VAULT_KDF_LABELS,
  verifyProtocolRecord,
} from './protocol';

describe('vault protocol v1 primitives', () => {
  it('derives a domain-separated deterministic key', async () => {
    const material = new Uint8Array(32).fill(1);
    const salt = new Uint8Array(16).fill(2);
    const context = utf8('account:alice/device:browser-1/version:1');

    const browserUnlock = await deriveVaultKey(material, salt, 'browserUnlock', context);
    const recoveryEncryptionKey = await deriveVaultKey(material, salt, 'recoveryEncryptionKey', context);

    expect(browserUnlock).toEqual(await deriveVaultKey(material, salt, 'browserUnlock', context));
    expect(browserUnlock).not.toEqual(recoveryEncryptionKey);
    expect(Object.values(VAULT_KDF_LABELS)).toHaveLength(4);
  });

  it('authenticates AES-GCM ciphertext and associated data', async () => {
    const key = new Uint8Array(32).fill(7);
    const nonce = new Uint8Array(AES_GCM_NONCE_BYTES).fill(9);
    const encrypted = await encryptAesGcm(key, utf8('private note'), utf8('note:1'), nonce);

    expect(decodeUtf8(await decryptAesGcm(key, encrypted, utf8('note:1')))).toBe('private note');
    await expect(decryptAesGcm(key, encrypted, utf8('note:2'))).rejects.toThrow();
  });

  it('round trips a 24-word recovery phrase without exposing a server format', () => {
    const entropy = new Uint8Array(32).map((_, index) => index);
    const recovery = createRecoveryPhrase(entropy);

    expect(recovery.phrase.split(' ')).toHaveLength(24);
    expect(recoveryPhraseToEntropy(recovery.phrase)).toEqual(entropy);
  });

  it('rejects non-deterministic or duplicate-key CBOR records', () => {
    const record = new Map<number, number | string>([[1, 1], [2, 'note']]);
    const encoded = encodeCanonicalCbor(record);

    expect(decodeCanonicalCbor(encoded)).toEqual(record);
    expect(() => decodeCanonicalCbor(new Uint8Array([0xa1, 0x18, 0x01, 0x01]))).toThrow();
    expect(() => decodeCanonicalCbor(new Uint8Array([0xa2, 0x01, 0x01, 0x01, 0x02]))).toThrow();
  });

  it('domain-separates Ed25519 signatures', async () => {
    const { secretKey, publicKey } = ed25519.keygen(new Uint8Array(32).fill(3));
    const payload = encodeCanonicalCbor(new Map([[1, 'note-append']]));
    const signature = await signProtocolRecord('clipsx/vault/v1/command/note-append', payload, secretKey);

    await expect(verifyProtocolRecord('clipsx/vault/v1/command/note-append', payload, signature, publicKey)).resolves.toBe(true);
    await expect(verifyProtocolRecord('clipsx/vault/v1/command/note-delete', payload, signature, publicKey)).resolves.toBe(false);
  });

  it('accepts only a canonical v1 command shape', () => {
    const command = new Map<number, number | string | Uint8Array>([
      [1, 1], [2, 'operation-1'], [3, 'item-append'], [4, 'account-1'],
      [5, 'device:device-1'], [9, new Uint8Array([1])], [10, new Uint8Array(64)],
    ]);
    const parsed = decodeVaultCommand(encodeCanonicalCbor(command));

    expect(parsed.authorDeviceId).toBe('device-1');
    expect(parsed.operationType).toBe('item-append');
    expect(parsed.signedBytes).toEqual(encodeCanonicalCbor(new Map([...command].slice(0, -1))));
  });

  it('uses the X25519 HPKE profile for encrypted envelopes', async () => {
    const recipient = await generateHpkeKeyPair();
    const encrypted = await sealHpke(recipient.publicKey, utf8('epoch key'), utf8('collection:1/epoch:2'));

    expect(decodeUtf8(await openHpke(recipient.privateKey, encrypted, utf8('collection:1/epoch:2')))).toBe('epoch key');
    expect(await sha256(encrypted.ciphertext)).toHaveLength(32);
  });
});
