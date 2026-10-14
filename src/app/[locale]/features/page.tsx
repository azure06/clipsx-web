import { assertLocale } from '@/i18n/validate';
import { permanentRedirect } from 'next/navigation';
export default async function LegacyFeatures({params}:{params:Promise<{locale:string}>}) { const {locale}=await params; assertLocale(locale); permanentRedirect(`/${locale}/product`); }
