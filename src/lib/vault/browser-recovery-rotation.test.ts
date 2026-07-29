import { ed25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';

import { admitRecoveryRotation, admitVaultCommand } from './command-admission';
import { createRecoveryRootRotationCommand } from './browser-recovery-rotation';

describe('recovery root rotation', () => {
  it('requires a recovery command and active-device co-signature over replacement envelopes', async () => {
    const oldRoot = ed25519.keygen(new Uint8Array(32).fill(1));
    const newRoot = ed25519.keygen(new Uint8Array(32).fill(2));
    const device = ed25519.keygen(new Uint8Array(32).fill(3));
    const commandBytes = await createRecoveryRootRotationCommand({
      accountId: 'account-1', oldRecoveryKeyId: 'old-root', oldRecoverySigningSecretKey: oldRoot.secretKey,
      newRecoveryKeyId: 'new-root', newRecoveryEncryptionPublicKey: new Uint8Array(32).fill(4), newRecoverySigningPublicKey: newRoot.publicKey, newRecoverySigningSecretKey: newRoot.secretKey,
      activeDeviceId: 'device-1', activeDeviceSigningSecretKey: device.secretKey, expectedAccountHead: new Uint8Array(32).fill(5),
      epochs: [{ collectionId: 'collection-1', epochNumber: 1, key: new Uint8Array(32).fill(6) }], operationId: 'operation-1',
    });
    const admitted = await admitVaultCommand(commandBytes, { id: 'account-1', sessionId: 'session-1' }, {
      findActiveDevice: async () => null, findActiveRecoveryKey: async () => oldRoot.publicKey,
    });
    await expect(admitRecoveryRotation(admitted.command, device.publicKey)).resolves.toMatchObject({ newRecoveryKeyId: 'new-root', activeDeviceId: 'device-1' });
    await expect(admitRecoveryRotation(admitted.command, oldRoot.publicKey)).rejects.toThrow('invalid-recovery-rotation');
  });
});
