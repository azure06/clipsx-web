import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { footerNav } from '@/config/nav';
import { siteConfig } from '@/config/site';

export function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-white/5 bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="group inline-flex items-center gap-2.5 text-white">
              <Image
                src="/icons/monochromatic.svg"
                alt="ClipsX logo"
                width={30}
                height={30}
                className="h-[30px] w-auto opacity-70 transition-all duration-200 group-hover:opacity-90"
              />
              <span className="font-heading text-[0.9rem] font-bold tracking-[0.22em] text-white/75 uppercase">
                CLIPS<span className="text-cyan-400">X</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-xs">
              {t('Footer.tagline')}
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
              {t('Footer.product')}
            </p>
            <ul className="space-y-2">
              {footerNav.product.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {t(item.labelKey as any)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
              {t('Footer.company')}
            </p>
            <ul className="space-y-2">
              {footerNav.company.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {t(item.labelKey as any)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
              {t('Footer.legal')}
            </p>
            <ul className="space-y-2">
              {footerNav.legal.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {t(item.labelKey as any)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} {siteConfig.name}. {t('Footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
