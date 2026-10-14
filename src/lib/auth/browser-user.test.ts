import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  listener: undefined as undefined | ((event: AuthChangeEvent, session: Session | null) => void),
  unsubscribe: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { onAuthStateChange: (listener: typeof auth.listener) => {
    auth.listener = listener;
    return { data: { subscription: { unsubscribe: auth.unsubscribe } } };
  } } }),
}));

import { subscribeToBrowserUser } from './browser-user';

describe('browser presentation identity lifecycle', () => {
  it('loads initial identity, follows login/refresh, clears logout and ignores events after unmount', () => {
    const onUser = vi.fn();
    const cleanup = subscribeToBrowserUser(onUser);
    expect(onUser).not.toHaveBeenCalled();
    const user = { id: 'account-a' } as User;
    const session = { user } as Session;
    auth.listener?.('INITIAL_SESSION', session);
    expect(onUser).toHaveBeenLastCalledWith(user);
    auth.listener?.('TOKEN_REFRESHED', session);
    expect(onUser).toHaveBeenLastCalledWith(user);
    auth.listener?.('SIGNED_OUT', null);
    expect(onUser).toHaveBeenLastCalledWith(null);
    auth.listener?.('SIGNED_IN', session);
    expect(onUser).toHaveBeenLastCalledWith(user);
    cleanup();
    expect(auth.unsubscribe).toHaveBeenCalledOnce();
    const calls = onUser.mock.calls.length;
    auth.listener?.('SIGNED_IN', session);
    expect(onUser).toHaveBeenCalledTimes(calls);
  });
});
