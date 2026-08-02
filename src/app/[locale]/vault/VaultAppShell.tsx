"use client";

import type { ReactNode } from "react";
import { FolderKey, LockKeyhole, Settings } from "lucide-react";

import { Link, usePathname } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { ToastProvider } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { useVaultSession } from "./VaultOnboardingClient";

export function VaultAppShell({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const { lock, working } = useVaultSession();
  const nav = [
    { href: "/vault/collections", label: "Collections", icon: FolderKey, active: pathname === "/vault/collections" || pathname.startsWith("/vault/collections/") },
    { href: "/vault/settings", label: "Settings", icon: Settings, active: pathname === "/vault/settings" },
  ];

  return (
    <ToastProvider>
      <div className="min-h-[calc(100dvh-4rem)] bg-(--vault-canvas) px-4 py-5 sm:px-6 lg:px-8">
        <header className="mx-auto mb-5 max-w-[120rem]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-(--vault-border) pb-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-(--vault-accent-subtle) text-(--vault-accent) shadow-inner ring-1 ring-(--vault-accent)/20">
                <LockKeyhole size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--vault-accent)">Encrypted vault</p>
                <h1 className="font-heading text-2xl font-bold">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <Button variant="outline" size="sm" loading={working} onClick={() => void lock()}>
                <LockKeyhole size={14} />
                Lock vault
              </Button>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-(--vault-accent)/20 to-transparent" />
        </header>

        <div className="mx-auto grid max-w-[120rem] gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <nav className="flex gap-1 overflow-x-auto border-b border-(--vault-border) pb-4 lg:block lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5">
            {nav.map(({ href, label, icon: Icon, active }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:mb-1 lg:flex",
                  active
                    ? "bg-(--vault-accent-subtle) text-(--vault-accent)"
                    : "text-gray-600 hover:bg-(--vault-muted) hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
                )}
              >
                {active && (
                  <span className="absolute inset-y-1 left-0 hidden w-0.5 rounded-full bg-(--vault-accent) lg:block" />
                )}
                <Icon size={17} />
                {label}
              </Link>
            ))}
          </nav>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
