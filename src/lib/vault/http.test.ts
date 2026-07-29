import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  readVaultCborResponse,
  VAULT_REQUEST_ID_HEADER,
  VaultHttpError,
  vaultCborResponse,
  vaultErrorMessage,
} from './http';
import { decodeCanonicalCbor, encodeCanonicalCbor } from './protocol';

describe('vault CBOR HTTP boundary', () => {
  it('sends only the encoded CBOR view and includes the request ID', async () => {
    const record = new Map<number, string | Uint8Array>([
      [1, randomUUID()], [2, new Uint8Array(32).fill(0x11)],
      [3, new Uint8Array(48).fill(0x22)], [4, '2026-08-02T00:35:04.209Z'],
    ]);
    const expected = encodeCanonicalCbor(record);
    expect(Buffer.isBuffer(expected)).toBe(true);
    expect(expected.buffer.byteLength).toBeGreaterThan(expected.byteLength);

    const response = vaultCborResponse(201, record, 'request-123');
    const actual = new Uint8Array(await response.arrayBuffer());
    expect(actual).toEqual(new Uint8Array(expected));
    expect(actual.byteLength).toBe(expected.byteLength);
    expect(decodeCanonicalCbor(actual)).toEqual(record);
    expect(response.headers.get(VAULT_REQUEST_ID_HEADER)).toBe('request-123');
  });

  it('preserves a server error code and request ID through real decoding', async () => {
    const response = vaultCborResponse(503, new Map([[1, 'challenge-store-failed']]), 'request-456');
    await expect(readVaultCborResponse(response, 'Could not start device registration')).rejects.toMatchObject({
      code: 'challenge-store-failed', requestId: 'request-456', category: 'service',
    });
  });

  it('classifies a non-CBOR upstream response as a network failure', async () => {
    const response = new Response('upstream failure', { status: 502, headers: { 'X-Vault-Request-Id': 'request-502' } });
    await expect(readVaultCborResponse(response, 'Could not start device registration')).rejects.toMatchObject({
      category: 'network', requestId: 'request-502',
    });
  });

  it('renders a non-secret support message for a challenge storage failure', () => {
    expect(vaultErrorMessage(new VaultHttpError('ignored', 503, 'challenge-store-failed', 'request-789', 'service'), 'fallback'))
      .toBe('Vault setup is temporarily unavailable. Contact support with this reference. Reference: request-789.');
  });
});
