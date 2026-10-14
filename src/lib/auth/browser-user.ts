import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

/** Subscribe once per presentation provider, including the initial persisted session. */
export function subscribeToBrowserUser(onUser: (user: User | null) => void) {
  let active = true;
  const { data } = createClient().auth.onAuthStateChange((_event, session) => {
    if (active) onUser(session?.user ?? null);
  });
  return () => {
    active = false;
    data.subscription.unsubscribe();
  };
}
