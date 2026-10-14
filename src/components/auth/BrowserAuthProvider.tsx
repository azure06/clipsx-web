'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { subscribeToBrowserUser } from '@/lib/auth/browser-user';

const BrowserUserContext = createContext<User | null>(null);

/** Presentation only. Protected pages and APIs verify authentication on the server. */
export function BrowserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => subscribeToBrowserUser(setUser), []);

  return <BrowserUserContext.Provider value={user}>{children}</BrowserUserContext.Provider>;
}

export function useBrowserUser() {
  return useContext(BrowserUserContext);
}
