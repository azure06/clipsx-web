import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getUser } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) redirect(`/${locale}/signin`);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const stripe = getStripe();

  try {
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    const customer = customers.data[0];
    if (customer) {
      const session = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: `${siteUrl}/${locale}/account`,
      });
      redirect(session.url);
    }
  } catch {
    // fall through to account on error
  }

  redirect(`/${locale}/account`);
}
