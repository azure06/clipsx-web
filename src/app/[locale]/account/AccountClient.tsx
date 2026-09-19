'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsLayout, isSectionId, DEFAULT_SECTION, type SectionId } from '@/components/settings/SettingsLayout';

interface AccountClientProps {
  user: User;
}

export function AccountClient({ user }: AccountClientProps) {
  const t = useTranslations('AccountPage');
  const router = useRouter();
  const searchParams = useSearchParams();

  const raw = searchParams.get('section');
  const activeSection: SectionId = isSectionId(raw)
    ? raw
    : searchParams.get('checkout') === 'success' ? 'billing' : DEFAULT_SECTION;

  function handleSectionChange(id: SectionId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', id);
    router.replace(`/account?${params.toString()}`);
  }

  const [signOutLoading, setSignOutLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSignOut() {
    setSignOutLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true); setDeleteError(null);
    const response = await fetch('/api/account', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({confirmation:deleteConfirmation,cancelSubscriptions:true}) });
    const result = await response.json().catch(() => ({})) as {code?:string;closed?:boolean;message?:string;blockers?:Array<{message:string}>};
    if (response.ok && result.closed) { await createClient().auth.signOut({scope:'global'}); router.push('/'); router.refresh(); return; }
    const messages:Record<string,string>={REAUTHENTICATION_REQUIRED:t('delete_reauth'),ORGANIZATION_OWNER:t('delete_org'),ACTIVE_SUBSCRIPTION:t('delete_subscription'),CLOSURE_PENDING:t('delete_pending')};
    setDeleteError(result.blockers?.[0]?.message ?? messages[result.code??''] ?? result.message ?? t('delete_error')); setDeleteLoading(false);
  }

  return (
    <SettingsLayout
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      variant="page"
    >
      {activeSection === DEFAULT_SECTION ? (
        <div className="space-y-6">
          <SettingsSection title={t('email_label')}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-all text-sm text-gray-900 dark:text-white">{user.email}</p>
              <Button variant="ghost" size="sm" loading={signOutLoading} onClick={handleSignOut} className="self-start shrink-0">
                {t('sign_out')}
              </Button>
            </div>
          </SettingsSection>

          <SettingsSection title={t('delete_title')} description={t('delete_body')} danger>
            {deleteOpen ? (
              <div className="space-y-4">
                <label className="block text-sm font-medium">
                  {t('delete_label')}
                  <input
                    className="input-vault mt-2 w-full"
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    autoComplete="off"
                  />
                </label>
                {deleteError && <p className="text-sm text-red-600" role="alert">{deleteError}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => setDeleteOpen(false)}>{t('delete_cancel')}</Button>
                  <Button variant="danger" loading={deleteLoading} disabled={deleteConfirmation !== 'DELETE'} onClick={handleDeleteAccount}>
                    {t('delete_confirm')}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="text-red-600 dark:text-red-400">
                {t('delete_action')}
              </Button>
            )}
          </SettingsSection>
        </div>
      ) : null}
    </SettingsLayout>
  );
}
