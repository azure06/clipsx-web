import { encodeCanonicalCbor, signProtocolRecord, type CborValue } from './protocol';

export async function createDeviceSessionBindCommand(input: {
  accountId: string;
  deviceId: string;
  sessionId: string;
  expectedAccountHead: Uint8Array;
  deviceSigningSecretKey: Uint8Array;
  operationId?: string;
}): Promise<Uint8Array> {
  if (input.expectedAccountHead.byteLength !== 32) throw new Error('Expected account head must be 32 bytes.');
  const payload = encodeCanonicalCbor(new Map<number, CborValue>([
    [1, input.deviceId], [2, input.sessionId],
  ]));
  const unsigned = new Map<number, CborValue>([
    [1, 1], [2, input.operationId ?? crypto.randomUUID()], [3, 'device-session-bind'],
    [4, input.accountId], [5, `device:${input.deviceId}`], [7, input.expectedAccountHead], [9, payload],
  ]);
  const signed = encodeCanonicalCbor(unsigned);
  unsigned.set(10, await signProtocolRecord(
    'clipsx/vault/v1/command/device-session-bind', signed, input.deviceSigningSecretKey,
  ));
  return encodeCanonicalCbor(unsigned);
}
