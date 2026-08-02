import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';

import {
  createInvitationAcceptanceCommand,
  createInvitationConfirmationCommand,
  createMemberAddCommand,
  createMemberRemoveCommand,
  createVerifiedInvitationCommand,
  decodeVerifiedInvitationFragment,
} from './browser-collection-sharing';
import { admitVaultCommand } from './command-admission';
import { decodeVaultCommand, sha256 } from './protocol';
import {
  admitInvitationAccept,
  admitInvitationConfirm,
  admitInvitationCreate,
  admitMemberAdd,
  admitMemberRemove,
} from './sharing-command-admission';

const head = (value: number) => new Uint8Array(32).fill(value);

describe('verified collection sharing', () => {
  it('keeps the invitation secret in the URL fragment and binds both device keys into acceptance', async () => {
    const inviter = ed25519.keygen(new Uint8Array(32).fill(1));
    const recipient = ed25519.keygen(new Uint8Array(32).fill(2));
    const recipientEncryption = x25519.keygen(new Uint8Array(32).fill(3));
    const secret = new Uint8Array(32).fill(99);
    const invitation = await createVerifiedInvitationCommand({
      accountId: 'inviter-account',
      deviceId: 'inviter-device',
      deviceSigningPublicKey: inviter.publicKey,
      deviceSigningSecretKey: inviter.secretKey,
      collectionId: 'collection-1',
      expectedAccountHead: head(3),
      expectedCollectionHead: head(4),
      recipientAccountId: 'recipient-account',
      role: 'viewer',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      invitationId: 'invitation-1',
      membershipId: 'membership-1',
      operationId: 'invite-operation',
      invitationSecret: secret,
    });
    expect(contains(invitation.command, secret)).toBe(false);
    expect(invitation.fragment).toContain('#vault-invite=');
    expect(invitation.sas).toMatch(/^\d{4}( \d{4}){4}$/);

    const decoded = await decodeVerifiedInvitationFragment(
      invitation.fragment,
      'recipient-account',
    );
    expect(decoded.invitationId).toBe('invitation-1');
    const createCommand = decodeVaultCommand(invitation.command);
    expect(admitInvitationCreate(createCommand, inviter.publicKey)).toMatchObject({
      membershipId: 'membership-1',
      role: 'viewer',
    });

    const acceptance = await createInvitationAcceptanceCommand({
      fragment: invitation.fragment,
      recipientAccountId: 'recipient-account',
      recipientDeviceId: 'recipient-device',
      recipientSigningPublicKey: recipient.publicKey,
      recipientEncryptionPublicKey: recipientEncryption.publicKey,
      recipientSigningSecretKey: recipient.secretKey,
      expectedAccountHead: head(5),
      operationId: 'accept-operation',
    });
    const accepted = await admitVaultCommand(
      acceptance.command,
      { id: 'recipient-account' },
      {
        findActiveDevice: async () => ({
          signingPublicKey: recipient.publicKey,
        }),
        findActiveRecoveryKey: async () => null,
      },
    );
    expect(admitInvitationAccept(
      accepted.command,
      recipient.publicKey,
      recipientEncryption.publicKey,
    )).toMatchObject({ invitationId: 'invitation-1' });

    const confirmation = await createInvitationConfirmationCommand({
      invitationCommand: invitation.command,
      invitationSecret: secret,
      acceptanceCommand: acceptance.command,
      inviterAccountId: 'inviter-account',
      inviterDeviceId: 'inviter-device',
      inviterSigningSecretKey: inviter.secretKey,
      operationId: 'confirm-operation',
    });
    expect(admitInvitationConfirm(decodeVaultCommand(confirmation.command))).toMatchObject({
      invitationId: 'invitation-1',
    });
    await expect(createInvitationConfirmationCommand({
      invitationCommand: invitation.command,
      invitationSecret: head(55),
      acceptanceCommand: acceptance.command,
      inviterAccountId: 'inviter-account',
      inviterDeviceId: 'inviter-device',
      inviterSigningSecretKey: inviter.secretKey,
    })).rejects.toThrow('transcript mismatch');
  });

  it('rotates on activation with joining-epoch-only history by default', async () => {
    const signer = ed25519.keygen(new Uint8Array(32).fill(10));
    const ownerDevice = x25519.keygen(new Uint8Array(32).fill(11));
    const ownerRecovery = x25519.keygen(new Uint8Array(32).fill(12));
    const recipientDevice = x25519.keygen(new Uint8Array(32).fill(13));
    const recipientRecovery = x25519.keygen(new Uint8Array(32).fill(14));
    const result = await createMemberAddCommand({
      accountId: 'owner-account',
      deviceId: 'owner-device',
      deviceSigningSecretKey: signer.secretKey,
      collectionId: 'collection-1',
      expectedAccountHead: head(14),
      expectedCollectionHead: head(15),
      invitationId: 'invitation-1',
      membershipId: 'recipient-membership',
      recipientAccountId: 'recipient-account',
      role: 'editor',
      joinedEpoch: 2,
      memberships: [
        { membershipId: 'owner-membership', accountId: 'owner-account', role: 'owner' },
        { membershipId: 'recipient-membership', accountId: 'recipient-account', role: 'editor' },
      ],
      recipients: [
        { kind: 'device', id: 'owner-device', accountId: 'owner-account', encryptionPublicKey: ownerDevice.publicKey },
        { kind: 'recovery', id: 'owner-recovery', accountId: 'owner-account', encryptionPublicKey: ownerRecovery.publicKey },
        { kind: 'device', id: 'recipient-device', accountId: 'recipient-account', encryptionPublicKey: recipientDevice.publicKey },
        { kind: 'recovery', id: 'recipient-recovery', accountId: 'recipient-account', encryptionPublicKey: recipientRecovery.publicKey },
      ],
      operationId: 'member-add-operation',
    });
    const admitted = await admitMemberAdd(decodeVaultCommand(result.command), signer.publicKey);
    expect(admitted.historyAccessFromEpoch).toBe(2);
    expect(admitted.deviceEnvelopes).toHaveLength(2);
    expect(admitted.recoveryEnvelopes).toHaveLength(2);
    expect(admitted.historicalDeviceEnvelopes).toHaveLength(0);
    expect(admitted.historicalRecoveryEnvelopes).toHaveLength(0);
    expect(result.epochKey).toHaveLength(32);
  });

  it('excludes a removed account from the replacement epoch', async () => {
    const signer = ed25519.keygen(new Uint8Array(32).fill(20));
    const ownerDevice = x25519.keygen(new Uint8Array(32).fill(21));
    const ownerRecovery = x25519.keygen(new Uint8Array(32).fill(22));
    const result = await createMemberRemoveCommand({
      accountId: 'owner-account',
      deviceId: 'owner-device',
      deviceSigningSecretKey: signer.secretKey,
      collectionId: 'collection-1',
      expectedAccountHead: head(22),
      expectedCollectionHead: head(23),
      membershipId: 'removed-membership',
      removedAccountId: 'removed-account',
      epochNumber: 3,
      memberships: [
        { membershipId: 'owner-membership', accountId: 'owner-account', role: 'owner' },
      ],
      recipients: [
        { kind: 'device', id: 'owner-device', accountId: 'owner-account', encryptionPublicKey: ownerDevice.publicKey },
        { kind: 'recovery', id: 'owner-recovery', accountId: 'owner-account', encryptionPublicKey: ownerRecovery.publicKey },
      ],
      operationId: 'member-remove-operation',
    });
    const admitted = await admitMemberRemove(decodeVaultCommand(result.command), signer.publicKey);
    expect(admitted.recipientAccountId).toBe('removed-account');
    expect(admitted.deviceEnvelopes.map((entry) => entry.recipientId)).toEqual(['owner-device']);
    await expect(createMemberRemoveCommand({
      accountId: 'owner-account',
      deviceId: 'owner-device',
      deviceSigningSecretKey: signer.secretKey,
      collectionId: 'collection-1',
      expectedAccountHead: await sha256(result.command),
      expectedCollectionHead: await sha256(result.command),
      membershipId: 'removed-membership',
      removedAccountId: 'removed-account',
      epochNumber: 4,
      memberships: [
        { membershipId: 'removed-membership', accountId: 'removed-account', role: 'viewer' },
      ],
      recipients: [],
    })).rejects.toThrow('cannot receive');
  });
});

function contains(haystack: Uint8Array, needle: Uint8Array): boolean {
  return haystack.some((_, start) => needle.every((value, offset) => haystack[start + offset] === value));
}
