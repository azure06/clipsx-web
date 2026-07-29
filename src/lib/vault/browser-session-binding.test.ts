import { ed25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';

import { admitVaultCommand } from './command-admission';
import { createDeviceSessionBindCommand } from './browser-session-binding';
import { decodeVaultCommand } from './protocol';

describe('browser device session binding', () => {
  it('allows an active device to bind only the authenticated session and expected account head', async () => {
    const { secretKey, publicKey } = ed25519.keygen(new Uint8Array(32).fill(7));
    const commandBytes = await createDeviceSessionBindCommand({
      accountId: 'account-1', deviceId: 'device-1', sessionId: 'session-2',
      expectedAccountHead: new Uint8Array(32).fill(8), deviceSigningSecretKey: secretKey,
      operationId: 'operation-1',
    });

    expect(decodeVaultCommand(commandBytes).operationType).toBe('device-session-bind');
    await expect(admitVaultCommand(commandBytes, { id: 'account-1', sessionId: 'session-2' }, {
      findActiveDevice: async () => ({ signingPublicKey: publicKey, boundSessionId: 'session-1' }),
      findActiveRecoveryKey: async () => null,
    })).resolves.toMatchObject({ sessionBinding: { deviceId: 'device-1', sessionId: 'session-2' } });

    await expect(admitVaultCommand(commandBytes, { id: 'account-1', sessionId: 'session-3' }, {
      findActiveDevice: async () => ({ signingPublicKey: publicKey, boundSessionId: 'session-1' }),
      findActiveRecoveryKey: async () => null,
    })).rejects.toThrow('invalid-session-binding');
  });
});
