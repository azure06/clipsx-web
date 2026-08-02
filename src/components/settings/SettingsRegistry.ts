import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { VaultSession } from "@/app/[locale]/(vault)/vault/VaultOnboardingClient";
import type { VaultCollection } from "@/app/[locale]/(vault)/vault/VaultOnboardingClient";

export type SectionProps = {
  session?: VaultSession;
  collection?: VaultCollection;
};

export type SettingsSectionDef = {
  id: string;
  label: string;
  icon: LucideIcon;
  group: "account" | "vault";
  getComponent: () => Promise<{ default: ComponentType<SectionProps> }>;
};

export const SECTION_IDS = [
  "account",
  "security",
  "recovery",
  "vault",
  "devices",
  "collection",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export function isSectionId(value: string | null): value is SectionId {
  return SECTION_IDS.includes(value as SectionId);
}

export const DEFAULT_SECTION: SectionId = "account";
