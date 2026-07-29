import { createEpochEnvelope } from './browser-collection-create';
import {
  concatBytes,
  decodeCanonicalCbor,
  decodeVaultCommand,
  encodeCanonicalCbor,
  randomBytes,
  sha256,
  signProtocolRecord,
  utf8,
  verifyProtocolRecord,
  type CborValue,
} from './protocol';

export type VaultMemberRole = 'owner' | 'editor' | 'viewer';
export type SharingRecipient = {
  kind: 'device' | 'recovery';
  id: string;
  accountId: string;
  encryptionPublicKey: Uint8Array;
};
export type SharingMembership = {
  membershipId: string;
  accountId: string;
  role: VaultMemberRole;
};
export type HistoricalEpoch = { epochNumber: number; key: Uint8Array };

function same(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((value, index) => value === right[index]);
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
    + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function commitment(label: string, value: Uint8Array): Promise<Uint8Array> {
  return sha256(concatBytes(utf8(label), new Uint8Array([0]), value));
}

async function invitationSas(secret: Uint8Array, command: Uint8Array): Promise<string> {
  const digest = await sha256(concatBytes(
    utf8('clipsx/vault/v1/invitation-sas'),
    new Uint8Array([0]),
    secret,
    await sha256(command),
  ));
  let number = BigInt(0);
  for (let index = 0; index < 8; index += 1) number = number * BigInt(256) + BigInt(digest[index]);
  return (number % BigInt('100000000000000000000')).toString().padStart(20, '0')
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

function commandRecord(input: {
  operationId?: string;
  operationType: 'invitation-create' | 'invitation-accept' | 'invitation-confirm' | 'member-add' | 'member-remove';
  accountId: string;
  deviceId: string;
  collectionId: string;
  expectedCollectionHead: Uint8Array;
  payload: Uint8Array;
}): Map<number, CborValue> {
  if (input.expectedCollectionHead.byteLength !== 32) throw new Error('Collection head must be 32 bytes.');
  return new Map<number, CborValue>([
    [1, 1],
    [2, input.operationId ?? crypto.randomUUID()],
    [3, input.operationType],
    [4, input.accountId],
    [5, `device:${input.deviceId}`],
    [6, input.collectionId],
    [8, input.expectedCollectionHead],
    [9, input.payload],
  ]);
}

async function signCommand(
  record: Map<number, CborValue>,
  operationType: string,
  signingSecretKey: Uint8Array,
): Promise<Uint8Array> {
  const signed = encodeCanonicalCbor(record);
  record.set(10, await signProtocolRecord(
    `clipsx/vault/v1/command/${operationType}`,
    signed,
    signingSecretKey,
  ));
  return encodeCanonicalCbor(record);
}

export async function createVerifiedInvitationCommand(input: {
  accountId: string;
  deviceId: string;
  deviceSigningPublicKey: Uint8Array;
  deviceSigningSecretKey: Uint8Array;
  collectionId: string;
  expectedCollectionHead: Uint8Array;
  recipientAccountId: string;
  role: 'editor' | 'viewer';
  expiresAt: string;
  invitationId?: string;
  membershipId?: string;
  operationId?: string;
  invitationSecret?: Uint8Array;
}) {
  const invitationId = input.invitationId ?? crypto.randomUUID();
  const membershipId = input.membershipId ?? crypto.randomUUID();
  const invitationSecret = input.invitationSecret?.slice() ?? randomBytes(32);
  if (invitationSecret.byteLength !== 32 || input.recipientAccountId === input.accountId
    || input.deviceSigningPublicKey.byteLength !== 32 || Date.parse(input.expiresAt) <= Date.now()) {
    throw new Error('Invalid verified invitation.');
  }
  const invitationKeyCommitment = await commitment(
    'clipsx/vault/v1/invitation-secret',
    invitationSecret,
  );
  const verificationRecord = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1],
    [2, invitationId],
    [3, input.collectionId],
    [4, input.accountId],
    [5, input.deviceId],
    [6, input.recipientAccountId],
    [7, input.role],
    [8, input.expiresAt],
    [9, invitationSecret],
  ]));
  const verificationCommitment = await commitment(
    'clipsx/vault/v1/invitation-verification',
    verificationRecord,
  );
  const payload = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, invitationId],
    [2, membershipId],
    [3, input.recipientAccountId],
    [4, input.role],
    [5, input.expiresAt],
    [6, invitationKeyCommitment],
    [7, verificationCommitment],
    [8, input.deviceSigningPublicKey],
  ]));
  const command = await signCommand(commandRecord({
    operationId: input.operationId,
    operationType: 'invitation-create',
    accountId: input.accountId,
    deviceId: input.deviceId,
    collectionId: input.collectionId,
    expectedCollectionHead: input.expectedCollectionHead,
    payload,
  }), 'invitation-create', input.deviceSigningSecretKey);
  const offer = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1],
    [2, command],
    [3, invitationSecret],
  ]));
  return {
    invitationId,
    membershipId,
    command,
    invitationSecret,
    fragment: `#vault-invite=${toBase64Url(offer)}`,
    sas: await invitationSas(invitationSecret, command),
  };
}

export async function decodeVerifiedInvitationFragment(
  fragment: string,
  expectedRecipientAccountId: string,
) {
  const encoded = fragment.includes('vault-invite=')
    ? fragment.slice(fragment.indexOf('vault-invite=') + 'vault-invite='.length).split('&', 1)[0]
    : fragment;
  const offer = decodeCanonicalCbor(fromBase64Url(encoded));
  const commandBytes = offer.get(2);
  const invitationSecret = offer.get(3);
  if (offer.size !== 3 || offer.get(1) !== 1 || !(commandBytes instanceof Uint8Array)
    || !(invitationSecret instanceof Uint8Array) || invitationSecret.byteLength !== 32) {
    throw new Error('Invalid invitation fragment.');
  }
  const command = decodeVaultCommand(commandBytes);
  const payload = decodeCanonicalCbor(command.payload);
  const signingPublicKey = payload.get(8);
  if (command.operationType !== 'invitation-create' || !command.collectionId
    || !(signingPublicKey instanceof Uint8Array) || signingPublicKey.byteLength !== 32
    || !await verifyProtocolRecord(
      'clipsx/vault/v1/command/invitation-create',
      command.signedBytes,
      command.signature,
      signingPublicKey,
    )
    || payload.get(3) !== expectedRecipientAccountId
    || typeof payload.get(5) !== 'string' || Date.parse(payload.get(5) as string) <= Date.now()
    || !(payload.get(6) instanceof Uint8Array)
    || !same(
      await commitment('clipsx/vault/v1/invitation-secret', invitationSecret),
      payload.get(6) as Uint8Array,
    )) {
    throw new Error('Unverified or expired invitation fragment.');
  }
  const verificationRecord = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1],
    [2, payload.get(1) as string],
    [3, command.collectionId],
    [4, command.accountId],
    [5, command.authorDeviceId as string],
    [6, expectedRecipientAccountId],
    [7, payload.get(4) as 'editor' | 'viewer'],
    [8, payload.get(5) as string],
    [9, invitationSecret],
  ]));
  if (!(payload.get(7) instanceof Uint8Array) || !same(
    await commitment('clipsx/vault/v1/invitation-verification', verificationRecord),
    payload.get(7) as Uint8Array,
  )) throw new Error('Invitation transcript commitment mismatch.');
  return {
    command: commandBytes,
    invitationSecret,
    invitationId: payload.get(1) as string,
    membershipId: payload.get(2) as string,
    collectionId: command.collectionId,
    inviterAccountId: command.accountId,
    inviterDeviceId: command.authorDeviceId as string,
    recipientAccountId: expectedRecipientAccountId,
    role: payload.get(4) as 'editor' | 'viewer',
    expiresAt: payload.get(5) as string,
    verificationCommitment: payload.get(7) as Uint8Array,
    invitationCommandHash: await sha256(commandBytes),
    sas: await invitationSas(invitationSecret, commandBytes),
  };
}

async function acceptanceTranscript(input: {
  invitationCommandHash: Uint8Array;
  invitationSecret: Uint8Array;
  recipientAccountId: string;
  recipientDeviceId: string;
  recipientSigningPublicKey: Uint8Array;
  recipientEncryptionPublicKey: Uint8Array;
}) {
  return encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1],
    [2, input.invitationCommandHash],
    [3, input.recipientAccountId],
    [4, input.recipientDeviceId],
    [5, input.recipientSigningPublicKey],
    [6, input.recipientEncryptionPublicKey],
    [7, input.invitationSecret],
  ]));
}

export async function createInvitationAcceptanceCommand(input: {
  fragment: string;
  recipientAccountId: string;
  recipientDeviceId: string;
  recipientSigningPublicKey: Uint8Array;
  recipientEncryptionPublicKey: Uint8Array;
  recipientSigningSecretKey: Uint8Array;
  expectedCollectionHead?: Uint8Array;
  operationId?: string;
}) {
  const invitation = await decodeVerifiedInvitationFragment(input.fragment, input.recipientAccountId);
  const transcriptHash = await commitment(
    'clipsx/vault/v1/invitation-acceptance-transcript',
    await acceptanceTranscript({
      invitationCommandHash: invitation.invitationCommandHash,
      invitationSecret: invitation.invitationSecret,
      recipientAccountId: input.recipientAccountId,
      recipientDeviceId: input.recipientDeviceId,
      recipientSigningPublicKey: input.recipientSigningPublicKey,
      recipientEncryptionPublicKey: input.recipientEncryptionPublicKey,
    }),
  );
  const payload = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, invitation.invitationId],
    [2, invitation.invitationCommandHash],
    [3, invitation.verificationCommitment],
    [4, transcriptHash],
    [5, input.recipientSigningPublicKey],
    [6, input.recipientEncryptionPublicKey],
  ]));
  const command = await signCommand(commandRecord({
    operationId: input.operationId,
    operationType: 'invitation-accept',
    accountId: input.recipientAccountId,
    deviceId: input.recipientDeviceId,
    collectionId: invitation.collectionId,
    expectedCollectionHead: input.expectedCollectionHead ?? invitation.invitationCommandHash,
    payload,
  }), 'invitation-accept', input.recipientSigningSecretKey);
  return { command, transcriptHash, invitation, sas: invitation.sas };
}

export async function createInvitationConfirmationCommand(input: {
  invitationCommand: Uint8Array;
  invitationSecret: Uint8Array;
  acceptanceCommand: Uint8Array;
  inviterAccountId: string;
  inviterDeviceId: string;
  inviterSigningSecretKey: Uint8Array;
  expectedCollectionHead?: Uint8Array;
  operationId?: string;
}) {
  const invitation = decodeVaultCommand(input.invitationCommand);
  const invitationPayload = decodeCanonicalCbor(invitation.payload);
  const acceptance = decodeVaultCommand(input.acceptanceCommand);
  const acceptancePayload = decodeCanonicalCbor(acceptance.payload);
  const inviterSigningPublicKey = invitationPayload.get(8);
  const recipientSigningPublicKey = acceptancePayload.get(5);
  const recipientEncryptionPublicKey = acceptancePayload.get(6);
  if (invitation.operationType !== 'invitation-create' || acceptance.operationType !== 'invitation-accept'
    || invitation.accountId !== input.inviterAccountId || invitation.authorDeviceId !== input.inviterDeviceId
    || invitation.collectionId !== acceptance.collectionId
    || acceptancePayload.get(1) !== invitationPayload.get(1)
    || !(inviterSigningPublicKey instanceof Uint8Array)
    || !(recipientSigningPublicKey instanceof Uint8Array)
    || !(recipientEncryptionPublicKey instanceof Uint8Array)
    || !await verifyProtocolRecord(
      'clipsx/vault/v1/command/invitation-create',
      invitation.signedBytes,
      invitation.signature,
      inviterSigningPublicKey,
    )
    || !await verifyProtocolRecord(
      'clipsx/vault/v1/command/invitation-accept',
      acceptance.signedBytes,
      acceptance.signature,
      recipientSigningPublicKey,
    )) throw new Error('Invalid invitation acceptance.');
  const invitationCommandHash = await sha256(input.invitationCommand);
  const expectedTranscriptHash = await commitment(
    'clipsx/vault/v1/invitation-acceptance-transcript',
    await acceptanceTranscript({
      invitationCommandHash,
      invitationSecret: input.invitationSecret,
      recipientAccountId: acceptance.accountId,
      recipientDeviceId: acceptance.authorDeviceId as string,
      recipientSigningPublicKey,
      recipientEncryptionPublicKey,
    }),
  );
  if (!(acceptancePayload.get(4) instanceof Uint8Array)
    || !(invitationPayload.get(7) instanceof Uint8Array)
    || !(acceptancePayload.get(3) instanceof Uint8Array)
    || !same(expectedTranscriptHash, acceptancePayload.get(4) as Uint8Array)
    || !same(invitationCommandHash, acceptancePayload.get(2) as Uint8Array)
    || !same(invitationPayload.get(7) as Uint8Array, acceptancePayload.get(3) as Uint8Array)) {
    throw new Error('Invitation acceptance transcript mismatch.');
  }
  const acceptanceCommandHash = await sha256(input.acceptanceCommand);
  const payload = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, invitationPayload.get(1) as string],
    [2, acceptanceCommandHash],
    [3, expectedTranscriptHash],
    [4, invitationPayload.get(7) as Uint8Array],
  ]));
  const command = await signCommand(commandRecord({
    operationId: input.operationId,
    operationType: 'invitation-confirm',
    accountId: input.inviterAccountId,
    deviceId: input.inviterDeviceId,
    collectionId: invitation.collectionId as string,
    expectedCollectionHead: input.expectedCollectionHead ?? acceptanceCommandHash,
    payload,
  }), 'invitation-confirm', input.inviterSigningSecretKey);
  return { command, transcriptHash: expectedTranscriptHash, sas: await invitationSas(input.invitationSecret, input.invitationCommand) };
}

async function createEnvelopeMaps(input: {
  collectionId: string;
  epoch: HistoricalEpoch;
  recipients: SharingRecipient[];
  senderDeviceId: string;
  signingSecretKey: Uint8Array;
}) {
  return Promise.all(input.recipients.map(async (recipient) => {
    const envelope = await createEpochEnvelope({
      collectionId: input.collectionId,
      epochNumber: input.epoch.epochNumber,
      recipientKind: recipient.kind,
      recipientId: recipient.id,
      senderId: input.senderDeviceId,
      recipientEncryptionPublicKey: recipient.encryptionPublicKey,
      epochKey: input.epoch.key,
      signingSecretKey: input.signingSecretKey,
    });
    const decoded = decodeCanonicalCbor(envelope.payload);
    return new Map<number, CborValue>([
      [1, recipient.id],
      [2, input.epoch.epochNumber],
      [3, decoded.get(7)!],
      [4, decoded.get(8)!],
      [5, envelope.payload],
      [6, envelope.signature],
    ]);
  }));
}

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

async function recipientCommitment(device: Map<number, CborValue>[], recovery: Map<number, CborValue>[]) {
  const deviceHashes = await Promise.all(device.map((entry) => sha256(entry.get(5) as Uint8Array)));
  const recoveryHashes = await Promise.all(recovery.map((entry) => sha256(entry.get(5) as Uint8Array)));
  return sha256(encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1],
    [2, deviceHashes.sort(compareBytes)],
    [3, recoveryHashes.sort(compareBytes)],
  ])));
}

async function membershipCommitment(
  collectionId: string,
  epochNumber: number,
  memberships: SharingMembership[],
) {
  const sorted = [...memberships].sort((left, right) => left.membershipId.localeCompare(right.membershipId));
  return sha256(encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1],
    [2, collectionId],
    [3, epochNumber],
    [4, sorted.map((entry) => new Map<number, CborValue>([
      [1, entry.membershipId],
      [2, entry.accountId],
      [3, entry.role],
      [4, 'active'],
    ]))],
  ])));
}

async function rotation(input: {
  collectionId: string;
  epochNumber: number;
  reason: 'member-added' | 'member-removed';
  memberships: SharingMembership[];
  recipients: SharingRecipient[];
  senderDeviceId: string;
  signingSecretKey: Uint8Array;
}) {
  const epochKey = randomBytes(32);
  const epoch = { epochNumber: input.epochNumber, key: epochKey };
  const deviceEnvelopes = await createEnvelopeMaps({
    collectionId: input.collectionId,
    epoch,
    recipients: input.recipients.filter((recipient) => recipient.kind === 'device'),
    senderDeviceId: input.senderDeviceId,
    signingSecretKey: input.signingSecretKey,
  });
  const recoveryEnvelopes = await createEnvelopeMaps({
    collectionId: input.collectionId,
    epoch,
    recipients: input.recipients.filter((recipient) => recipient.kind === 'recovery'),
    senderDeviceId: input.senderDeviceId,
    signingSecretKey: input.signingSecretKey,
  });
  const membershipStateHash = await membershipCommitment(
    input.collectionId,
    input.epochNumber,
    input.memberships,
  );
  const recipientSetCommitment = await recipientCommitment(deviceEnvelopes, recoveryEnvelopes);
  const transitionPayload = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, 1],
    [2, input.collectionId],
    [3, input.epochNumber],
    [4, input.reason],
    [5, membershipStateHash],
    [6, recipientSetCommitment],
  ]));
  return {
    epochKey,
    membershipStateHash,
    recipientSetCommitment,
    transitionPayload,
    transitionSignature: await signProtocolRecord(
      'clipsx/vault/v1/epoch-transition',
      transitionPayload,
      input.signingSecretKey,
    ),
    transitionHash: await sha256(transitionPayload),
    deviceEnvelopes,
    recoveryEnvelopes,
  };
}

export async function createMemberAddCommand(input: {
  accountId: string;
  deviceId: string;
  deviceSigningSecretKey: Uint8Array;
  collectionId: string;
  expectedCollectionHead: Uint8Array;
  invitationId: string;
  membershipId: string;
  recipientAccountId: string;
  role: 'editor' | 'viewer';
  joinedEpoch: number;
  memberships: SharingMembership[];
  recipients: SharingRecipient[];
  historicalEpochs?: HistoricalEpoch[];
  historyAccessFromEpoch?: number;
  operationId?: string;
}) {
  const historyAccessFromEpoch = input.historyAccessFromEpoch ?? input.joinedEpoch;
  const historicalEpochs = input.historicalEpochs ?? [];
  if (historyAccessFromEpoch > input.joinedEpoch
    || (historyAccessFromEpoch === input.joinedEpoch && historicalEpochs.length !== 0)
    || historicalEpochs.some((epoch) => epoch.epochNumber < historyAccessFromEpoch
      || epoch.epochNumber >= input.joinedEpoch)
    || new Set(historicalEpochs.map((epoch) => epoch.epochNumber)).size !== historicalEpochs.length) {
    throw new Error('Historical access must be explicit and contiguous with the selected boundary.');
  }
  const expectedHistorical = Array.from(
    { length: input.joinedEpoch - historyAccessFromEpoch },
    (_, index) => historyAccessFromEpoch + index,
  );
  if (expectedHistorical.some((epoch, index) => historicalEpochs[index]?.epochNumber !== epoch)) {
    throw new Error('Every selected historical epoch key is required.');
  }
  const rotated = await rotation({
    collectionId: input.collectionId,
    epochNumber: input.joinedEpoch,
    reason: 'member-added',
    memberships: input.memberships,
    recipients: input.recipients,
    senderDeviceId: input.deviceId,
    signingSecretKey: input.deviceSigningSecretKey,
  });
  const historicalRecipients = input.recipients.filter(
    (recipient) => recipient.accountId === input.recipientAccountId,
  );
  const historicalMaps = (await Promise.all(historicalEpochs.map((epoch) => createEnvelopeMaps({
    collectionId: input.collectionId,
    epoch,
    recipients: historicalRecipients,
    senderDeviceId: input.deviceId,
    signingSecretKey: input.deviceSigningSecretKey,
  })))).flat();
  const payload = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, input.invitationId],
    [2, input.membershipId],
    [3, input.recipientAccountId],
    [4, input.role],
    [5, input.joinedEpoch],
    [6, historyAccessFromEpoch],
    [7, rotated.membershipStateHash],
    [8, rotated.recipientSetCommitment],
    [9, rotated.transitionPayload],
    [10, rotated.transitionSignature],
    [11, rotated.transitionHash],
    [12, rotated.deviceEnvelopes],
    [13, rotated.recoveryEnvelopes],
    [14, historicalMaps.filter((entry) => historicalRecipients.find(
      (recipient) => recipient.kind === 'device' && recipient.id === entry.get(1),
    ))],
    [15, historicalMaps.filter((entry) => historicalRecipients.find(
      (recipient) => recipient.kind === 'recovery' && recipient.id === entry.get(1),
    ))],
  ]));
  const command = await signCommand(commandRecord({
    operationId: input.operationId,
    operationType: 'member-add',
    accountId: input.accountId,
    deviceId: input.deviceId,
    collectionId: input.collectionId,
    expectedCollectionHead: input.expectedCollectionHead,
    payload,
  }), 'member-add', input.deviceSigningSecretKey);
  return { command, epochKey: rotated.epochKey };
}

export async function createMemberRemoveCommand(input: {
  accountId: string;
  deviceId: string;
  deviceSigningSecretKey: Uint8Array;
  collectionId: string;
  expectedCollectionHead: Uint8Array;
  membershipId: string;
  removedAccountId: string;
  epochNumber: number;
  memberships: SharingMembership[];
  recipients: SharingRecipient[];
  operationId?: string;
}) {
  if (input.recipients.some((recipient) => recipient.accountId === input.removedAccountId)
    || input.memberships.some((membership) => membership.accountId === input.removedAccountId)) {
    throw new Error('Removed members cannot receive the replacement epoch.');
  }
  const rotated = await rotation({
    collectionId: input.collectionId,
    epochNumber: input.epochNumber,
    reason: 'member-removed',
    memberships: input.memberships,
    recipients: input.recipients,
    senderDeviceId: input.deviceId,
    signingSecretKey: input.deviceSigningSecretKey,
  });
  const payload = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, input.membershipId],
    [2, input.removedAccountId],
    [3, input.epochNumber],
    [4, rotated.membershipStateHash],
    [5, rotated.recipientSetCommitment],
    [6, rotated.transitionPayload],
    [7, rotated.transitionSignature],
    [8, rotated.transitionHash],
    [9, rotated.deviceEnvelopes],
    [10, rotated.recoveryEnvelopes],
  ]));
  const command = await signCommand(commandRecord({
    operationId: input.operationId,
    operationType: 'member-remove',
    accountId: input.accountId,
    deviceId: input.deviceId,
    collectionId: input.collectionId,
    expectedCollectionHead: input.expectedCollectionHead,
    payload,
  }), 'member-remove', input.deviceSigningSecretKey);
  return { command, epochKey: rotated.epochKey };
}
