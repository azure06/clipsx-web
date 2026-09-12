import 'server-only';

import {
  decodeCanonicalCbor,
  encodeCanonicalCbor,
  sha256,
  verifyProtocolRecord,
  type CborValue,
  type VaultCommand,
} from './protocol';

export type InvitationCreate = {
  invitationId: string;
  membershipId: string;
  recipientAccountId: string;
  role: 'editor' | 'viewer';
  expiresAt: string;
  invitationKeyCommitment: Uint8Array;
  verificationCommitment: Uint8Array;
};

export type InvitationAccept = {
  invitationId: string;
  invitationCommandHash: Uint8Array;
  verificationCommitment: Uint8Array;
  transcriptHash: Uint8Array;
};

export type InvitationConfirm = {
  invitationId: string;
  acceptanceCommandHash: Uint8Array;
  transcriptHash: Uint8Array;
  verificationCommitment: Uint8Array;
};

export type SharingEnvelope = {
  recipientId: string;
  epochNumber: number;
  encapsulation: Uint8Array;
  ciphertext: Uint8Array;
  payload: Uint8Array;
  signature: Uint8Array;
};

export type MemberAdd = {
  invitationId: string;
  membershipId: string;
  recipientAccountId: string;
  role: 'editor' | 'viewer';
  joinedEpoch: number;
  historyAccessFromEpoch: number;
  membershipStateHash: Uint8Array;
  recipientSetCommitment: Uint8Array;
  encryptedMetadata: Uint8Array;
  metadataNonce: Uint8Array;
  transitionPayload: Uint8Array;
  transitionSignature: Uint8Array;
  transitionHash: Uint8Array;
  deviceEnvelopes: SharingEnvelope[];
  recoveryEnvelopes: SharingEnvelope[];
  historicalDeviceEnvelopes: SharingEnvelope[];
  historicalRecoveryEnvelopes: SharingEnvelope[];
};

export type MemberRemove = Omit<
  MemberAdd,
  'invitationId' | 'role' | 'joinedEpoch' | 'historyAccessFromEpoch'
  | 'historicalDeviceEnvelopes' | 'historicalRecoveryEnvelopes'
> & { epochNumber: number };

function text(record: Map<number, unknown>, label: number): string {
  const value = record.get(label);
  if (typeof value !== 'string' || value.length === 0) throw new Error('invalid-sharing-command');
  return value;
}

function bytes(record: Map<number, unknown>, label: number, length?: number): Uint8Array {
  const value = record.get(label);
  if (!(value instanceof Uint8Array) || (length !== undefined && value.byteLength !== length)) {
    throw new Error('invalid-sharing-command');
  }
  return value;
}

function positiveInteger(record: Map<number, unknown>, label: number): number {
  const value = record.get(label);
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new Error('invalid-sharing-command');
  }
  return value;
}

function role(record: Map<number, unknown>, label: number): 'editor' | 'viewer' {
  const value = record.get(label);
  if (value !== 'editor' && value !== 'viewer') throw new Error('invalid-sharing-command');
  return value;
}

function same(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((value, index) => value === right[index]);
}

async function sharingEnvelopes(
  values: unknown,
  input: {
    collectionId: string;
    authorDeviceId: string;
    expectedKind: 'device' | 'recovery';
    expectedEpoch?: number;
    signingPublicKey: Uint8Array;
  },
): Promise<SharingEnvelope[]> {
  if (!Array.isArray(values)) throw new Error('invalid-sharing-command');
  const decoded = await Promise.all(values.map(async (value) => {
    if (!(value instanceof Map) || value.size !== 6) throw new Error('invalid-sharing-command');
    const envelope: SharingEnvelope = {
      recipientId: text(value, 1),
      epochNumber: positiveInteger(value, 2),
      encapsulation: bytes(value, 3, 32),
      ciphertext: bytes(value, 4),
      payload: bytes(value, 5),
      signature: bytes(value, 6, 64),
    };
    if (envelope.ciphertext.byteLength < 16
      || (input.expectedEpoch !== undefined && envelope.epochNumber !== input.expectedEpoch)) {
      throw new Error('invalid-sharing-command');
    }
    const payload = decodeCanonicalCbor(envelope.payload) as Map<number, unknown>;
    if (payload.size !== 8 || payload.get(1) !== 1 || payload.get(2) !== input.collectionId
      || payload.get(3) !== envelope.epochNumber || payload.get(4) !== input.expectedKind
      || payload.get(5) !== envelope.recipientId || payload.get(6) !== input.authorDeviceId
      || !same(bytes(payload, 7, 32), envelope.encapsulation)
      || !same(bytes(payload, 8), envelope.ciphertext)
      || !await verifyProtocolRecord(
        'clipsx/vault/v1/epoch-envelope',
        envelope.payload,
        envelope.signature,
        input.signingPublicKey,
      )) {
      throw new Error('invalid-sharing-command');
    }
    return envelope;
  }));
  if (new Set(decoded.map((entry) => `${entry.recipientId}:${entry.epochNumber}`)).size !== decoded.length) {
    throw new Error('invalid-sharing-command');
  }
  return decoded;
}

export function admitInvitationCreate(
  command: VaultCommand,
  signingPublicKey: Uint8Array,
): InvitationCreate {
  if (command.operationType !== 'invitation-create' || !command.authorDeviceId
    || !command.collectionId || !command.expectedCollectionHead
    || command.expectedCollectionHead.byteLength !== 32) throw new Error('invalid-invitation-create');
  const payload = decodeCanonicalCbor(command.payload) as Map<number, unknown>;
  const expiresAt = text(payload, 5);
  if (payload.size !== 8 || !Number.isFinite(Date.parse(expiresAt))
    || Date.parse(expiresAt) <= Date.now() || !same(bytes(payload, 8, 32), signingPublicKey)) {
    throw new Error('invalid-invitation-create');
  }
  return {
    invitationId: text(payload, 1),
    membershipId: text(payload, 2),
    recipientAccountId: text(payload, 3),
    role: role(payload, 4),
    expiresAt,
    invitationKeyCommitment: bytes(payload, 6, 32),
    verificationCommitment: bytes(payload, 7, 32),
  };
}

export function admitInvitationAccept(
  command: VaultCommand,
  signingPublicKey: Uint8Array,
  encryptionPublicKey: Uint8Array,
): InvitationAccept {
  if (command.operationType !== 'invitation-accept' || !command.authorDeviceId
    || !command.collectionId || !command.expectedCollectionHead
    || command.expectedCollectionHead.byteLength !== 32) throw new Error('invalid-invitation-accept');
  const payload = decodeCanonicalCbor(command.payload) as Map<number, unknown>;
  if (payload.size !== 6 || !same(bytes(payload, 5, 32), signingPublicKey)
    || !same(bytes(payload, 6, 32), encryptionPublicKey)) {
    throw new Error('invalid-invitation-accept');
  }
  return {
    invitationId: text(payload, 1),
    invitationCommandHash: bytes(payload, 2, 32),
    verificationCommitment: bytes(payload, 3, 32),
    transcriptHash: bytes(payload, 4, 32),
  };
}

export function admitInvitationConfirm(command: VaultCommand): InvitationConfirm {
  if (command.operationType !== 'invitation-confirm' || !command.authorDeviceId
    || !command.collectionId || !command.expectedCollectionHead
    || command.expectedCollectionHead.byteLength !== 32) throw new Error('invalid-invitation-confirm');
  const payload = decodeCanonicalCbor(command.payload) as Map<number, unknown>;
  if (payload.size !== 4) throw new Error('invalid-invitation-confirm');
  return {
    invitationId: text(payload, 1),
    acceptanceCommandHash: bytes(payload, 2, 32),
    transcriptHash: bytes(payload, 3, 32),
    verificationCommitment: bytes(payload, 4, 32),
  };
}

async function verifyTransition(
  command: VaultCommand,
  transitionPayload: Uint8Array,
  transitionSignature: Uint8Array,
  transitionHash: Uint8Array,
  signingPublicKey: Uint8Array,
  epochNumber: number,
  reason: 'member-added' | 'member-removed',
  membershipStateHash: Uint8Array,
  recipientSetCommitment: Uint8Array,
) {
  const transition = decodeCanonicalCbor(transitionPayload) as Map<number, unknown>;
  if (bytes(transition, 7).byteLength < 16) throw new Error('invalid-sharing-transition');
  bytes(transition, 8, 12);
  if (transition.size !== 8 || transition.get(1) !== 1 || transition.get(2) !== command.collectionId
    || transition.get(3) !== epochNumber || transition.get(4) !== reason
    || !same(bytes(transition, 5, 32), membershipStateHash)
    || !same(bytes(transition, 6, 32), recipientSetCommitment)
    || !same(await sha256(transitionPayload), transitionHash)
    || !await verifyProtocolRecord(
      'clipsx/vault/v1/epoch-transition',
      transitionPayload,
      transitionSignature,
      signingPublicKey,
    )) {
    throw new Error('invalid-sharing-transition');
  }
}

async function verifyRecipientCommitment(
  commitment: Uint8Array,
  deviceEnvelopes: SharingEnvelope[],
  recoveryEnvelopes: SharingEnvelope[],
) {
  const deviceHashes = await Promise.all(deviceEnvelopes.map((entry) => sha256(entry.payload)));
  const recoveryHashes = await Promise.all(recoveryEnvelopes.map((entry) => sha256(entry.payload)));
  const record = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1],
    [2, deviceHashes.sort(compareBytes)],
    [3, recoveryHashes.sort(compareBytes)],
  ]));
  if (!same(await sha256(record), commitment)) throw new Error('invalid-recipient-commitment');
}

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

export async function admitMemberAdd(
  command: VaultCommand,
  signingPublicKey: Uint8Array,
): Promise<MemberAdd> {
  if (command.operationType !== 'member-add' || !command.authorDeviceId
    || !command.collectionId || !command.expectedCollectionHead
    || command.expectedCollectionHead.byteLength !== 32) throw new Error('invalid-member-add');
  const payload = decodeCanonicalCbor(command.payload) as Map<number, unknown>;
  if (payload.size !== 15) throw new Error('invalid-member-add');
  const joinedEpoch = positiveInteger(payload, 5);
  const historyAccessFromEpoch = positiveInteger(payload, 6);
  if (historyAccessFromEpoch > joinedEpoch) throw new Error('invalid-member-add');
  const result: MemberAdd = {
    invitationId: text(payload, 1),
    membershipId: text(payload, 2),
    recipientAccountId: text(payload, 3),
    role: role(payload, 4),
    joinedEpoch,
    historyAccessFromEpoch,
    membershipStateHash: bytes(payload, 7, 32),
    recipientSetCommitment: bytes(payload, 8, 32),
    encryptedMetadata: bytes(decodeCanonicalCbor(bytes(payload, 9)), 7),
    metadataNonce: bytes(decodeCanonicalCbor(bytes(payload, 9)), 8, 12),
    transitionPayload: bytes(payload, 9),
    transitionSignature: bytes(payload, 10, 64),
    transitionHash: bytes(payload, 11, 32),
    deviceEnvelopes: await sharingEnvelopes(payload.get(12), {
      collectionId: command.collectionId,
      authorDeviceId: command.authorDeviceId,
      expectedKind: 'device',
      expectedEpoch: joinedEpoch,
      signingPublicKey,
    }),
    recoveryEnvelopes: await sharingEnvelopes(payload.get(13), {
      collectionId: command.collectionId,
      authorDeviceId: command.authorDeviceId,
      expectedKind: 'recovery',
      expectedEpoch: joinedEpoch,
      signingPublicKey,
    }),
    historicalDeviceEnvelopes: await sharingEnvelopes(payload.get(14), {
      collectionId: command.collectionId,
      authorDeviceId: command.authorDeviceId,
      expectedKind: 'device',
      signingPublicKey,
    }),
    historicalRecoveryEnvelopes: await sharingEnvelopes(payload.get(15), {
      collectionId: command.collectionId,
      authorDeviceId: command.authorDeviceId,
      expectedKind: 'recovery',
      signingPublicKey,
    }),
  };
  if (result.historicalDeviceEnvelopes.some((entry) => entry.epochNumber < historyAccessFromEpoch
      || entry.epochNumber >= joinedEpoch)
    || result.historicalRecoveryEnvelopes.some((entry) => entry.epochNumber < historyAccessFromEpoch
      || entry.epochNumber >= joinedEpoch)) throw new Error('invalid-member-add');
  await verifyRecipientCommitment(
    result.recipientSetCommitment,
    result.deviceEnvelopes,
    result.recoveryEnvelopes,
  );
  await verifyTransition(
    command,
    result.transitionPayload,
    result.transitionSignature,
    result.transitionHash,
    signingPublicKey,
    joinedEpoch,
    'member-added',
    result.membershipStateHash,
    result.recipientSetCommitment,
  );
  return result;
}

export async function admitMemberRemove(
  command: VaultCommand,
  signingPublicKey: Uint8Array,
): Promise<MemberRemove> {
  if (command.operationType !== 'member-remove' || !command.authorDeviceId
    || !command.collectionId || !command.expectedCollectionHead
    || command.expectedCollectionHead.byteLength !== 32) throw new Error('invalid-member-remove');
  const payload = decodeCanonicalCbor(command.payload) as Map<number, unknown>;
  if (payload.size !== 10) throw new Error('invalid-member-remove');
  const epochNumber = positiveInteger(payload, 3);
  const result: MemberRemove = {
    membershipId: text(payload, 1),
    recipientAccountId: text(payload, 2),
    epochNumber,
    membershipStateHash: bytes(payload, 4, 32),
    recipientSetCommitment: bytes(payload, 5, 32),
    encryptedMetadata: bytes(decodeCanonicalCbor(bytes(payload, 6)), 7),
    metadataNonce: bytes(decodeCanonicalCbor(bytes(payload, 6)), 8, 12),
    transitionPayload: bytes(payload, 6),
    transitionSignature: bytes(payload, 7, 64),
    transitionHash: bytes(payload, 8, 32),
    deviceEnvelopes: await sharingEnvelopes(payload.get(9), {
      collectionId: command.collectionId,
      authorDeviceId: command.authorDeviceId,
      expectedKind: 'device',
      expectedEpoch: epochNumber,
      signingPublicKey,
    }),
    recoveryEnvelopes: await sharingEnvelopes(payload.get(10), {
      collectionId: command.collectionId,
      authorDeviceId: command.authorDeviceId,
      expectedKind: 'recovery',
      expectedEpoch: epochNumber,
      signingPublicKey,
    }),
  };
  await verifyRecipientCommitment(
    result.recipientSetCommitment,
    result.deviceEnvelopes,
    result.recoveryEnvelopes,
  );
  await verifyTransition(
    command,
    result.transitionPayload,
    result.transitionSignature,
    result.transitionHash,
    signingPublicKey,
    epochNumber,
    'member-removed',
    result.membershipStateHash,
    result.recipientSetCommitment,
  );
  return result;
}
