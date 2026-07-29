import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';

import { admitCollectionCreation, admitVaultCommand } from './command-admission';
import { createCollectionCommand } from './browser-collection-create';
import { decodeVaultCommand, utf8 } from './protocol';

describe('collection creation command', () => {
  it('creates signed device and recovery epoch envelopes without exposing the epoch key', async () => {
    const signing = ed25519.keygen(new Uint8Array(32).fill(3));
    const deviceEncryption = x25519.keygen(new Uint8Array(32).fill(4));
    const recoveryEncryption = x25519.keygen(new Uint8Array(32).fill(5));
    const result = await createCollectionCommand({
      accountId: 'account-1', deviceId: 'device-1', deviceEncryptionPublicKey: deviceEncryption.publicKey,
      recoveryKeyId: 'recovery-1', recoveryEncryptionPublicKey: recoveryEncryption.publicKey,
      deviceSigningSecretKey: signing.secretKey, expectedAccountHead: new Uint8Array(32).fill(2),
      metadataTitle: 'Personal vault',
      collectionId: 'collection-1', operationId: 'operation-1',
    });
    const command = decodeVaultCommand(result.command);
    await expect(admitVaultCommand(result.command, { id: 'account-1', sessionId: 'session-1' }, {
      findActiveDevice: async () => ({ signingPublicKey: signing.publicKey, boundSessionId: 'session-1' }),
      findActiveRecoveryKey: async () => null,
    })).resolves.toMatchObject({ command: { operationType: 'collection-create' } });
    const creation = admitCollectionCreation(command);

    expect(result.epochKey).toHaveLength(32);
    expect(creation.collectionId).toBe('collection-1');
    expect(creation.deviceEnvelope.encapsulation).toHaveLength(32);
    expect(creation.recoveryEnvelope.encapsulation).toHaveLength(32);
    expect(creation.encryptedMetadata).not.toEqual(utf8('Personal vault'));
  });
});
