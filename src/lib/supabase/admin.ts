import 'server-only';

import { createClient } from '@supabase/supabase-js';

export class VaultConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultConfigurationError';
  }
}

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new VaultConfigurationError('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new VaultConfigurationError('NEXT_PUBLIC_SUPABASE_URL is not configured');

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
