'use client';

import { Fragment, useState } from 'react';
import { Check, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { pricingFeatureGroups, pricingPlans, type BillingInterval, type FeatureAvailability } from '@/config/pricing';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

function Availability({ value }: { value: FeatureAvailability }) {
  const t = useTranslations('PricingPage');

  if (value === 'included') {
    return <span className="inline-flex items-center justify-center text-cyan-600 dark:text-cyan-400"><Check size={18} aria-label={t('included')} /></span>;
  }
  if (value === 'limited') {
    return <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{t('limited')}</span>;
  }
  return <span className="inline-flex items-center justify-center text-gray-400 dark:text-gray-600"><Minus size={18} aria-label={t('not_included')} /></span>;
}

export default function PricingPage() {
  const t = useTranslations('PricingPage');
  const translate = (key: string) => t(key as Parameters<typeof t>[0]);
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState(false);

  async function handlePlanCta(planId: 'free' | 'pro') {
    if (planId === 'free') {
      router.push('/download');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/signin?next=/pricing');
      return;
    }

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'pro', interval }),
    });

    if (res.ok) {
      const { url } = await res.json();
      window.location.assign(url);
      return;
    }

    setLoading(false);
  }

  return (
    <div className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl sm:text-5xl font-black text-gray-900 mb-4 dark:text-white">{t('title')}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="flex rounded-xl border border-gray-200 bg-gray-100/70 p-1 gap-1 dark:border-white/10 dark:bg-white/5">
            {(['monthly', 'yearly'] as const).map((value) => (
              <button key={value} onClick={() => setInterval(value)} className={cn('rounded-lg px-5 py-2 text-sm font-medium transition-all', interval === value ? 'bg-cyan-500 text-white shadow' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white')}>
                {t(value)}
                {value === 'yearly' && <span className="ml-2 text-xs text-cyan-100">{t('save_badge')}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          {pricingPlans.map((plan) => {
            const price = interval === 'monthly' ? translate(plan.priceMonthlyKey) : translate(plan.priceYearlyKey);
            const period = interval === 'monthly' ? translate(plan.periodMonthlyKey) : translate(plan.periodYearlyKey);
            return (
              <section key={plan.id} className={cn('relative flex flex-col rounded-2xl border p-8', plan.highlighted ? 'border-cyan-500/50 bg-gradient-to-b from-cyan-100 to-blue-100 shadow-xl shadow-cyan-500/10 dark:from-cyan-950/30 dark:to-gray-950' : 'border-gray-200 bg-white dark:border-white/8 dark:bg-white/3')}>
                {plan.highlighted && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge variant="cyan">{t('popular_badge')}</Badge></div>}
                <h2 className="font-heading font-black text-gray-900 text-xl mb-1 dark:text-white">{translate(plan.nameKey)}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 min-h-10">{translate(plan.descKey)}</p>
                <div className="my-7"><span className="font-heading text-5xl font-black text-gray-900 dark:text-white">{price}</span><span className="text-sm text-gray-600 ml-1 dark:text-gray-400">{period}</span></div>
                <Button variant={plan.highlighted ? 'primary' : 'outline'} size="lg" loading={loading && plan.id === 'pro'} onClick={() => handlePlanCta(plan.id)} className="w-full">{translate(plan.ctaKey)}</Button>
              </section>
            );
          })}
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-50 p-5 text-center text-sm text-cyan-950 dark:bg-cyan-950/20 dark:text-cyan-100 mb-16">
          {t('privacy_promise')}
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/8 dark:bg-white/3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th scope="col" className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{t('comparison_feature')}</th>
                  <th scope="col" className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">{t('free_name')}</th>
                  <th scope="col" className="px-6 py-4 text-center text-sm font-semibold text-cyan-700 dark:text-cyan-300">{t('pro_name')}</th>
                </tr>
              </thead>
              <tbody>
                {pricingFeatureGroups.map((group) => (
                  <Fragment key={group.titleKey}>
                    <tr key={group.titleKey} className="border-t border-gray-200 bg-gray-50/70 dark:border-white/8 dark:bg-white/[0.02]"><th colSpan={3} scope="colgroup" className="px-6 py-3 text-xs font-semibold uppercase tracking-widest text-gray-500">{translate(group.titleKey)}</th></tr>
                    {group.features.map((feature) => <tr key={feature.labelKey} className="border-t border-gray-100 dark:border-white/5"><th scope="row" className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">{translate(feature.labelKey)}</th><td className="px-6 py-4 text-center"><Availability value={feature.free} /></td><td className="px-6 py-4 text-center"><Availability value={feature.pro} /></td></tr>)}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto max-w-2xl mt-16">
          <h2 className="font-heading text-2xl font-bold text-gray-900 mb-8 text-center dark:text-white">{t('faq_title')}</h2>
          {['faq_switch', 'faq_refund', 'faq_trial'].map((key) => <div key={key} className="border-b border-gray-200 py-6 dark:border-white/8"><h3 className="font-semibold text-gray-900 mb-2 dark:text-white">{translate(`${key}_q`)}</h3><p className="text-sm text-gray-600 leading-relaxed dark:text-gray-400">{translate(`${key}_a`)}</p></div>)}
        </section>
      </div>
    </div>
  );
}
