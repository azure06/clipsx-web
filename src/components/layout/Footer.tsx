import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { footerNav } from '@/config/nav';
import { siteConfig } from '@/config/site';

export function Footer() {
  const t = useTranslations();
  const translate = (key: string) => t(key as Parameters<typeof t>[0]);

  return (
    <footer className="border-t border-gray-200/70 bg-white dark:border-white/5 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="group inline-flex items-center gap-2.5 text-gray-900 dark:text-white">
              <Image
                src="/icons/monochromatic.svg"
                alt="ClipsX logo"
                width={30}
                height={30}
                className="h-[30px] w-auto opacity-70 transition-all duration-200 group-hover:opacity-90"
              />
              <span className="font-heading text-[0.9rem] font-bold tracking-[0.22em] uppercase">
                <span className="text-gray-700 dark:text-white/75">CLIPS</span><span className="text-gray-500 dark:text-white/40">X</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed max-w-xs dark:text-gray-500">
              {t('Footer.tagline')}
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3 dark:text-gray-500">
              {t('Footer.product')}
            </p>
            <ul className="space-y-2">
              {footerNav.product.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-white">
                    {translate(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3 dark:text-gray-500">
              {t('Footer.company')}
            </p>
            <ul className="space-y-2">
              {footerNav.company.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-white">
                    {translate(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3 dark:text-gray-500">
              {t('Footer.legal')}
            </p>
            <ul className="space-y-2">
              {footerNav.legal.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-white">
                    {translate(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-200/70 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 dark:border-white/5">
          <p className="text-xs text-gray-500 dark:text-gray-600">
            © {new Date().getFullYear()} {siteConfig.name}. {t('Footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
