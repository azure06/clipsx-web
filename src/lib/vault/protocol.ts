import { Aes256Gcm, CipherSuite, HkdfSha256 } from '@hpke/core';
import { DhkemX25519HkdfSha256 } from '@hpke/dhkem-x25519';
import { ed25519 } from '@noble/curves/ed25519.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { decode, encode, rfc8949EncodeOptions } from 'cborg';

export const VAULT_PROTOCOL_VERSION = 1;
export const AES_GCM_NONCE_BYTES = 12;
export const AES_GCM_KEY_BYTES = 32;
export const RECOVERY_SECRET_BYTES = 32;
export const VAULT_PASSPHRASE_SALT_BYTES = 16;
export const MAX_NOTE_CIPHERTEXT_BYTES = 1024 * 1024;

export const VAULT_KDF_LABELS = {
  browserUnlock: 'clipsx/vault/v1/browser-unlock',
  passkeyRecoveryWrapper: 'clipsx/vault/v1/passkey-recovery-wrapper',
  recoveryEncryptionKey: 'clipsx/vault/v1/recovery-encryption-key',
  recoverySigningKey: 'clipsx/vault/v1/recovery-signing-key',
} as const;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type VaultKdfPurpose = keyof typeof VAULT_KDF_LABELS;
export type CborValue =
  | string
  | number
  | boolean
  | Uint8Array
  | null
  | CborValue[]
  | Map<number, CborValue>;

export type AesGcmCiphertext = {
  nonce: Uint8Array;
  ciphertext: Uint8Array;
};

export type HpkeCiphertext = {
  enc: Uint8Array;
  ciphertext: Uint8Array;
};

export const VAULT_COMMAND_TYPES = [
  'device-register', 'device-session-bind', 'device-authorize', 'device-revoke',
  'recovery-rotate', 'collection-create', 'note-append', 'note-delete',
  'checkpoint-append', 'invitation-create', 'invitation-accept',
  'invitation-confirm', 'member-add', 'member-remove', 'epoch-rotate',
  'epoch-envelope-grant',
] as const;

export type VaultCommandType = (typeof VAULT_COMMAND_TYPES)[number];
export type VaultCommand = {
  operationId: string; operationType: VaultCommandType; accountId: string;
  authorDeviceId?: string; recoveryKeyId?: string; collectionId?: string;
  expectedAccountHead?: Uint8Array; expectedCollectionHead?: Uint8Array;
  payload: Uint8Array; signature: Uint8Array; signedBytes: Uint8Array;
};

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

function assertLength(value: Uint8Array, expected: number, name: string): void {
  if (value.byteLength !== expected) {
    throw new Error(`${name} must be exactly ${expected} bytes.`);
  }
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;

  let different = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    different |= left[index] ^ right[index];
  }
  return different === 0;
}

export function utf8(value: string): Uint8Array {
  return textEncoder.encode(value);
}

export function decodeUtf8(value: Uint8Array): string {
  return textDecoder.decode(value);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((length, part) => length + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

export function randomBytes(length: number): Uint8Array {
  if (!Number.isSafeInteger(length) || length < 1) {
    throw new Error('Random byte length must be a positive safe integer.');
  }
  const result = new Uint8Array(length);
  crypto.getRandomValues(result);
  return result;
}

export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', asArrayBuffer(bytes)));
}

export async function deriveVaultKey(
  inputKeyMaterial: Uint8Array,
  salt: Uint8Array,
  purpose: VaultKdfPurpose,
  context: Uint8Array,
): Promise<Uint8Array> {
  assertLength(inputKeyMaterial, AES_GCM_KEY_BYTES, 'Input key material');
  const baseKey = await crypto.subtle.importKey('raw', asArrayBuffer(inputKeyMaterial), 'HKDF', false, ['deriveBits']);
  const info = concatBytes(utf8(VAULT_KDF_LABELS[purpose]), new Uint8Array([0]), context);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: asArrayBuffer(salt), info: asArrayBuffer(info) },
    baseKey,
    AES_GCM_KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function encryptAesGcm(
  keyBytes: Uint8Array,
  plaintext: Uint8Array,
  additionalData: Uint8Array,
  nonce = randomBytes(AES_GCM_NONCE_BYTES),
): Promise<AesGcmCiphertext> {
  assertLength(keyBytes, AES_GCM_KEY_BYTES, 'AES-GCM key');
  assertLength(nonce, AES_GCM_NONCE_BYTES, 'AES-GCM nonce');
  const key = await crypto.subtle.importKey('raw', asArrayBuffer(keyBytes), 'AES-GCM', false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: asArrayBuffer(nonce), additionalData: asArrayBuffer(additionalData), tagLength: 128 },
    key,
    asArrayBuffer(plaintext),
  );
  return { nonce: nonce.slice(), ciphertext: new Uint8Array(encrypted) };
}

export async function decryptAesGcm(
  keyBytes: Uint8Array,
  encrypted: AesGcmCiphertext,
  additionalData: Uint8Array,
): Promise<Uint8Array> {
  assertLength(keyBytes, AES_GCM_KEY_BYTES, 'AES-GCM key');
  assertLength(encrypted.nonce, AES_GCM_NONCE_BYTES, 'AES-GCM nonce');
  const key = await crypto.subtle.importKey('raw', asArrayBuffer(keyBytes), 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: asArrayBuffer(encrypted.nonce), additionalData: asArrayBuffer(additionalData), tagLength: 128 },
    key,
    asArrayBuffer(encrypted.ciphertext),
  );
  return new Uint8Array(plaintext);
}

export async function deriveVaultPassphraseKey(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
  assertLength(salt, VAULT_PASSPHRASE_SALT_BYTES, 'Vault passphrase salt');
  if (passphrase.length === 0) throw new Error('Vault passphrase cannot be empty.');
  return scryptAsync(utf8(passphrase), salt, { N: 131_072, r: 8, p: 1, dkLen: AES_GCM_KEY_BYTES });
}

export function createRecoveryPhrase(entropy = randomBytes(RECOVERY_SECRET_BYTES)): { entropy: Uint8Array; phrase: string } {
  assertLength(entropy, RECOVERY_SECRET_BYTES, 'Recovery entropy');
  return { entropy: entropy.slice(), phrase: entropyToMnemonic(entropy, wordlist) };
}

export function recoveryPhraseToEntropy(phrase: string): Uint8Array {
  if (!validateMnemonic(phrase, wordlist)) throw new Error('Recovery phrase is invalid.');
  const entropy = mnemonicToEntropy(phrase, wordlist);
  assertLength(entropy, RECOVERY_SECRET_BYTES, 'Recovery entropy');
  return entropy;
}

export function encodeCanonicalCbor(value: Map<number, CborValue>): Uint8Array {
  for (const key of value.keys()) {
    if (!Number.isSafeInteger(key) || key < 1) throw new Error('CBOR field labels must be positive integers.');
  }
  return encode(value, rfc8949EncodeOptions);
}

export function decodeCanonicalCbor(bytes: Uint8Array): Map<number, CborValue> {
  const decoded = decode(bytes, { strict: true, useMaps: true, rejectDuplicateMapKeys: true });
  if (!(decoded instanceof Map)) throw new Error('Protocol record must be a CBOR map.');
  for (const key of decoded.keys()) {
    if (typeof key !== 'number' || !Number.isSafeInteger(key) || key < 1) {
      throw new Error('CBOR field labels must be positive integers.');
    }
  }
  const record = decoded as Map<number, CborValue>;
  if (!equalBytes(bytes, encodeCanonicalCbor(record))) throw new Error('Protocol CBOR is not deterministic.');
  return record;
}

function requiredText(record: Map<number, CborValue>, label: number, name: string): string {
  const value = record.get(label);
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${name} is required.`);
  return value;
}

export function decodeVaultCommand(bytes: Uint8Array): VaultCommand {
  const record = decodeCanonicalCbor(bytes);
  if (record.size < 7 || record.size > 10 || record.get(1) !== VAULT_PROTOCOL_VERSION) throw new Error('Unsupported vault command.');
  const operationType = requiredText(record, 3, 'Operation type');
  if (!VAULT_COMMAND_TYPES.includes(operationType as VaultCommandType)) throw new Error('Unsupported vault operation.');
  const author = record.get(5);
  if (typeof author !== 'string' || author.length === 0) throw new Error('Command author is required.');
  const payload = record.get(9);
  const signature = record.get(10);
  if (!(payload instanceof Uint8Array) || !(signature instanceof Uint8Array) || signature.byteLength !== 64) throw new Error('Invalid command payload or signature.');
  const unsigned = new Map(record);
  unsigned.delete(10);
  const signedBytes = encodeCanonicalCbor(unsigned);
  const accountHead = record.get(7); const collectionHead = record.get(8);
  if (accountHead !== undefined && !(accountHead instanceof Uint8Array)) throw new Error('Invalid account head.');
  if (collectionHead !== undefined && !(collectionHead instanceof Uint8Array)) throw new Error('Invalid collection head.');
  return {
    operationId: requiredText(record, 2, 'Operation ID'), operationType: operationType as VaultCommandType,
    accountId: requiredText(record, 4, 'Account ID'),
    ...(author.startsWith('device:') ? { authorDeviceId: author.slice(7) } : author.startsWith('recovery:') ? { recoveryKeyId: author.slice(9) } : (() => { throw new Error('Invalid command author.'); })()),
    ...(typeof record.get(6) === 'string' ? { collectionId: record.get(6) as string } : {}),
    ...(accountHead ? { expectedAccountHead: accountHead } : {}), ...(collectionHead ? { expectedCollectionHead: collectionHead } : {}),
    payload, signature, signedBytes,
  };
}

export async function signProtocolRecord(
  domainLabel: string,
  canonicalRecordWithoutSignature: Uint8Array,
  secretKey: Uint8Array,
): Promise<Uint8Array> {
  return ed25519.sign(concatBytes(utf8(domainLabel), new Uint8Array([0]), canonicalRecordWithoutSignature), secretKey);
}

export async function verifyProtocolRecord(
  domainLabel: string,
  canonicalRecordWithoutSignature: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): Promise<boolean> {
  return ed25519.verify(signature, concatBytes(utf8(domainLabel), new Uint8Array([0]), canonicalRecordWithoutSignature), publicKey, { zip215: false });
}

function hpkeSuite(): CipherSuite {
  return new CipherSuite({ kem: new DhkemX25519HkdfSha256(), kdf: new HkdfSha256(), aead: new Aes256Gcm() });
}

export async function sealHpke(recipientPublicKey: CryptoKey, plaintext: Uint8Array, additionalData: Uint8Array): Promise<HpkeCiphertext> {
  const sealed = await hpkeSuite().seal({ recipientPublicKey }, plaintext, additionalData);
  return { enc: new Uint8Array(sealed.enc), ciphertext: new Uint8Array(sealed.ct) };
}

export async function openHpke(recipientPrivateKey: CryptoKey, encrypted: HpkeCiphertext, additionalData: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await hpkeSuite().open({ recipientKey: recipientPrivateKey, enc: encrypted.enc }, encrypted.ciphertext, additionalData));
}

export async function generateHpkeKeyPair() {
  return hpkeSuite().kem.generateKeyPair();
}

export async function importHpkePublicKey(bytes: Uint8Array): Promise<CryptoKey> {
  assertLength(bytes, 32, 'HPKE X25519 public key');
  return hpkeSuite().kem.importKey('raw', asArrayBuffer(bytes), true);
}

export async function importHpkePrivateKey(bytes: Uint8Array): Promise<CryptoKey> {
  assertLength(bytes, 32, 'HPKE X25519 private key');
  return hpkeSuite().kem.importKey('raw', asArrayBuffer(bytes), false);
}
