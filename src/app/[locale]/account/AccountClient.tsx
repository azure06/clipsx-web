'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface AccountClientProps {
  user: User;
}

type BillingSummary = {
  name: string;
  canManageBilling: boolean;
  planCode: 'free' | 'pro';
  entitlementStatus: 'active' | 'read_only';
  paidThrough: string | null;
  cancelAtPeriodEnd: boolean;
};

type Workspace = { id: string; name: string; kind: 'personal' | 'organization'; canManageBilling: boolean };

export function AccountClient({ user }: AccountClientProps) {
  const t = useTranslations('AccountPage');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billingLoading, setBillingLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>('personal');
  const [activating, setActivating] = useState(searchParams.get('checkout') === 'success');

  useEffect(() => {
    fetch('/api/billing/workspaces')
      .then(async (response) => response.ok ? response.json() : [])
      .then((value: Workspace[]) => {
        setWorkspaces(value);
        const personal = value.find((workspace) => workspace.kind === 'personal');
        if (personal) setWorkspaceId(personal.id);
      })
      .catch(() => setWorkspaces([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    const load = async () => {
      const response = await fetch(`/api/billing/summary?workspace=${encodeURIComponent(workspaceId)}`);
      const value = response.ok ? await response.json() as BillingSummary : null;
      if (cancelled) return;
      setSummary(value);
      if (activating && value?.planCode !== 'pro' && attempt++ < 14) {
        window.setTimeout(load, 2000);
      } else if (value?.planCode === 'pro') {
        setActivating(false);
      }
    };
    void load().catch(() => setSummary(null));
    return () => { cancelled = true; };
  }, [workspaceId, activating]);

  async function handleManageBilling() {
    setBillingLoading(true);
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: workspaceId === 'personal' ? undefined : workspaceId }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
      return;
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

  const plan = summary?.planCode ?? 'free';

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{t('email_label')}</p>
            <p className="text-gray-900 font-medium dark:text-white">{user.email}</p>
          </div>
        </div>

        {workspaces.length > 0 && (
          <label className="block border-t border-gray-200 pt-4 text-xs text-gray-500 uppercase tracking-widest dark:border-white/8">
            Workspace
            <select
              value={workspaceId}
              onChange={(event) => setWorkspaceId(event.target.value)}
              className="mt-2 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm normal-case text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
              ))}
            </select>
          </label>
        )}

        <div className="border-t border-gray-200 pt-4 flex items-center justify-between dark:border-white/8">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{t('plan_label')}</p>
            <Badge variant={plan === 'free' ? 'default' : 'cyan'}>{t(`plan_${plan}` as never)}</Badge>
            {activating && plan === 'free' && (
              <p className="mt-2 text-xs text-cyan-700 dark:text-cyan-300">Activating Pro…</p>
            )}
            {summary?.entitlementStatus === 'read_only' && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Read-only access</p>
            )}
            {summary?.cancelAtPeriodEnd && summary.paidThrough && (
              <p className="mt-2 text-xs text-gray-500">Active until {new Date(summary.paidThrough).toLocaleDateString()}</p>
            )}
          </div>

          {plan === 'free' && workspaceId === 'personal' ? (
            <Button variant="outline" size="sm" onClick={() => router.push('/pricing')}>{t('upgrade')}</Button>
          ) : summary?.canManageBilling !== false ? (
            <Button variant="outline" size="sm" loading={billingLoading} onClick={handleManageBilling}>{t('manage_billing')}</Button>
          ) : null}
        </div>
      </Card>

      <Button variant="ghost" size="sm" loading={signOutLoading} onClick={handleSignOut} className="text-red-400 hover:text-red-300 w-full">
        {t('sign_out')}
      </Button>
    </div>
  );
}
