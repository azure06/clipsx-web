'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { AppWindow, ArrowRight, ArrowUpRight, Blocks, BookOpen, Braces, ChevronDown, CreditCard, History, LogOut, Menu, Search, Sparkles, UserRound, X, type LucideIcon } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { mainNavLinks, mainNavMenus, type NavIcon, type NavItem, type NavMenu } from '@/config/nav';
import { createClient } from '@/lib/supabase/client';
import { GitHubIcon } from '@/components/auth/ProviderIcon';
import { GitHubRepositoryLink } from './GitHubRepositoryLink';
import { getUserAvatar, getUserInitials } from './header-profile';

const navIcons: Record<Exclude<NavIcon, 'github'>, LucideIcon> = {
  product: AppWindow, recall: Sparkles, search: Search, extensions: Blocks,
  developers: Braces, docs: BookOpen, changelog: History,
};

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

export function Header({ user }: { user: User | null }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<NavMenu['id'] | null>(null);
  const [mobileSection, setMobileSection] = useState<NavMenu['id'] | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Partial<Record<NavMenu['id'], HTMLButtonElement | null>>>({});

  const closeNavigation = () => {
    setOpenMenu(null); setMobileOpen(false); setMobileSection(null);
  };

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) { setOpenMenu(null); setAccountOpen(false); }
    };
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (openMenu) triggerRefs.current[openMenu]?.focus();
      setOpenMenu(null); setAccountOpen(false); setMobileOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onEscape); };
  }, [openMenu]);

  async function signOut() {
    setLoading(true); await createClient().auth.signOut(); setAccountOpen(false); router.push('/'); router.refresh();
  }

  const focusFirstMenuItem = (id: NavMenu['id']) => requestAnimationFrame(() => {
    headerRef.current?.querySelector<HTMLElement>(`[data-nav-menu="${id}"] [role="menuitem"]`)?.focus();
  });

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: NavMenu['id']) => {
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); const delta = event.key === 'ArrowDown' ? 1 : -1;
      items[(index + delta + items.length) % items.length]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); items[event.key === 'Home' ? 0 : items.length - 1]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault(); setOpenMenu(null); triggerRefs.current[id]?.focus();
    }
  };

  const renderMenuItem = (item: NavItem, mobile = false) => {
    const Icon = item.icon === 'github' ? null : item.icon ? navIcons[item.icon] : null;
    const content = <>
      <span className={`flex shrink-0 items-center justify-center rounded-lg ${mobile ? 'h-8 w-8' : 'h-9 w-9'} ${item.featured ? 'bg-violet-600 text-white shadow-sm shadow-violet-950/20' : 'border border-black/5 bg-slate-100 text-slate-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400'}`}>
        {item.icon === 'github' ? <GitHubIcon /> : Icon ? <Icon size={16} strokeWidth={1.8} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-heading text-sm font-bold text-slate-900 dark:text-white">
          {t(item.labelKey as never)}
          {item.featured && <span className="rounded-full bg-violet-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[.12em] text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">{t('Nav.featured')}</span>}
          {item.external && <ArrowUpRight size={13} className="text-slate-400" />}
        </span>
        {item.descriptionKey && <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{t(item.descriptionKey as never)}</span>}
      </span>
    </>;
    const className = `focus-ring group flex w-full items-start gap-3 rounded-xl text-left transition ${mobile ? 'px-3 py-2.5' : 'p-3'} ${item.featured ? 'bg-violet-500/[.06] hover:bg-violet-500/[.1]' : 'hover:bg-slate-100/80 dark:hover:bg-white/5'}`;
    return item.external
      ? <a key={item.href} href={item.href} target="_blank" rel="noreferrer" role={mobile ? undefined : 'menuitem'} className={className}>{content}</a>
      : <Link key={item.href} href={item.href} role={mobile ? undefined : 'menuitem'} aria-current={isActive(pathname, item.href) ? 'page' : undefined} className={className} onClick={closeNavigation}>{content}</Link>;
  };

  const avatar = user ? getUserAvatar(user) : null;
  const initials = user ? getUserInitials(user) : null;
  const accountControl = user ? <div className="relative">
    <button type="button" aria-label={t('Nav.account')} aria-haspopup="menu" aria-expanded={accountOpen} onClick={() => { setAccountOpen(!accountOpen); setOpenMenu(null); }} className="focus-ring flex items-center gap-1 rounded-full border border-black/10 bg-white p-1 pr-2 text-slate-600 shadow-sm transition hover:border-violet-400/60 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"><span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-violet-400 dark:text-slate-950">{avatar ? <Image src={avatar} alt="" width={32} height={32} unoptimized /> : initials ?? <UserRound size={16} />}</span><ChevronDown size={14} /></button>
    {accountOpen && <div role="menu" className="absolute right-0 mt-2 w-56 rounded-xl border border-black/10 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-950"><p className="truncate px-3 py-2 text-xs text-slate-500">{user.email}</p><Link role="menuitem" href="/account" onClick={() => setAccountOpen(false)} className="menu-item"><UserRound size={15} />{t('Nav.account')}</Link><Link role="menuitem" href="/account/billing" onClick={() => setAccountOpen(false)} className="menu-item"><CreditCard size={15} />{t('Nav.billing')}</Link><button role="menuitem" type="button" onClick={signOut} disabled={loading} className="menu-item w-full"><LogOut size={15} />{loading ? t('Nav.signingOut') : t('Nav.signOut')}</button></div>}
  </div> : <Link href="/signin" aria-label={t('Nav.signIn')} title={t('Nav.signIn')} className="icon-button"><UserRound size={18} /></Link>;

  return <header ref={headerRef} className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-[rgba(248,250,252,.88)] backdrop-blur-xl dark:border-white/5 dark:bg-[rgba(2,6,23,.88)]">
    <div className="mx-auto flex h-16 max-w-[1440px] items-center px-4 sm:px-6 lg:px-8">
      <Link href="/" onClick={closeNavigation} className="focus-ring flex items-center gap-2.5 rounded-md" aria-label="ClipsX home"><Image src="/icons/monochromatic.svg" alt="" width={34} height={34} priority /><span className="font-heading text-sm font-bold tracking-[.2em]">CLIPS<span className="text-slate-400">X</span></span></Link>
      <nav aria-label="Primary" className="ml-9 hidden items-center gap-0.5 xl:flex">
        {mainNavMenus.map((menu) => <div key={menu.id} className="relative">
          <button ref={(node) => { triggerRefs.current[menu.id] = node; }} type="button" aria-haspopup="menu" aria-expanded={openMenu === menu.id} onClick={() => { setOpenMenu(openMenu === menu.id ? null : menu.id); setAccountOpen(false); }} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpenMenu(menu.id); focusFirstMenuItem(menu.id); } }} className={`nav-link focus-ring inline-flex items-center gap-1.5 ${menu.items.some((item) => !item.external && isActive(pathname, item.href)) ? 'bg-violet-500/[.08] text-violet-700 dark:text-violet-300' : ''}`}>{t(menu.labelKey as never)}<ChevronDown size={14} className={`transition-transform ${openMenu === menu.id ? 'rotate-180' : ''}`} /></button>
          {openMenu === menu.id && <div data-nav-menu={menu.id} role="menu" aria-label={t(menu.labelKey as never)} onKeyDown={(event) => onMenuKeyDown(event, menu.id)} className="absolute left-0 top-[calc(100%+.7rem)] w-[25rem] rounded-2xl border border-black/10 bg-white/95 p-2.5 shadow-[0_24px_70px_-24px_rgba(15,23,42,.4)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95"><p className="px-3 pb-2 pt-1 font-mono text-[9px] font-bold uppercase tracking-[.18em] text-slate-400">{t(menu.eyebrowKey as never)}</p><div className="grid gap-0.5">{menu.items.map((item) => renderMenuItem(item))}</div></div>}
        </div>)}
        {mainNavLinks.map((item) => item.external
          ? <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className="nav-link focus-ring inline-flex items-center gap-1">{t(item.labelKey as never)}<ArrowUpRight size={13} /></a>
          : <Link key={item.href} href={item.href} onClick={closeNavigation} aria-current={isActive(pathname, item.href) ? 'page' : undefined} className={`nav-link focus-ring inline-flex items-center gap-1 ${isActive(pathname, item.href) ? 'bg-violet-500/[.08] text-violet-700 dark:text-violet-300' : ''}`}>{t(item.labelKey as never)}</Link>)}
      </nav>
      <div className="ml-auto hidden items-center gap-2 xl:flex"><GitHubRepositoryLink className="focus-ring inline-flex h-10 items-center gap-1.5 rounded-[.65rem] px-2.5 text-sm text-slate-600 transition hover:bg-[rgb(148_163_184_/.12)] hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/6 dark:hover:text-white" label={t('Nav.github')} />{accountControl}<Link href="/download" onClick={closeNavigation} className="focus-ring ml-1 inline-flex h-10 items-center gap-2 rounded-[.65rem] bg-linear-to-r from-blue-500 to-violet-500 px-4 font-heading text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110">{t('Nav.getClipsX')}<ArrowRight size={15} /></Link></div>
      <button type="button" onClick={() => { setMobileOpen(!mobileOpen); setAccountOpen(false); }} aria-expanded={mobileOpen} aria-label={t('Nav.menu')} className="icon-button ml-auto xl:hidden">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
    </div>
    {mobileOpen && <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-black/5 bg-white px-4 py-4 xl:hidden dark:border-white/5 dark:bg-slate-950"><nav aria-label="Mobile navigation" className="mx-auto grid max-w-2xl gap-1">{mainNavMenus.map((menu) => <div key={menu.id} className="border-b border-black/5 py-1 dark:border-white/5"><button type="button" aria-expanded={mobileSection === menu.id} onClick={() => setMobileSection(mobileSection === menu.id ? null : menu.id)} className="focus-ring flex w-full items-center justify-between rounded-lg px-3 py-3 font-heading text-sm font-bold text-slate-900 dark:text-white">{t(menu.labelKey as never)}<ChevronDown size={16} className={`transition-transform ${mobileSection === menu.id ? 'rotate-180' : ''}`} /></button>{mobileSection === menu.id && <div className="pb-2">{menu.items.map((item) => renderMenuItem(item, true))}</div>}</div>)}{mainNavLinks.map((item) => item.external ? <a key={item.href} href={item.href} target="_blank" rel="noreferrer" onClick={closeNavigation} className="focus-ring flex items-center justify-between rounded-lg px-3 py-3 font-heading text-sm font-bold text-slate-900 dark:text-white"><span>{t(item.labelKey as never)}</span><ArrowUpRight size={15} /></a> : <Link key={item.href} href={item.href} onClick={closeNavigation} className="focus-ring flex items-center justify-between rounded-lg px-3 py-3 font-heading text-sm font-bold text-slate-900 dark:text-white"><span>{t(item.labelKey as never)}</span><ArrowRight size={15} className="text-slate-400" /></Link>)}<Link href="/download" onClick={closeNavigation} className="focus-ring mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-violet-500 px-4 py-3 font-heading text-sm font-bold text-white shadow-lg shadow-violet-950/30">{t('Nav.getClipsX')}<ArrowRight size={15} /></Link></nav><div className="mx-auto mt-4 flex max-w-2xl items-center gap-2 border-t border-black/5 pt-4 dark:border-white/5"><GitHubRepositoryLink className="focus-ring inline-flex h-10 items-center gap-1.5 rounded-[.65rem] px-2.5 text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/6" label={t('Nav.github')} />{accountControl}</div></div>}
  </header>;
}
