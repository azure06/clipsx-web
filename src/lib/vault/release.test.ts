import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { vaultPreviewEnabled, vaultReleaseGuard } from './release';

afterEach(() => vi.unstubAllEnvs());

describe('vault release boundary', () => {
  it('requires an explicit preview opt-in', () => {
    vi.stubEnv('CLIPSX_VAULT_PREVIEW_ENABLED', '');
    expect(vaultPreviewEnabled()).toBe(false);
    expect(vaultReleaseGuard()?.status).toBe(404);
    vi.stubEnv('CLIPSX_VAULT_PREVIEW_ENABLED', 'true');
    expect(vaultReleaseGuard()).toBeNull();
  });

  it('blocks every vault API before authentication or database access', async () => {
    vi.stubEnv('CLIPSX_VAULT_PREVIEW_ENABLED', '');
    const routes = [
      (await import('../../app/api/vault/commands/route')).POST,
      (await import('../../app/api/vault/device-challenges/route')).POST,
      (await import('../../app/api/vault/account-sync/route')).GET,
      (await import('../../app/api/vault/bootstrap/route')).GET,
      (await import('../../app/api/vault/recovery-bootstrap/route')).GET,
      (await import('../../app/api/vault/enrollment-status/route')).GET,
      (await import('../../app/api/vault/collections/[collectionId]/sync/route')).GET,
    ];
    for (const route of routes) {
      const response = await route(new NextRequest('https://clipsx.test/api/vault'), { params: Promise.resolve({ collectionId: 'c' }) });
      expect(response.status).toBe(404);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
  });
});
