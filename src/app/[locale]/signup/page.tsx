'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Minimum 8 characters'),
});
type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const t = useTranslations('SignUpPage');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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

          <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
            {t('submit')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-500">
          {t('have_account')}{' '}
          <Link href="/signin" className="text-cyan-400 hover:text-cyan-300">
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
