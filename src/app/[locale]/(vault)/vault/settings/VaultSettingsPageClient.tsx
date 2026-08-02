"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useVaultSession } from "../VaultOnboardingClient";
import { SettingsLayout, isSectionId, DEFAULT_SECTION, type SectionId } from "@/components/settings/SettingsLayout";
import { VaultAppShell } from "../VaultAppShell";

export function VaultSettingsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const session = useVaultSession();

  const raw = searchParams.get("section");
  const activeSection: SectionId = isSectionId(raw) ? raw : DEFAULT_SECTION;

  function handleSectionChange(id: SectionId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", id);
    router.replace(`/vault/settings?${params.toString()}`);
  }

  return (
    <VaultAppShell title="Settings">
      <SettingsLayout
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        session={session}
      />
    </VaultAppShell>
  );
}
