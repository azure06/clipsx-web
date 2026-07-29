import 'server-only';

import type { User } from '@supabase/supabase-js';

import { decodeCanonicalCbor, decodeVaultCommand, encodeCanonicalCbor, sha256, verifyProtocolRecord, type VaultCommand } from './protocol';

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
export type PendingDeviceRegistration = Omit<InitialDeviceRegistration, 'recoveryKeyId' | 'recoveryEncryptionPublicKey' | 'recoverySigningPublicKey'> & { sasCommitment: Uint8Array };
export type DeviceAuthorization = {
  deviceId: string; method: 'qr-sas'; sasHash: Uint8Array; pendingCommandHash: Uint8Array;
  envelopes: Array<{ collectionId: string; epochNumber: number; encapsulation: Uint8Array; ciphertext: Uint8Array; payload: Uint8Array; signature: Uint8Array }>;
};
export type RecoveryDeviceAuthorization = {
  deviceId: string; pendingCommandHash: Uint8Array;
  envelopes: DeviceAuthorization['envelopes'];
};
export type NoteAppend = {
  noteId: string; collectionEpoch: number; revisionNumber: number; encryptedContent: Uint8Array;
  contentNonce: Uint8Array; wrappedRevisionKey: Uint8Array; keyWrapNonce: Uint8Array;
  ciphertextHash: Uint8Array; wrappedRevisionKeyHash: Uint8Array; revisionHash: Uint8Array;
  revisionSignature: Uint8Array; itemType: 'note' | 'login';
  previousRevisionHash: Uint8Array | null;
};

export type NoteDelete = { noteId: string; expectedRevisionHash: Uint8Array };
export type DeviceRevocation = { deviceId: string; reason: string; rotations: Array<{ collectionId: string; epochNumber: number; membershipHash: Uint8Array; recipientCommitment: Uint8Array; transitionPayload: Uint8Array; transitionSignature: Uint8Array; transitionHash: Uint8Array; deviceEnvelopes: Map<number, unknown>[]; recoveryEnvelopes: Map<number, unknown>[] }> };
export type RecoveryRotation = { newRecoveryKeyId: string; encryptionPublicKey: Uint8Array; signingPublicKey: Uint8Array; activeDeviceId: string; activeSignature: Uint8Array; envelopes: Map<number, unknown>[]; activeSignedPayload: Uint8Array };

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
  if (command.operationType !== 'collection-create' || !command.authorDeviceId || !command.collectionId
    || !command.expectedAccountHead || command.expectedAccountHead.byteLength !== 32) throw new Error('invalid-collection-create');
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

/** Strictly decodes the opaque, first immutable revision.  The server learns no content. */
export async function admitNoteAppend(command: VaultCommand, signingPublicKey: Uint8Array): Promise<NoteAppend> {
  if (command.operationType !== 'note-append' || !command.authorDeviceId || !command.collectionId
    || !command.expectedAccountHead || command.expectedAccountHead.byteLength !== 32
    || !command.expectedCollectionHead || command.expectedCollectionHead.byteLength !== 32) throw new Error('invalid-note-append');
  const payload = decodeCanonicalCbor(command.payload) as Map<number, unknown>;
  const attachment = command.transportAttachment;
  const revisionNumber = payload.get(3);
  const collectionEpoch = payload.get(2);
  if ((payload.size !== 10 && payload.size !== 11) || !(attachment instanceof Map)
    || attachment.size !== 2 || typeof collectionEpoch !== 'number'
    || !Number.isSafeInteger(collectionEpoch) || collectionEpoch < 1 || typeof revisionNumber !== 'number'
    || !Number.isSafeInteger(revisionNumber) || revisionNumber < 1) throw new Error('invalid-note-append');
  const itemType = payload.get(10);
  if (itemType !== 'note' && itemType !== 'login') throw new Error('invalid-note-append');
  const result: NoteAppend = {
    noteId: text(payload, 1), collectionEpoch, revisionNumber,
    encryptedContent: payloadBytes(attachment, 1, 16), contentNonce: bytes(payload, 4, 12),
    wrappedRevisionKey: payloadBytes(attachment, 2, 16), keyWrapNonce: bytes(payload, 5, 12),
    ciphertextHash: bytes(payload, 6, 32), wrappedRevisionKeyHash: bytes(payload, 7, 32),
    revisionHash: bytes(payload, 8, 32), revisionSignature: bytes(payload, 9, 64), itemType,
    previousRevisionHash: payload.size === 11 ? bytes(payload, 11, 32) : null,
  };
  if ((result.revisionNumber === 1) !== (result.previousRevisionHash === null)) throw new Error('invalid-note-append');
  if (result.encryptedContent.byteLength > 1_048_576
    || !sameBytes(await sha256(result.encryptedContent), result.ciphertextHash)
    || !sameBytes(await sha256(result.wrappedRevisionKey), result.wrappedRevisionKeyHash)) throw new Error('invalid-note-append');
  const revisionRecord = encodeCanonicalCbor(new Map<number, import('./protocol').CborValue>([
    [1, 1], [2, command.operationId], [3, command.collectionId], [4, result.noteId], [5, result.collectionEpoch],
    [6, result.revisionNumber], [7, result.previousRevisionHash], [8, result.ciphertextHash], [9, result.wrappedRevisionKeyHash], [10, command.authorDeviceId],
  ]));
  if (!sameBytes(await sha256(revisionRecord), result.revisionHash)
    || !await verifyProtocolRecord('clipsx/vault/v1/note-revision', revisionRecord, result.revisionSignature, signingPublicKey)) throw new Error('invalid-note-append');
  return result;
}

export function admitNoteDelete(command: VaultCommand): NoteDelete {
  if (command.operationType !== 'note-delete' || !command.authorDeviceId || !command.collectionId
    || !command.expectedAccountHead || command.expectedAccountHead.byteLength !== 32
    || !command.expectedCollectionHead || command.expectedCollectionHead.byteLength !== 32) throw new Error('invalid-note-delete');
  const payload = decodeCanonicalCbor(command.payload) as Map<number, unknown>;
  if (payload.size !== 2) throw new Error('invalid-note-delete');
  return { noteId: text(payload, 1), expectedRevisionHash: bytes(payload, 2, 32) };
}

export function admitDeviceRevocation(command: VaultCommand): DeviceRevocation {
  if (command.operationType !== 'device-revoke' || !command.authorDeviceId || !command.expectedAccountHead || command.expectedAccountHead.byteLength !== 32) throw new Error('invalid-device-revocation');
  const payload = decodeCanonicalCbor(command.payload) as Map<number, unknown>; const rotations = payload.get(3);
  if (payload.size !== 3 || !Array.isArray(rotations)) throw new Error('invalid-device-revocation');
  return { deviceId: text(payload, 1), reason: text(payload, 2), rotations: rotations.map((entry) => {
    const epochNumber = entry instanceof Map ? entry.get(9) : null;
    if (!(entry instanceof Map) || entry.size !== 9 || !Array.isArray(entry.get(7)) || !Array.isArray(entry.get(8)) || typeof epochNumber !== 'number' || !Number.isSafeInteger(epochNumber) || epochNumber < 2) throw new Error('invalid-device-revocation');
    return { collectionId: text(entry, 1), epochNumber, membershipHash: bytes(entry, 2, 32), recipientCommitment: bytes(entry, 3, 32), transitionPayload: payloadBytes(entry, 4, 1), transitionSignature: bytes(entry, 5, 64), transitionHash: bytes(entry, 6, 32), deviceEnvelopes: entry.get(7) as Map<number, unknown>[], recoveryEnvelopes: entry.get(8) as Map<number, unknown>[] };
  }) };
}
export async function admitRecoveryRotation(command: VaultCommand, activeSigningPublicKey: Uint8Array): Promise<RecoveryRotation> {
  if (command.operationType !== 'recovery-rotate' || !command.recoveryKeyId || !command.expectedAccountHead || command.expectedAccountHead.byteLength !== 32) throw new Error('invalid-recovery-rotation');
  const payload = decodeCanonicalCbor(command.payload) as Map<number, unknown>;
  const envelopes = payload.get(6);
  if (payload.size !== 6 || !Array.isArray(envelopes)
    || envelopes.some((envelope) => !(envelope instanceof Map) || envelope.size !== 6
      || typeof envelope.get(1) !== 'string' || typeof envelope.get(2) !== 'number'
      || !Number.isSafeInteger(envelope.get(2)) || (envelope.get(2) as number) < 1
      || !(envelope.get(3) instanceof Uint8Array) || !(envelope.get(4) instanceof Uint8Array)
      || !(envelope.get(5) instanceof Uint8Array) || !(envelope.get(6) instanceof Uint8Array)
      || (envelope.get(3) as Uint8Array).byteLength !== 32 || (envelope.get(6) as Uint8Array).byteLength !== 64)
    || new Set(envelopes.map((envelope) => `${(envelope as Map<number, unknown>).get(1)}:${(envelope as Map<number, unknown>).get(2)}`)).size !== envelopes.length) throw new Error('invalid-recovery-rotation');
  const unsigned = new Map(payload); const activeSignature = bytes(payload, 5, 64); unsigned.delete(5);
  const activeSignedPayload = encodeCanonicalCbor(unsigned as Map<number, import('./protocol').CborValue>);
  if (!await verifyProtocolRecord('clipsx/vault/v1/recovery-rotate-active', activeSignedPayload, activeSignature, activeSigningPublicKey)) throw new Error('invalid-recovery-rotation');
  return { newRecoveryKeyId: text(payload, 1), encryptionPublicKey: bytes(payload, 2, 32), signingPublicKey: bytes(payload, 3, 32), activeDeviceId: text(payload, 4), activeSignature, envelopes: envelopes as Map<number, unknown>[], activeSignedPayload };
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((value, index) => value === right[index]);
}

function canonicalOrigin(value: string): string | null {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.origin : null;
  } catch { return null; }
}

export function configuredVaultEnrollmentOrigins(value = process.env.VAULT_ENROLLMENT_ORIGINS): Set<string> {
  return new Set((value ?? '').split(',').map((origin) => canonicalOrigin(origin.trim())).filter((origin): origin is string => origin !== null));
}

/** Production/staging origins are explicit configuration; development only permits loopback. */
export function isAllowedVaultEnrollmentOrigin(
  origin: string,
  environment = process.env.NODE_ENV,
  configuredOrigins = configuredVaultEnrollmentOrigins(),
): boolean {
  const canonical = canonicalOrigin(origin);
  if (!canonical || canonical !== origin) return false;
  if (configuredOrigins.has(canonical)) return true;
  if (environment === 'production') return false;
  const host = new URL(canonical).hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
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
  if (command.recoveryKeyId !== recoveryKeyId || !isAllowedVaultEnrollmentOrigin(registration.enrollmentOrigin) || !['webauthn-prf-wrapped', 'vault-passphrase-wrapped'].includes(registration.protectionProfile)) throw new Error('invalid-registration');
  const proof = bytes(payload, 15, 64); registration.deviceProofSignature = proof; const proofFields = new Map(payload); proofFields.delete(15);
  registration.deviceProofPayload = encodeCanonicalCbor(proofFields as Map<number, import('./protocol').CborValue>);
  if (!await verifyProtocolRecord('clipsx/vault/v1/device-register-proof', registration.deviceProofPayload, proof, registration.deviceSigningPublicKey)) throw new Error('invalid-device-proof');
  if (!await verifyProtocolRecord(`clipsx/vault/v1/command/${command.operationType}`, command.signedBytes, command.signature, registration.recoverySigningPublicKey)) throw new Error('invalid-signature');
  return { command, registration };
}

/** A non-bootstrap device-register is signed by the proposed device itself.
 * Its HPKE challenge response proves encryption-key possession independently
 * from the outer Ed25519 command signature.  It remains unusable while pending.
 */
export async function admitPendingDeviceRegistration(bytesInput: Uint8Array, user: Pick<User, 'id'>): Promise<{ command: VaultCommand; registration: PendingDeviceRegistration }> {
  if (bytesInput.byteLength === 0 || bytesInput.byteLength > MAX_COMMAND_BYTES) throw new Error('command-size');
  const command = decodeVaultCommand(bytesInput);
  if (command.operationType !== 'device-register' || command.accountId !== user.id || !command.authorDeviceId) throw new Error('invalid-pending-registration');
  const payload = decodeCanonicalCbor(command.payload) as Map<number, unknown>;
  if (payload.size !== 12 || payload.get(9) !== 1) throw new Error('invalid-pending-registration');
  const registration: PendingDeviceRegistration = {
    deviceId: text(payload, 1), displayName: text(payload, 2), platform: text(payload, 3), enrollmentOrigin: text(payload, 4),
    protectionProfile: text(payload, 5), capabilitiesHash: bytes(payload, 6, 32), deviceEncryptionPublicKey: bytes(payload, 7, 32),
    deviceSigningPublicKey: bytes(payload, 8, 32), challengeId: text(payload, 10), challengeResponseHash: bytes(payload, 11, 32),
    deviceProofPayload: command.signedBytes, deviceProofSignature: command.signature, sasCommitment: bytes(payload, 12, 32),
  };
  if (command.authorDeviceId !== registration.deviceId || !isAllowedVaultEnrollmentOrigin(registration.enrollmentOrigin)
    || !['webauthn-prf-wrapped', 'vault-passphrase-wrapped'].includes(registration.protectionProfile)
    || !await verifyProtocolRecord('clipsx/vault/v1/command/device-register', command.signedBytes, command.signature, registration.deviceSigningPublicKey)) throw new Error('invalid-pending-registration');
  return { command, registration };
}

export function admitDeviceAuthorization(command: VaultCommand): DeviceAuthorization {
  if (command.operationType !== 'device-authorize' || !command.authorDeviceId || !command.expectedAccountHead || command.expectedAccountHead.byteLength !== 32) throw new Error('invalid-device-authorization');
  const payload = decodeCanonicalCbor(command.payload) as Map<number, unknown>;
  const rawEnvelopes = payload.get(5);
  if (payload.size !== 5 || payload.get(2) !== 'qr-sas' || !Array.isArray(rawEnvelopes)) throw new Error('invalid-device-authorization');
  const deviceId = text(payload, 1);
  const envelopes = rawEnvelopes.map((value) => {
    if (!(value instanceof Map) || value.size !== 6) throw new Error('invalid-device-authorization');
    const epochNumber = value.get(2);
    if (typeof epochNumber !== 'number' || !Number.isSafeInteger(epochNumber) || epochNumber < 1) throw new Error('invalid-device-authorization');
    return { collectionId: text(value, 1), epochNumber, encapsulation: bytes(value, 3, 32), ciphertext: payloadBytes(value, 4, 16), payload: payloadBytes(value, 5, 1), signature: bytes(value, 6, 64) };
  });
  return { deviceId, method: 'qr-sas', sasHash: bytes(payload, 3, 32), pendingCommandHash: bytes(payload, 4, 32), envelopes };
}

export function admitRecoveryDeviceAuthorization(command: VaultCommand): RecoveryDeviceAuthorization {
  if (command.operationType !== 'device-authorize' || !command.recoveryKeyId || !command.expectedAccountHead || command.expectedAccountHead.byteLength !== 32) throw new Error('invalid-device-authorization');
  const payload = decodeCanonicalCbor(command.payload) as Map<number, unknown>; const rawEnvelopes = payload.get(4);
  if (payload.size !== 4 || payload.get(2) !== 'recovery' || !Array.isArray(rawEnvelopes)) throw new Error('invalid-device-authorization');
  const envelopes = rawEnvelopes.map((value) => {
    if (!(value instanceof Map) || value.size !== 6) throw new Error('invalid-device-authorization');
    const epochNumber = value.get(2);
    if (typeof epochNumber !== 'number' || !Number.isSafeInteger(epochNumber) || epochNumber < 1) throw new Error('invalid-device-authorization');
    return { collectionId: text(value, 1), epochNumber, encapsulation: bytes(value, 3, 32), ciphertext: payloadBytes(value, 4, 16), payload: payloadBytes(value, 5, 1), signature: bytes(value, 6, 64) };
  });
  return { deviceId: text(payload, 1), pendingCommandHash: bytes(payload, 3, 32), envelopes };
}

export async function admitVaultCommand(
  bytes: Uint8Array,
  user: VaultCommandPrincipal,
  lookup: VaultCommandLookup,
): Promise<CommandAdmission> {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_COMMAND_BYTES) throw new Error('command-size');
  const command = decodeVaultCommand(bytes);
  if (command.accountId !== user.id) throw new Error('account-mismatch');
  if (command.collectionId && (!command.expectedAccountHead || command.expectedAccountHead.byteLength !== 32)) {
    throw new Error('invalid-account-head');
  }

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
