"use client";

import type { ReactNode } from "react";
import { Bell, ChevronUp, FolderKey, LockKeyhole, Settings } from "lucide-react";

import { Link, usePathname } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { ToastProvider } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { useVaultSession } from "./VaultOnboardingClient";

export function VaultAppShell({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const { lock, working, email } = useVaultSession();

  const topNav = [
    { href: "/vault/collections", label: "Collections", icon: FolderKey, active: pathname === "/vault/collections" || pathname.startsWith("/vault/collections/") },
  ];

  const settingsActive = pathname === "/vault/settings";
  const initial = email ? email[0].toUpperCase() : "?";
  const allNavMobile = [...topNav, { href: "/vault/settings", label: "Settings", icon: Settings, active: settingsActive }];

  return (
    <ToastProvider>
      <div className="flex h-dvh overflow-hidden bg-(--vault-canvas)">

        {/* ── Sidebar (desktop) ───────────────────────────────────── */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-(--vault-border) lg:flex">
          {/* App wordmark */}
          <div className="flex items-center gap-2.5 px-4 py-4.5">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-(--vault-accent-subtle) text-(--vault-accent)">
              <LockKeyhole size={14} />
            </div>
            <span className="font-heading text-sm font-bold tracking-[0.18em] uppercase text-gray-900 dark:text-white">
              Vault
            </span>
          </div>

          {/* Top nav */}
          <nav className="flex flex-col gap-0.5 px-2 pt-1">
            {topNav.map(({ href, label, icon: Icon, active }) => (
              <SidebarLink key={href} href={href} label={label} icon={<Icon size={15} />} active={active} />
            ))}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Settings link */}
          <div className="px-2 pb-2">
            <SidebarLink href="/vault/settings" label="Settings" icon={<Settings size={15} />} active={settingsActive} />
          </div>

          {/* User / account card */}
          <div className="border-t border-(--vault-border) p-2">
            <Link
              href="/account"
              className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-(--vault-muted)"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-(--vault-accent-subtle) text-(--vault-accent) text-xs font-bold ring-1 ring-(--vault-accent)/20">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">{email || "Account"}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Free plan</p>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-gray-400">
                <Bell size={13} />
                <ChevronUp size={13} />
              </div>
            </Link>
          </div>
        </aside>

        {/* ── Main area ───────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* Top header — title + actions + lock */}
          <header className="flex items-center justify-between gap-4 border-b border-(--vault-border) bg-(--vault-surface) px-5 py-3 lg:px-7">
            <h1 className="font-heading text-xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h1>
            <div className="flex items-center gap-2">
              {actions}
              <Button variant="outline" size="sm" loading={working} onClick={() => void lock()}>
                <LockKeyhole size={13} />
                <span className="hidden sm:inline">Lock vault</span>
              </Button>
            </div>
          </header>

          {/* Scrollable content */}
          <main className="flex-1 overflow-y-auto bg-(--vault-surface) px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>

          {/* Mobile bottom nav */}
          <nav className="flex border-t border-(--vault-border) bg-(--vault-canvas) lg:hidden">
            {allNavMobile.map(({ href, label, icon: Icon, active }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-(--vault-accent)" : "text-gray-500 dark:text-gray-400",
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
            {/* Mobile user avatar */}
            <Link
              href="/account"
              className="flex flex-1 flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-medium text-gray-500 dark:text-gray-400"
            >
              <span className="grid h-4.5 w-4.5 place-items-center rounded-full bg-(--vault-accent-subtle) text-(--vault-accent) text-[9px] font-bold">
                {initial}
              </span>
              Account
            </Link>
          </nav>
        </div>
      </div>
    </ToastProvider>
  );
}

function SidebarLink({ href, label, icon, active }: { href: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-(--vault-accent-subtle) text-(--vault-accent)"
          : "text-gray-600 hover:bg-(--vault-muted) hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
      )}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-(--vault-accent)" />}
      {icon}
      {label}
    </Link>
  );
}
