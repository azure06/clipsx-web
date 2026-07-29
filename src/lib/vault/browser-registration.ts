import { signProtocolRecord } from './protocol';
import {
  decodeCanonicalCbor,
  decodeVaultCommand,
  encodeCanonicalCbor,
  importHpkePrivateKey,
  openHpke,
  sha256,
  utf8,
  type CborValue,
} from './protocol';
import type { BrowserVaultIdentity } from './browser-onboarding';

export type DeviceRegistrationChallenge = {
  id: string;
  encapsulatedKey: Uint8Array;
  ciphertext: Uint8Array;
  expiresAt: string;
};

export function decodeDeviceRegistrationChallenge(bytes: Uint8Array): DeviceRegistrationChallenge {
  const record = decodeCanonicalCbor(bytes);
  const id = record.get(1);
  const encapsulatedKey = record.get(2);
  const ciphertext = record.get(3);
  const expiresAt = record.get(4);
  if (
    record.size !== 4 || typeof id !== 'string' || !(encapsulatedKey instanceof Uint8Array)
    || encapsulatedKey.byteLength !== 32 || !(ciphertext instanceof Uint8Array)
    || ciphertext.byteLength < 16 || typeof expiresAt !== 'string'
  ) throw new Error('Invalid device registration challenge.');
  return { id, encapsulatedKey, ciphertext, expiresAt };
}

export async function createInitialDeviceRegistrationCommand(input: {
  accountId: string;
  deviceId: string;
  recoveryKeyId: string;
  displayName: string;
  platform: string;
  enrollmentOrigin: string;
  protectionProfile: 'webauthn-prf-wrapped' | 'vault-passphrase-wrapped';
  capabilities: Uint8Array;
  challenge: DeviceRegistrationChallenge;
  identity: BrowserVaultIdentity;
  operationId?: string;
}): Promise<Uint8Array> {
  const challenge = await openHpke(
    await importHpkePrivateKey(input.identity.deviceEncryption.secretKey),
    { enc: input.challenge.encapsulatedKey, ciphertext: input.challenge.ciphertext },
    utf8(`clipsx/vault/v1/device-registration-challenge\0${input.accountId}\0${input.challenge.id}`),
  );
  if (challenge.byteLength !== 32) throw new Error('Invalid device registration challenge.');
  if (!Number.isFinite(Date.parse(input.challenge.expiresAt)) || Date.parse(input.challenge.expiresAt) <= Date.now()) {
    throw new Error('Device registration challenge has expired.');
  }

  const payload = new Map<number, CborValue>([
    [1, input.deviceId], [2, input.recoveryKeyId], [3, input.displayName], [4, input.platform],
    [5, input.enrollmentOrigin], [6, input.protectionProfile], [7, await sha256(input.capabilities)],
    [8, input.identity.deviceEncryption.publicKey], [9, input.identity.deviceSigning.publicKey],
    [10, input.identity.recoveryEncryption.publicKey], [11, input.identity.recoverySigning.publicKey],
    [12, 1], [13, input.challenge.id], [14, await sha256(challenge)],
  ]);
  const proofPayload = encodeCanonicalCbor(payload);
  payload.set(15, await signProtocolRecord(
    'clipsx/vault/v1/device-register-proof', proofPayload, input.identity.deviceSigning.secretKey,
  ));
  const unsigned = new Map<number, CborValue>([
    [1, 1], [2, input.operationId ?? crypto.randomUUID()], [3, 'device-register'],
    [4, input.accountId], [5, `recovery:${input.recoveryKeyId}`], [9, encodeCanonicalCbor(payload)],
  ]);
  const signed = encodeCanonicalCbor(unsigned);
  unsigned.set(10, await signProtocolRecord(
    'clipsx/vault/v1/command/device-register', signed, input.identity.recoverySigning.secretKey,
  ));
  return encodeCanonicalCbor(unsigned);
}

export function registrationOperationId(bytes: Uint8Array): string {
  return decodeVaultCommand(bytes).operationId;
}
