'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GoogleIcon, GitHubIcon } from '@/components/auth/ProviderIcon';
import { asSupabaseProvider, safeNextPath, type ClipsXOauthProvider } from '@/lib/auth/oauth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Minimum 8 characters'),
});
type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const t = useTranslations('SignUpPage');
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<ClipsXOauthProvider | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit({ email, password }: FormValues) {
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(true);
  }

  async function handleOAuth(provider: ClipsXOauthProvider) {
    setError(null); setOauthLoading(provider);
    const redirectTo = new URL('/auth/callback', window.location.origin);
    redirectTo.searchParams.set('next', safeNextPath('/account', locale));
    const { data, error: oauthError } = await createClient().auth.signInWithOAuth({ provider: asSupabaseProvider(provider), options: { redirectTo: redirectTo.toString() } });
    if (oauthError || !data.url) { setError(t('oauth_error')); setOauthLoading(null); return; }
    window.location.assign(data.url);
  }

  if (success) {
    return (
      <div className="py-24 px-4 sm:px-6 min-h-[80vh] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">📬</div>
          <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2 dark:text-white">Check your email</h2>
          <p className="text-gray-600 text-sm dark:text-gray-400">
            We sent a confirmation link to your email address. Click it to activate your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-24 px-4 sm:px-6 min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-heading text-3xl font-black text-gray-900 mb-2 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 text-sm dark:text-gray-400">{t('subtitle')}</p>
        </div>

        <div className="space-y-3"><Button type="button" variant="secondary" size="lg" loading={oauthLoading==='google'} disabled={oauthLoading!==null} onClick={()=>handleOAuth('google')} className="w-full"><GoogleIcon/>{t('continue_with_google')}</Button><Button type="button" variant="secondary" size="lg" loading={oauthLoading==='github'} disabled={oauthLoading!==null} onClick={()=>handleOAuth('github')} className="w-full"><GitHubIcon/>{t('continue_with_github')}</Button></div>
        <div className="my-5 flex items-center gap-3 text-xs text-gray-500"><span className="h-px flex-1 bg-gray-200 dark:bg-gray-800"/>{t('or')}<span className="h-px flex-1 bg-gray-200 dark:bg-gray-800"/></div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label={t('email_label')}
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label={t('password_label')}
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="8+ characters"
            error={errors.password?.message}
            {...register('password')}
          />

          {error && <p className="text-xs text-red-400">{error}</p>}

          <Button type="submit" variant="brand" size="lg" loading={isSubmitting} className="w-full">
            {t('submit')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-500">
          {t('have_account')}{' '}
          <Link href="/signin" className="text-violet-400 hover:text-violet-300">
            {t('sign_in_link')}
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-600">
          By signing up you agree to our{' '}
          <Link href="/terms" className="underline text-gray-600 hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-300">
            {t('terms_link')}
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline text-gray-600 hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-300">
            {t('privacy_link')}
          </Link>.
        </p>
      </div>
    </div>
  );
}
