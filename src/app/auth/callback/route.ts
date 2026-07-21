import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales } from '@/i18n/config';

function getAccountPath(next: string | null) {
  const allowedPaths = new Set(locales.map((locale) => `/${locale}/account`));
  return next && allowedPaths.has(next) ? next : `/${defaultLocale}/account`;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const accountPath = getAccountPath(searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(
      new URL(`${accountPath.replace('/account', '/signin')}?error=auth_callback_failed`, origin)
    );
  }

  const response = NextResponse.redirect(new URL(accountPath, origin));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    return response;
  }

  return NextResponse.redirect(
    new URL(`${accountPath.replace('/account', '/signin')}?error=auth_callback_failed`, origin)
  );
}
