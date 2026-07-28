import 'server-only';

import type { User } from '@supabase/supabase-js';

import { decodeVaultCommand, verifyProtocolRecord, type VaultCommand } from './protocol';

const MAX_COMMAND_BYTES = 1_100_000;

export type VaultCommandLookup = {
  findActiveDevice(id: string, accountId: string): Promise<Uint8Array | null>;
  findActiveRecoveryKey(id: string, accountId: string): Promise<Uint8Array | null>;
};

export type CommandAdmission = { command: VaultCommand };

export async function admitVaultCommand(
  bytes: Uint8Array,
  user: Pick<User, 'id'>,
  lookup: VaultCommandLookup,
): Promise<CommandAdmission> {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_COMMAND_BYTES) throw new Error('command-size');
  const command = decodeVaultCommand(bytes);
  if (command.accountId !== user.id) throw new Error('account-mismatch');

  const publicKey = command.authorDeviceId
    ? await lookup.findActiveDevice(command.authorDeviceId, user.id)
    : await lookup.findActiveRecoveryKey(command.recoveryKeyId!, user.id);
  if (!publicKey) throw new Error('inactive-author');

  const valid = await verifyProtocolRecord(
    `clipsx/vault/v1/command/${command.operationType}`,
    command.signedBytes,
    command.signature,
    publicKey,
  );
  if (!valid) throw new Error('invalid-signature');
  return { command };
}
