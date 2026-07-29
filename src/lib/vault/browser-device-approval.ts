import { createEpochEnvelope } from './browser-collection-create';
import {
  decodeCanonicalCbor, decodeVaultCommand, encodeCanonicalCbor, importHpkePrivateKey,
  openHpke, sha256, signProtocolRecord, utf8, verifyProtocolRecord, type CborValue,
} from './protocol';

export async function createPendingDeviceRegistrationCommand(input: {
  accountId: string; deviceId: string; displayName: string; platform: string;
  enrollmentOrigin: string;
  protectionProfile: 'webauthn-prf-wrapped' | 'vault-passphrase-wrapped';
  capabilities: Uint8Array; challenge: { id: string; encapsulatedKey: Uint8Array; ciphertext: Uint8Array; expiresAt: string };
  deviceEncryptionPublicKey: Uint8Array; deviceEncryptionSecretKey: Uint8Array;
  deviceSigningPublicKey: Uint8Array; deviceSigningSecretKey: Uint8Array; sasSecret: Uint8Array; operationId?: string;
}): Promise<{ command: Uint8Array; offer: string; sas: string }> {
  if (input.sasSecret.byteLength !== 32) throw new Error('Invalid enrollment SAS secret.');
  const challenge = await openHpke(
    await importHpkePrivateKey(input.deviceEncryptionSecretKey),
    { enc: input.challenge.encapsulatedKey, ciphertext: input.challenge.ciphertext },
    utf8(`clipsx/vault/v1/device-registration-challenge\0${input.accountId}\0${input.challenge.id}`),
  );
  if (challenge.byteLength !== 32 || Date.parse(input.challenge.expiresAt) <= Date.now()) throw new Error('Invalid or expired device challenge.');
  const payload = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, input.deviceId], [2, input.displayName], [3, input.platform], [4, input.enrollmentOrigin],
    [5, input.protectionProfile], [6, await sha256(input.capabilities)], [7, input.deviceEncryptionPublicKey],
    [8, input.deviceSigningPublicKey], [9, 1], [10, input.challenge.id], [11, await sha256(challenge)],
    [12, await sha256(input.sasSecret)],
  ]));
  const unsigned = new Map<number, CborValue>([
    [1, 1], [2, input.operationId ?? crypto.randomUUID()], [3, 'device-register'], [4, input.accountId],
    [5, `device:${input.deviceId}`], [9, payload],
  ]);
  const signed = encodeCanonicalCbor(unsigned);
  unsigned.set(10, await signProtocolRecord('clipsx/vault/v1/command/device-register', signed, input.deviceSigningSecretKey));
  const command = encodeCanonicalCbor(unsigned);
  const offerBytes = encodeCanonicalCbor(new Map<number, CborValue>([[1, 1], [2, command], [3, input.sasSecret]]));
  return { command, offer: toBase64Url(offerBytes), sas: await shortAuthenticationString(input.sasSecret, await sha256(command)) };
}

export async function decodePendingDeviceOffer(offer: string, accountId: string) {
  const record = decodeCanonicalCbor(fromBase64Url(offer.trim()));
  const commandBytes = record.get(2); const sasSecret = record.get(3);
  if (record.size !== 3 || record.get(1) !== 1 || !(commandBytes instanceof Uint8Array) || !(sasSecret instanceof Uint8Array) || sasSecret.byteLength !== 32) throw new Error('Invalid enrollment QR.');
  const command = decodeVaultCommand(commandBytes);
  const payload = decodeCanonicalCbor(command.payload);
  const deviceId = payload.get(1); const encryptionPublicKey = payload.get(7); const signingPublicKey = payload.get(8); const sasCommitment = payload.get(12);
  if (command.accountId !== accountId || command.operationType !== 'device-register' || command.authorDeviceId !== deviceId
    || typeof deviceId !== 'string' || !(encryptionPublicKey instanceof Uint8Array) || encryptionPublicKey.byteLength !== 32
    || !(signingPublicKey instanceof Uint8Array) || signingPublicKey.byteLength !== 32 || !(sasCommitment instanceof Uint8Array)
    || !same(await sha256(sasSecret), sasCommitment)
    || !await verifyProtocolRecord('clipsx/vault/v1/command/device-register', command.signedBytes, command.signature, signingPublicKey)) throw new Error('Unverified enrollment QR.');
  return { deviceId, encryptionPublicKey, pendingCommandHash: await sha256(command.signedBytes), sasCommitment, sas: await shortAuthenticationString(sasSecret, await sha256(commandBytes)) };
}

export async function createDeviceAuthorizationCommand(input: {
  accountId: string; authorDeviceId: string; expectedAccountHead: Uint8Array; deviceSigningSecretKey: Uint8Array;
  offer: string; epochs: Array<{ collectionId: string; epochNumber: number; key: Uint8Array }>; operationId?: string;
}) {
  const target = await decodePendingDeviceOffer(input.offer, input.accountId);
  const envelopes = await Promise.all(input.epochs.map(async (epoch) => {
    const envelope = await createEpochEnvelope({
      collectionId: epoch.collectionId, epochNumber: epoch.epochNumber, recipientKind: 'device',
      recipientId: target.deviceId, senderId: input.authorDeviceId,
      recipientEncryptionPublicKey: target.encryptionPublicKey, epochKey: epoch.key,
      signingSecretKey: input.deviceSigningSecretKey,
    });
    const decoded = decodeCanonicalCbor(envelope.payload);
    return new Map<number, CborValue>([[1, epoch.collectionId], [2, epoch.epochNumber], [3, decoded.get(7)!], [4, decoded.get(8)!], [5, envelope.payload], [6, envelope.signature]]);
  }));
  const payload = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, target.deviceId], [2, 'qr-sas'], [3, target.sasCommitment], [4, target.pendingCommandHash], [5, envelopes],
  ]));
  const unsigned = new Map<number, CborValue>([
    [1, 1], [2, input.operationId ?? crypto.randomUUID()], [3, 'device-authorize'], [4, input.accountId],
    [5, `device:${input.authorDeviceId}`], [7, input.expectedAccountHead], [9, payload],
  ]);
  const signed = encodeCanonicalCbor(unsigned);
  unsigned.set(10, await signProtocolRecord('clipsx/vault/v1/command/device-authorize', signed, input.deviceSigningSecretKey));
  return { command: encodeCanonicalCbor(unsigned), deviceId: target.deviceId, sas: target.sas };
}

async function shortAuthenticationString(secret: Uint8Array, commandHash: Uint8Array) {
  const digest = await sha256(new Uint8Array([...secret, ...commandHash]));
  const number = ((digest[0] << 16) | (digest[1] << 8) | digest[2]) % 1_000_000;
  return number.toString().padStart(6, '0').replace(/(...)(...)/, '$1 $2');
}
function same(a: Uint8Array, b: Uint8Array) { return a.byteLength === b.byteLength && a.every((v, i) => v === b[i]); }
function toBase64Url(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''); }
function fromBase64Url(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}
