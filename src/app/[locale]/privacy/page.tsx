import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { use } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('PrivacyPage');

  return (
    <div className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl prose prose-invert prose-sm">
        <h1 className="font-heading text-4xl font-black text-white">{t('title')}</h1>
        <p className="text-gray-500">{t('last_updated')}</p>

        <p className="text-gray-400">
          [TEMPLATE — Review with legal counsel before production launch. Include your company
          name, jurisdiction, data controller details, and applicable regulations.]
        </p>

        <h2 className="text-white">1. Information We Collect</h2>
        <p className="text-gray-400">
          ClipsX is a local-first desktop application. All clipboard data is stored on your device
          and is never transmitted to our servers. When you create an account, we collect your
          email address and account preferences. When you subscribe, billing is handled by Stripe
          and we do not store payment card data.
        </p>

        <h2 className="text-white">2. How We Use Your Information</h2>
        <p className="text-gray-400">
          Account information is used to authenticate you and manage your subscription. We do not
          sell your data to third parties. We may send transactional emails related to your account
          or subscription.
        </p>

        <h2 className="text-white">3. Data Storage and Security</h2>
        <p className="text-gray-400">
          Clipboard data stays on your device. Account data is stored in Supabase-managed
          infrastructure with industry-standard encryption at rest and in transit.
        </p>

        <h2 className="text-white">4. Third-Party Services</h2>
        <p className="text-gray-400">
          We use Supabase for authentication and Stripe for payment processing. Each has its own
          privacy policy governing how it handles your data.
        </p>

        <h2 className="text-white">5. Your Rights</h2>
        <p className="text-gray-400">
          You may request deletion of your account and associated data at any time by contacting
          us. Clipboard history stored locally can be deleted from within the app.
        </p>

        <h2 className="text-white">6. Contact</h2>
        <p className="text-gray-400">
          Questions about this policy? Use the <a href="/contact" className="text-cyan-400">contact form</a>.
        </p>
      </div>
    </div>
  );
}
