'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { mainNav } from '@/config/nav';
import { LocaleSwitcher } from './LocaleSwitcher';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200/70 bg-white/80 backdrop-blur-xl dark:border-white/5 dark:bg-gray-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5 text-gray-900 dark:text-white">
          <Image
            src="/icons/monochromatic.svg"
            alt="ClipsX logo"
            width={38}
            height={38}
            className="h-[38px] w-auto opacity-80 transition-all duration-200 group-hover:opacity-100 dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.15)] dark:group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]"
            priority
          />
          <span className="font-heading text-[1rem] font-bold tracking-[0.22em] uppercase">
            <span className="text-gray-900 dark:text-white">CLIPS</span><span className="text-gray-500 dark:text-gray-400">X</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md transition-colors dark:text-gray-400 dark:hover:text-white"
            >
              {t(item.labelKey as any)}
            </Link>
          ))}
        </nav>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-3">
          <LocaleSwitcher />
          {user ? (
            <Link
              href="/account"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-white"
            >
              {t('Nav.account')}
            </Link>
          ) : (
            <>
              <Link
                href="/signin"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-white"
              >
                {t('Nav.signIn')}
              </Link>
              <Link
                href="/download"
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-400 transition-colors"
              >
                {t('Nav.download' as any)}
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-200/70 bg-white/95 px-4 py-4 dark:border-white/5 dark:bg-gray-950/95">
          <nav className="flex flex-col gap-1 mb-4">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 rounded-md transition-colors dark:text-gray-300 dark:hover:text-white"
              >
                {t(item.labelKey as any)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-between border-t border-gray-200/70 pt-4 dark:border-white/5">
            <div className="flex items-center gap-2">
              <LocaleSwitcher />
            </div>
            {user ? (
              <Link href="/account" onClick={() => setOpen(false)} className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                {t('Nav.account')}
              </Link>
            ) : (
              <div className="flex gap-3">
                <Link href="/signin" onClick={() => setOpen(false)} className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                  {t('Nav.signIn')}
                </Link>
                <Link
                  href="/download"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-400"
                >
                  {t('Nav.download' as any)}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
