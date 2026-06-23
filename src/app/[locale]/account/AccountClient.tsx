'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface AccountClientProps {
  user: User;
}

export function AccountClient({ user }: AccountClientProps) {
  const t = useTranslations('AccountPage');
  const router = useRouter();
  const [billingLoading, setBillingLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);

  async function handleManageBilling() {
    setBillingLoading(true);
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
    setBillingLoading(false);
  }

  async function handleSignOut() {
    setSignOutLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const plan = 'free'; // placeholder — wire to subscription lookup

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
              {t('email_label')}
            </p>
            <p className="text-gray-900 font-medium dark:text-white">{user.email}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 flex items-center justify-between dark:border-white/8">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
              {t('plan_label')}
            </p>
            <Badge variant={plan === 'free' ? 'default' : 'cyan'}>
              {t(`plan_${plan}` as any)}
            </Badge>
          </div>

          {plan === 'free' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/pricing')}
            >
              {t('upgrade')}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              loading={billingLoading}
              onClick={handleManageBilling}
            >
              {t('manage_billing')}
            </Button>
          )}
        </div>
      </Card>

      <Button
        variant="ghost"
        size="sm"
        loading={signOutLoading}
        onClick={handleSignOut}
        className="text-red-400 hover:text-red-300 w-full"
      >
        {t('sign_out')}
      </Button>
    </div>
  );
}
