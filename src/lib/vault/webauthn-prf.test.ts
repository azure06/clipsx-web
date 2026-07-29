import { afterEach, describe, expect, it, vi } from 'vitest';

import { vaultPrfCapability } from './webauthn-prf';

afterEach(() => vi.unstubAllGlobals());

describe('vault PRF capability detection', () => {
  it('reports explicit PRF support from the browser capability API', async () => {
    class Credential {}
    Object.assign(Credential, { getClientCapabilities: vi.fn().mockResolvedValue({ 'extension:prf': true }) });
    vi.stubGlobal('window', { PublicKeyCredential: Credential });
    await expect(vaultPrfCapability()).resolves.toBe(true);
  });

  it('returns unknown when the browser has no capability API', async () => {
    vi.stubGlobal('window', { PublicKeyCredential: class Credential {} });
    await expect(vaultPrfCapability()).resolves.toBeNull();
  });
});
