'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pricingPlans } from '@/config/pricing';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export default function PricingPage() {
  const t = useTranslations('PricingPage');
  const router = useRouter();
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  async function handlePlanCta(planId: string, priceId?: string) {
    if (planId === 'free') {
      router.push('/download');
      return;
    }
    if (!priceId) return;

    setLoading(planId);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/signin?next=/pricing`);
      return;
    }

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    });

    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
    setLoading(null);
  }

  return (
    <div className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl sm:text-5xl font-black text-white mb-4">
            {t('title')}
          </h1>
          <p className="text-lg text-gray-400">{t('subtitle')}</p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-12">
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 gap-1">
            {(['monthly', 'yearly'] as const).map((i) => (
              <button
                key={i}
                onClick={() => setInterval(i)}
                className={cn(
                  'rounded-lg px-5 py-2 text-sm font-medium transition-all',
                  interval === i
                    ? 'bg-cyan-500 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                {t(i as any)}
                {i === 'yearly' && (
                  <span className="ml-2 text-xs text-cyan-300">{t('save_badge')}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {pricingPlans.map((plan) => {
            const price = interval === 'monthly' ? t(plan.priceMonthlyKey as any) : t(plan.priceYearlyKey as any);
            const period = interval === 'monthly' ? t(plan.periodMonthlyKey as any) : t(plan.periodYearlyKey as any);
            const priceId = interval === 'monthly' ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly;

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border p-8 transition-all',
                  plan.highlighted
                    ? 'border-cyan-500/50 bg-gradient-to-b from-cyan-950/30 to-gray-950 shadow-xl shadow-cyan-500/10'
                    : 'border-white/8 bg-white/3 hover:border-white/15'
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="cyan">{t('popular_badge')}</Badge>
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="font-heading font-black text-white text-xl mb-1">
                    {t(plan.nameKey as any)}
                  </h2>
                  <p className="text-sm text-gray-500">{t(plan.descKey as any)}</p>
                </div>

                <div className="mb-8">
                  <span className="font-heading text-5xl font-black text-white">{price}</span>
                  <span className="text-sm text-gray-500 ml-1">{period}</span>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((fk) => (
                    <li key={fk} className="flex items-start gap-2.5 text-sm text-gray-400">
                      <Check size={16} className="text-cyan-500 mt-0.5 shrink-0" />
                      {t(fk as any)}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.highlighted ? 'primary' : 'outline'}
                  size="lg"
                  loading={loading === plan.id}
                  onClick={() => handlePlanCta(plan.id, priceId)}
                  className="w-full"
                >
                  {t(plan.ctaKey as any)}
                </Button>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mx-auto max-w-2xl">
          <h2 className="font-heading text-2xl font-bold text-white mb-8 text-center">
            {t('faq_title')}
          </h2>
          {[
            { q: 'faq_switch_q', a: 'faq_switch_a' },
            { q: 'faq_refund_q', a: 'faq_refund_a' },
            { q: 'faq_trial_q', a: 'faq_trial_a' },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-white/8 py-6">
              <h3 className="font-semibold text-white mb-2">{t(q as any)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t(a as any)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
