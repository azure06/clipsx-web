import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — session refresh middleware handles this
          }
        },
      },
    }
  );
}

export async function getUser() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) return null;

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export type VaultPrincipal = { user: User; sessionId: string };

export async function getVaultPrincipal(): Promise<VaultPrincipal | null> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const sessionId = claimsData?.claims?.session_id;
  if (typeof sessionId !== 'string' || sessionId.length === 0) return null;

  const { data: { user } } = await supabase.auth.getUser();
  return user ? { user, sessionId } : null;
}
