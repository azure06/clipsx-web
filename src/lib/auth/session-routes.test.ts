import { describe, expect, it } from 'vitest';
import { requiresServerSession } from './session-routes';

describe('session refresh boundary', () => {
  it.each(['/en/account', '/ja/account/billing', '/en/vault/collections', '/ja/vault/settings'])(
    'refreshes private pages: %s', path => expect(requiresServerSession(path)).toBe(true),
  );
  it.each(['/en', '/ja/download', '/en/signin', '/en/accountant', '/fr/account', '/favicon.ico', '/api/account', '/auth/callback'])(
    'does not refresh public or independently authenticated routes: %s', path => expect(requiresServerSession(path)).toBe(false),
  );
});
