import 'server-only';

import type { User } from '@supabase/supabase-js';

import { decodeCanonicalCbor, decodeVaultCommand, encodeCanonicalCbor, verifyProtocolRecord, type VaultCommand } from './protocol';

const MAX_COMMAND_BYTES = 1_100_000;

export type VaultCommandLookup = {
  findActiveDevice(id: string, accountId: string): Promise<Uint8Array | null>;
  findActiveRecoveryKey(id: string, accountId: string): Promise<Uint8Array | null>;
};

export type CommandAdmission = { command: VaultCommand };
export type InitialDeviceRegistration = {
  deviceId: string; recoveryKeyId: string; displayName: string; platform: string;
  enrollmentOrigin: string; protectionProfile: string; capabilitiesHash: Uint8Array;
  deviceEncryptionPublicKey: Uint8Array; deviceSigningPublicKey: Uint8Array;
  recoveryEncryptionPublicKey: Uint8Array; recoverySigningPublicKey: Uint8Array;
  challengeId: string; challengeResponseHash: Uint8Array; deviceProofPayload: Uint8Array; deviceProofSignature: Uint8Array;
};

function text(record: Map<number, unknown>, label: number): string {
  const value = record.get(label); if (typeof value !== 'string' || !value) throw new Error('invalid-registration'); return value;
}
function bytes(record: Map<number, unknown>, label: number, length: number): Uint8Array {
  const value = record.get(label); if (!(value instanceof Uint8Array) || value.byteLength !== length) throw new Error('invalid-registration'); return value;
}

export async function admitInitialDeviceRegistration(bytesInput: Uint8Array, user: Pick<User, 'id'>): Promise<{ command: VaultCommand; registration: InitialDeviceRegistration }> {
  const command = decodeVaultCommand(bytesInput);
  if (command.operationType !== 'device-register' || command.accountId !== user.id || !command.recoveryKeyId) throw new Error('invalid-registration');
  const payload = decodeCanonicalCbor(command.payload) as Map<number, unknown>;
  if (payload.size !== 15 || payload.get(12) !== 1) throw new Error('invalid-registration');
  const recoveryKeyId = text(payload, 2);
  const registration: InitialDeviceRegistration = {
    deviceId: text(payload, 1), recoveryKeyId, displayName: text(payload, 3), platform: text(payload, 4),
    enrollmentOrigin: text(payload, 5), protectionProfile: text(payload, 6), capabilitiesHash: bytes(payload, 7, 32),
    deviceEncryptionPublicKey: bytes(payload, 8, 32), deviceSigningPublicKey: bytes(payload, 9, 32),
    recoveryEncryptionPublicKey: bytes(payload, 10, 32), recoverySigningPublicKey: bytes(payload, 11, 32),
    challengeId: text(payload, 13), challengeResponseHash: bytes(payload, 14, 32), deviceProofPayload: new Uint8Array(), deviceProofSignature: new Uint8Array(),
  };
  if (command.recoveryKeyId !== recoveryKeyId || registration.enrollmentOrigin !== 'https://clipsx.app' || !['webauthn-prf-wrapped', 'vault-passphrase-wrapped'].includes(registration.protectionProfile)) throw new Error('invalid-registration');
  const proof = bytes(payload, 15, 64); registration.deviceProofSignature = proof; const proofFields = new Map(payload); proofFields.delete(15);
  registration.deviceProofPayload = encodeCanonicalCbor(proofFields as Map<number, import('./protocol').CborValue>);
  if (!await verifyProtocolRecord('clipsx/vault/v1/device-register-proof', registration.deviceProofPayload, proof, registration.deviceSigningPublicKey)) throw new Error('invalid-device-proof');
  if (!await verifyProtocolRecord(`clipsx/vault/v1/command/${command.operationType}`, command.signedBytes, command.signature, registration.recoverySigningPublicKey)) throw new Error('invalid-signature');
  return { command, registration };
}

export async function admitVaultCommand(
  bytes: Uint8Array,
  user: Pick<User, 'id'>,
  lookup: VaultCommandLookup,
): Promise<CommandAdmission> {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_COMMAND_BYTES) throw new Error('command-size');
  const command = decodeVaultCommand(bytes);
  if (command.accountId !== user.id) throw new Error('account-mismatch');

  const publicKey = command.authorDeviceId
    ? await lookup.findActiveDevice(command.authorDeviceId, user.id)
    : await lookup.findActiveRecoveryKey(command.recoveryKeyId!, user.id);
  if (!publicKey) throw new Error('inactive-author');

  const valid = await verifyProtocolRecord(
    `clipsx/vault/v1/command/${command.operationType}`,
    command.signedBytes,
    command.signature,
    publicKey,
  );
  if (!valid) throw new Error('invalid-signature');
  return { command };
}
