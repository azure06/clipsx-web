import 'server-only';

import type { User } from '@supabase/supabase-js';

import { decodeCanonicalCbor, decodeVaultCommand, encodeCanonicalCbor, verifyProtocolRecord, type VaultCommand } from './protocol';

export const MAX_COMMAND_BYTES = 1_100_000;

export type VaultCommandPrincipal = Pick<User, 'id'> & { sessionId: string };

export type ActiveVaultDevice = {
  signingPublicKey: Uint8Array;
  boundSessionId: string | null;
};

export type VaultCommandLookup = {
  findActiveDevice(id: string, accountId: string): Promise<ActiveVaultDevice | null>;
  findActiveRecoveryKey(id: string, accountId: string): Promise<Uint8Array | null>;
};

export type DeviceSessionBinding = { deviceId: string; sessionId: string };
export type CommandAdmission = { command: VaultCommand; sessionBinding?: DeviceSessionBinding };
export type CollectionCreation = {
  collectionId: string; encryptedMetadata: Uint8Array; metadataNonce: Uint8Array;
  membershipStateHash: Uint8Array; recipientSetCommitment: Uint8Array; transitionPayload: Uint8Array;
  transitionSignature: Uint8Array; transitionHash: Uint8Array; recoveryKeyId: string;
  deviceEnvelope: { encapsulation: Uint8Array; ciphertext: Uint8Array; payload: Uint8Array; signature: Uint8Array };
  recoveryEnvelope: { encapsulation: Uint8Array; ciphertext: Uint8Array; payload: Uint8Array; signature: Uint8Array };
};
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

function payloadBytes(record: Map<number, unknown>, label: number, minimum: number): Uint8Array {
  const value = record.get(label); if (!(value instanceof Uint8Array) || value.byteLength < minimum) throw new Error('invalid-collection-create'); return value;
}

function envelope(record: Map<number, unknown>, label: number, kind: 'device' | 'recovery', collectionId: string, recipientId: string, deviceId: string, signature: Uint8Array) {
  const payload = payloadBytes(record, label, 1);
  const nested = decodeCanonicalCbor(payload) as Map<number, unknown>;
  if (nested.size !== 8 || nested.get(1) !== 1 || nested.get(2) !== collectionId || nested.get(3) !== 1
    || nested.get(4) !== kind || nested.get(5) !== recipientId || nested.get(6) !== deviceId) throw new Error('invalid-collection-create');
  return { encapsulation: bytes(nested, 7, 32), ciphertext: payloadBytes(nested, 8, 16), payload, signature };
}

export function admitCollectionCreation(command: VaultCommand): CollectionCreation {
  if (command.operationType !== 'collection-create' || !command.authorDeviceId || !command.collectionId) throw new Error('invalid-collection-create');
  const payload = decodeCanonicalCbor(command.payload) as Map<number, unknown>;
  if (payload.size !== 13 || text(payload, 1) !== command.collectionId) throw new Error('invalid-collection-create');
  const recoveryKeyId = text(payload, 13);
  const transitionSignature = bytes(payload, 7, 64);
  return {
    collectionId: command.collectionId, encryptedMetadata: payloadBytes(payload, 2, 16), metadataNonce: bytes(payload, 3, 12),
    membershipStateHash: bytes(payload, 4, 32), recipientSetCommitment: bytes(payload, 5, 32),
    transitionPayload: payloadBytes(payload, 6, 1), transitionSignature, transitionHash: bytes(payload, 8, 32), recoveryKeyId,
    deviceEnvelope: envelope(payload, 9, 'device', command.collectionId, command.authorDeviceId, command.authorDeviceId, bytes(payload, 10, 64)),
    recoveryEnvelope: envelope(payload, 11, 'recovery', command.collectionId, recoveryKeyId, command.authorDeviceId, bytes(payload, 12, 64)),
  };
}

export async function admitInitialDeviceRegistration(bytesInput: Uint8Array, user: Pick<User, 'id'>): Promise<{ command: VaultCommand; registration: InitialDeviceRegistration }> {
  if (bytesInput.byteLength === 0 || bytesInput.byteLength > MAX_COMMAND_BYTES) throw new Error('command-size');
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
  user: VaultCommandPrincipal,
  lookup: VaultCommandLookup,
): Promise<CommandAdmission> {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_COMMAND_BYTES) throw new Error('command-size');
  const command = decodeVaultCommand(bytes);
  if (command.accountId !== user.id) throw new Error('account-mismatch');

  const device = command.authorDeviceId
    ? await lookup.findActiveDevice(command.authorDeviceId, user.id)
    : null;
  const publicKey = device?.signingPublicKey
    ?? (command.recoveryKeyId ? await lookup.findActiveRecoveryKey(command.recoveryKeyId, user.id) : null);
  if (!publicKey) throw new Error('inactive-author');

  const valid = await verifyProtocolRecord(
    `clipsx/vault/v1/command/${command.operationType}`,
    command.signedBytes,
    command.signature,
    publicKey,
  );
  if (!valid) throw new Error('invalid-signature');

  if (command.operationType !== 'device-session-bind') {
    if (command.authorDeviceId && device?.boundSessionId !== user.sessionId) throw new Error('unbound-session');
    return { command };
  }

  if (!command.authorDeviceId || !command.expectedAccountHead || command.expectedAccountHead.byteLength !== 32) {
    throw new Error('invalid-session-binding');
  }
  const payload = decodeCanonicalCbor(command.payload) as Map<number, unknown>;
  if (payload.size !== 2 || text(payload, 1) !== command.authorDeviceId || text(payload, 2) !== user.sessionId) {
    throw new Error('invalid-session-binding');
  }
  return { command, sessionBinding: { deviceId: command.authorDeviceId, sessionId: user.sessionId } };
}
