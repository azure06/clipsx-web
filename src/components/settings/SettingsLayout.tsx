"use client";

import { lazy, Suspense, useId } from "react";
import {
  User, ShieldCheck, LifeBuoy, Settings2, Monitor, FolderKey, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_SECTION, SECTION_IDS, isSectionId, type SectionId } from "./SettingsRegistry";
import type { SectionProps } from "./SettingsRegistry";

const SECTION_DEFS: {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  group: "account" | "vault";
}[] = [
  { id: "account",    label: "Account",    icon: User,        group: "account" },
  { id: "security",   label: "Security",   icon: ShieldCheck, group: "vault"   },
  { id: "recovery",   label: "Recovery",   icon: LifeBuoy,    group: "vault"   },
  { id: "vault",      label: "Vault",      icon: Settings2,   group: "vault"   },
  { id: "devices",    label: "Devices",    icon: Monitor,     group: "vault"   },
  { id: "collection", label: "Collection", icon: FolderKey,   group: "vault"   },
];

const SECTION_COMPONENTS: Record<SectionId, React.LazyExoticComponent<React.ComponentType<SectionProps>>> = {
  account:    lazy(() => import("./sections/AccountSection")),
  security:   lazy(() => import("./sections/SecuritySection")),
  recovery:   lazy(() => import("./sections/RecoverySection")),
  vault:      lazy(() => import("./sections/VaultSection")),
  devices:    lazy(() => import("./sections/DevicesSection")),
  collection: lazy(() => import("./sections/CollectionSection")),
};

interface SettingsLayoutProps {
  activeSection: string;
  onSectionChange: (id: SectionId) => void;
  session?: SectionProps["session"];
  collection?: SectionProps["collection"];
  titleId?: string;
}

export function SettingsLayout({
  activeSection,
  onSectionChange,
  session,
  collection,
  titleId,
}: SettingsLayoutProps) {
  const fallbackId = useId();
  const labelId = titleId ?? fallbackId;
  const safe = isSectionId(activeSection) ? activeSection : DEFAULT_SECTION;
  const ActiveComponent = SECTION_COMPONENTS[safe];
  const activeDef = SECTION_DEFS.find((d) => d.id === safe)!;

  const accountSections = SECTION_DEFS.filter((d) => d.group === "account");
  const vaultSections = SECTION_DEFS.filter((d) => d.group === "vault");

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Sidebar — desktop */}
      <nav
        aria-label="Settings sections"
        className="hidden w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-(--vault-border) p-3 lg:flex"
      >
        <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Account
        </p>
        {accountSections.map((def) => (
          <SidebarItem
            key={def.id}
            def={def}
            active={safe === def.id}
            onClick={() => onSectionChange(def.id)}
          />
        ))}
        <p className="mb-1 mt-4 px-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Vault
        </p>
        {vaultSections.map((def) => (
          <SidebarItem
            key={def.id}
            def={def}
            active={safe === def.id}
            onClick={() => onSectionChange(def.id)}
          />
        ))}
      </nav>

      {/* Mobile section picker */}
      <div className="flex gap-1 overflow-x-auto border-b border-(--vault-border) p-2 lg:hidden">
        {SECTION_DEFS.map((def) => {
          const Icon = def.icon;
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => onSectionChange(def.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                safe === def.id
                  ? "bg-(--vault-accent-subtle) text-(--vault-accent)"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
              )}
            >
              <Icon size={13} />
              {def.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 lg:p-8">
        <h2
          id={labelId}
          className="mb-5 flex items-center gap-2 font-heading text-lg font-bold lg:mb-6 lg:text-xl"
        >
          <span className="shrink-0 text-(--vault-accent)">
            <activeDef.icon size={18} />
          </span>
          {activeDef.label}
        </h2>
        <Suspense fallback={<SectionSkeleton />}>
          <ActiveComponent session={session} collection={collection} />
        </Suspense>
      </div>
    </div>
  );
}

function SidebarItem({
  def,
  active,
  onClick,
}: {
  def: (typeof SECTION_DEFS)[number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = def.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-(--vault-accent-subtle) text-(--vault-accent)"
          : "text-gray-600 hover:bg-(--vault-muted) hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100",
      )}
    >
      <Icon size={15} />
      {def.label}
    </button>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-(--vault-border) p-6 space-y-3 animate-pulse">
          <div className="h-4 w-32 rounded bg-(--vault-muted)" />
          <div className="h-3 w-48 rounded bg-(--vault-muted)" />
          <div className="h-9 w-full rounded-lg bg-(--vault-muted)" />
        </div>
      ))}
    </div>
  );
}

export type { SectionId };
export { isSectionId, DEFAULT_SECTION, SECTION_IDS };
