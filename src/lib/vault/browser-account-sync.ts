import { ed25519 } from '@noble/curves/ed25519.js';

import {
  decodeCanonicalCbor,
  encodeCanonicalCbor,
  sha256,
  verifyProtocolRecord,
  type CborValue,
} from './protocol';

export type VerifiedAccountSync = {
  accountHead: Uint8Array;
  sequence: number;
  deviceSigningKeys: Map<string, Uint8Array>;
  recoverySigningKeys: Map<string, Uint8Array>;
};

type Operation = {
  id: string;
  sequence: number;
  type: string;
  payload: Uint8Array;
  previous: Uint8Array | null;
  hash: Uint8Array;
  authorDeviceId: string | null;
  recoveryKeyId: string | null;
  signature: Uint8Array;
};

type Authorization = {
  deviceId: string;
  authorDeviceId: string | null;
  recoveryKeyId: string | null;
  payload: Uint8Array;
  payloadHash: Uint8Array;
  proofPayload: Uint8Array;
  proofSignature: Uint8Array;
  signature: Uint8Array;
};

const same = (left: Uint8Array, right: Uint8Array) => left.byteLength === right.byteLength
  && left.every((value, index) => value === right[index]);

function text(record: Map<number, CborValue>, label: number): string {
  const value = record.get(label);
  if (typeof value !== 'string' || !value) throw new Error('Invalid vault account sync.');
  return value;
}

function bytes(record: Map<number, CborValue>, label: number, length?: number): Uint8Array {
  const value = record.get(label);
  if (!(value instanceof Uint8Array) || (length !== undefined && value.byteLength !== length)) {
    throw new Error('Invalid vault account sync.');
  }
  return value;
}

function nullableBytes(record: Map<number, CborValue>, label: number): Uint8Array | null {
  const value = record.get(label);
  if (value === null) return null;
  if (!(value instanceof Uint8Array)) throw new Error('Invalid vault account sync.');
  return value;
}

function nullableText(record: Map<number, CborValue>, label: number): string | null {
  const value = record.get(label);
  if (value === null) return null;
  if (typeof value !== 'string' || !value) throw new Error('Invalid vault account sync.');
  return value;
}

function addDirectoryEntry(directory: Map<string, Uint8Array>, id: string, key: Uint8Array) {
  const existing = directory.get(id);
  if (existing && !same(existing, key)) throw new Error('Vault signer directory changed within one sync.');
  directory.set(id, key.slice());
}

function parseOperation(value: CborValue): Operation {
  if (!(value instanceof Map) || value.size !== 9) throw new Error('Invalid vault account operation.');
  const sequence = value.get(2);
  const authorDeviceId = nullableText(value, 7);
  const recoveryKeyId = nullableText(value, 8);
  if (!Number.isSafeInteger(sequence) || (sequence as number) < 1 || (authorDeviceId === null) === (recoveryKeyId === null)) {
    throw new Error('Invalid vault account operation.');
  }
  return {
    id: text(value, 1), sequence: sequence as number, type: text(value, 3), payload: bytes(value, 4),
    previous: nullableBytes(value, 5), hash: bytes(value, 6, 32), authorDeviceId, recoveryKeyId,
    signature: bytes(value, 9, 64),
  };
}

function parseAuthorization(value: CborValue): Authorization {
  if (!(value instanceof Map) || value.size !== 9) throw new Error('Invalid vault device authorization.');
  const authorDeviceId = nullableText(value, 2); const recoveryKeyId = nullableText(value, 3);
  if ((authorDeviceId === null) === (recoveryKeyId === null)) throw new Error('Invalid vault device authorization.');
  return {
    deviceId: text(value, 1), authorDeviceId, recoveryKeyId, payload: bytes(value, 5),
    payloadHash: bytes(value, 6, 32), proofPayload: bytes(value, 7), proofSignature: bytes(value, 8, 64),
    signature: bytes(value, 9, 64),
  };
}

async function verifyInitialRegistration(
  operation: Operation,
  accountId: string,
  recoverySigningKey: Uint8Array,
  deviceSigningKeys: Map<string, Uint8Array>,
): Promise<string> {
  const command = decodeCanonicalCbor(operation.payload);
  const payloadBytes = command.get(9);
  if (command.get(1) !== 1 || command.get(2) !== operation.id || command.get(3) !== 'device-register'
    || command.get(4) !== accountId || command.get(5) !== `recovery:${operation.recoveryKeyId}`
    || !(payloadBytes instanceof Uint8Array)) throw new Error('Invalid initial vault operation.');
  const registration = decodeCanonicalCbor(payloadBytes);
  const initialDeviceId = text(registration, 1);
  const signingKey = bytes(registration, 9, 32);
  const recoveryKey = bytes(registration, 11, 32);
  const proof = bytes(registration, 15, 64);
  registration.delete(15);
  const proofPayload = encodeCanonicalCbor(registration);
  if (!same(deviceSigningKeys.get(initialDeviceId) ?? new Uint8Array(), signingKey)
    || !same(recoveryKey, recoverySigningKey)) throw new Error('Initial vault root does not match this device.');
  if (!await verifyProtocolRecord('clipsx/vault/v1/device-register-proof', proofPayload, proof, signingKey)) {
    throw new Error('Invalid initial vault device proof.');
  }
  return initialDeviceId;
}

export async function verifyVaultAccountSync(input: {
  pages: Uint8Array[];
  accountId: string;
  localDeviceId: string;
  localDeviceSigningSecretKey: Uint8Array;
  checkpointSequence?: number;
  checkpointHash?: Uint8Array;
}): Promise<VerifiedAccountSync> {
  if (input.pages.length === 0) throw new Error('Vault account sync returned no pages.');
  const deviceSigningKeys = new Map<string, Uint8Array>();
  const recoverySigningKeys = new Map<string, Uint8Array>();
  const authorizations = new Map<string, Authorization>();
  const operations: Operation[] = [];
  let expectedPageStart = 0;
  let expectedPageAnchor: Uint8Array | null = null;

  for (const [pageIndex, pageBytes] of input.pages.entries()) {
    const page = decodeCanonicalCbor(pageBytes);
    const rawOperations = page.get(3); const devices = page.get(4); const recovery = page.get(5);
    const nextSequence = page.get(7); const nextHash = page.get(8); const hasMore = page.get(9);
    if (page.size !== 9 || page.get(1) !== 1 || page.get(2) !== input.accountId
      || !Array.isArray(rawOperations) || !Array.isArray(devices) || !Array.isArray(recovery)
      || !Array.isArray(page.get(6)) || !Number.isSafeInteger(nextSequence)
      || (nextHash !== null && !(nextHash instanceof Uint8Array)) || typeof hasMore !== 'boolean'
      || (pageIndex < input.pages.length - 1) !== hasMore) throw new Error('Invalid vault account sync page.');

    for (const value of devices) {
      if (!(value instanceof Map) || value.size !== 5) throw new Error('Invalid vault device directory.');
      addDirectoryEntry(deviceSigningKeys, text(value, 1), bytes(value, 4, 32));
    }
    for (const value of recovery) {
      if (!(value instanceof Map) || value.size !== 7) throw new Error('Invalid vault recovery directory.');
      addDirectoryEntry(recoverySigningKeys, text(value, 1), bytes(value, 5, 32));
    }
    for (const value of page.get(6) as CborValue[]) {
      const authorization = parseAuthorization(value);
      const existing = authorizations.get(authorization.deviceId);
      if (existing && !same(existing.payloadHash, authorization.payloadHash)) throw new Error('Vault device authorization changed within one sync.');
      authorizations.set(authorization.deviceId, authorization);
    }
    const parsed = rawOperations.map(parseOperation);
    if (parsed.length > 0 && parsed[0].sequence !== expectedPageStart + 1) throw new Error('Vault account sync page is not contiguous.');
    if (parsed.length > 0 && !same(parsed[0].previous ?? new Uint8Array(), expectedPageAnchor ?? new Uint8Array())) {
      throw new Error('Vault account sync page anchor mismatch.');
    }
    operations.push(...parsed);
    expectedPageStart = nextSequence as number;
    expectedPageAnchor = nextHash instanceof Uint8Array ? nextHash : null;
  }

  const localSigningPublicKey = ed25519.getPublicKey(input.localDeviceSigningSecretKey);
  const localDirectoryKey = deviceSigningKeys.get(input.localDeviceId);
  if (!localDirectoryKey || !same(localDirectoryKey, localSigningPublicKey)) throw new Error('Vault device directory key mismatch.');
  if (operations.length === 0) throw new Error('Vault account ledger is empty.');

  let previous: Uint8Array | null = null;
  let expectedSequence = 1;
  const authorizedDevices = new Set<string>();
  for (const operation of operations) {
    if (operation.sequence !== expectedSequence
      || !same(operation.previous ?? new Uint8Array(), previous ?? new Uint8Array())) {
      throw new Error('Vault account operation chain is not contiguous.');
    }
    const signer = operation.authorDeviceId
      ? deviceSigningKeys.get(operation.authorDeviceId)
      : recoverySigningKeys.get(operation.recoveryKeyId!);
    if (!signer) throw new Error('Vault account operation has an unknown signer.');
    if (operation.authorDeviceId && !authorizedDevices.has(operation.authorDeviceId)) {
      throw new Error('Vault account operation signer is not authorized.');
    }
    const command = decodeCanonicalCbor(operation.payload);
    const expectedAuthor = operation.authorDeviceId
      ? `device:${operation.authorDeviceId}`
      : `recovery:${operation.recoveryKeyId}`;
    if (command.get(1) !== 1 || command.get(2) !== operation.id || command.get(3) !== operation.type
      || command.get(4) !== input.accountId || command.get(5) !== expectedAuthor
      || (operation.sequence > 1 && (!(command.get(7) instanceof Uint8Array)
        || !same(command.get(7) as Uint8Array, operation.previous!)))) {
      throw new Error('Vault account operation payload mismatch.');
    }
    command.set(10, operation.signature);
    if (!same(await sha256(encodeCanonicalCbor(command)), operation.hash)
      || !await verifyProtocolRecord(`clipsx/vault/v1/command/${operation.type}`, operation.payload, operation.signature, signer)) {
      throw new Error('Invalid vault account operation signature.');
    }
    if (operation.sequence === 1) {
      if (operation.type !== 'device-register' || !operation.recoveryKeyId
      ) throw new Error('Invalid initial vault trust root.');
      authorizedDevices.add(await verifyInitialRegistration(operation, input.accountId, signer, deviceSigningKeys));
    } else if (operation.type === 'device-authorize') {
      const commandPayload = command.get(9);
      if (!(commandPayload instanceof Uint8Array)) throw new Error('Invalid device authorization operation.');
      const approval = decodeCanonicalCbor(commandPayload);
      const targetDeviceId = text(approval, 1);
      const authorization = authorizations.get(targetDeviceId);
      const targetSigningKey = deviceSigningKeys.get(targetDeviceId);
      if (!authorization || !targetSigningKey || !same(authorization.payload, operation.payload)
        || !same(await sha256(authorization.payload), authorization.payloadHash)
        || !same(authorization.signature, operation.signature)) throw new Error('Device authorization record mismatch.');
      const proofCommand = decodeCanonicalCbor(authorization.proofPayload);
      const proofPayload = proofCommand.get(9);
      if (proofCommand.get(3) !== 'device-register' || !(proofPayload instanceof Uint8Array)) throw new Error('Invalid authorized device proof.');
      const proof = decodeCanonicalCbor(proofPayload);
      if (text(proof, 1) !== targetDeviceId || !same(bytes(proof, 8, 32), targetSigningKey)
        || !await verifyProtocolRecord('clipsx/vault/v1/command/device-register', authorization.proofPayload, authorization.proofSignature, targetSigningKey)) {
        throw new Error('Invalid authorized device proof.');
      }
      authorizedDevices.add(targetDeviceId);
    }
    if (input.checkpointSequence === operation.sequence && input.checkpointHash
      && !same(input.checkpointHash, operation.hash)) throw new Error('Vault account rollback detected.');
    previous = operation.hash;
    expectedSequence += 1;
  }

  if (!previous || expectedPageStart !== operations.length || !expectedPageAnchor || !same(previous, expectedPageAnchor)) {
    throw new Error('Vault account sync did not end at its declared head.');
  }
  if (input.checkpointSequence !== undefined && input.checkpointSequence > operations.length) {
    throw new Error('Vault account rollback detected.');
  }
  if (!authorizedDevices.has(input.localDeviceId)) throw new Error('This vault device is not authorized by the verified ledger.');
  return { accountHead: previous.slice(), sequence: operations.length, deviceSigningKeys, recoverySigningKeys };
}
