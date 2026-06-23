import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { use } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('TermsPage');

  return (
    <div className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl prose prose-invert prose-sm">
        <h1 className="font-heading text-4xl font-black text-white">{t('title')}</h1>
        <p className="text-gray-500">{t('last_updated')}</p>

        <p className="text-gray-400">
          [TEMPLATE — Review with legal counsel before production launch. Include your company
          name, jurisdiction, governing law, and applicable regulations.]
        </p>

        <h2 className="text-white">1. Acceptance of Terms</h2>
        <p className="text-gray-400">
          By downloading or using ClipsX, you agree to these Terms of Service. If you do not
          agree, do not use the software.
        </p>

        <h2 className="text-white">2. License</h2>
        <p className="text-gray-400">
          ClipsX grants you a limited, non-exclusive, non-transferable license to use the software
          on devices you own or control, subject to the plan you have purchased. Free tier usage
          is permitted under the same terms.
        </p>

        <h2 className="text-white">3. Subscriptions and Billing</h2>
        <p className="text-gray-400">
          Paid plans are billed through Stripe on a monthly or annual basis. Subscriptions
          auto-renew unless cancelled. Annual plans include a 14-day refund window; monthly plans
          cancel at end of period.
        </p>

        <h2 className="text-white">4. Acceptable Use</h2>
        <p className="text-gray-400">
          You may not use ClipsX to capture, store, or transmit data in violation of applicable
          laws. You are responsible for the data captured on your device.
        </p>

        <h2 className="text-white">5. Disclaimer of Warranties</h2>
        <p className="text-gray-400">
          ClipsX is provided "as is" without warranty of any kind. We do not warrant that the
          software will be error-free or uninterrupted.
        </p>

        <h2 className="text-white">6. Limitation of Liability</h2>
        <p className="text-gray-400">
          To the extent permitted by law, our liability for any claim arising from use of ClipsX
          is limited to the amount you paid us in the 12 months preceding the claim.
        </p>

        <h2 className="text-white">7. Contact</h2>
        <p className="text-gray-400">
          Questions? Use the <a href="/contact" className="text-cyan-400">contact form</a>.
        </p>
      </div>
    </div>
  );
}
