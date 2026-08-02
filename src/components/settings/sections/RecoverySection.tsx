"use client";

import { LifeBuoy, Download, RotateCcw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsAction } from "@/components/settings/SettingsAction";
import type { SectionProps } from "@/components/settings/SettingsRegistry";

export default function RecoverySection({ session: _session }: SectionProps) {
  return (
    <div className="space-y-6">
      {/* Explanation */}
      <SettingsSection title="Recovery phrase" icon={LifeBuoy}>
        <div className="rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm text-gray-700 dark:bg-amber-500/10 dark:text-gray-200 space-y-2">
          <p>
            Your recovery phrase is a one-time secret generated during vault setup. It was shown only once and cannot be displayed again.
          </p>
          <p>
            Keep an offline copy of your recovery phrase in a secure location. It is the only way to recover your vault if all your enrolled browsers and unlock methods are lost.
          </p>
        </div>
        <SettingsAction
          label="Recovery status"
          comingSoon
          reason="Recovery status reporting will be available in a future update."
        >
          <div className="rounded-lg border border-(--vault-border) bg-(--vault-muted) px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
            Status unavailable
          </div>
        </SettingsAction>
      </SettingsSection>

      {/* Recovery actions — all planned */}
      <SettingsSection title="Recovery actions" icon={Smartphone}>
        <SettingsAction
          label="Recover a replacement device"
          comingSoon
          reason="The device recovery flow requires additional client infrastructure that is not yet built."
        >
          <Button variant="secondary" size="sm" disabled>
            <Smartphone size={14} /> Start device recovery
          </Button>
        </SettingsAction>
        <SettingsAction
          label="Export recovery kit"
          comingSoon
          reason="Recovery kit export will be available after the recovery flow is complete."
        >
          <Button variant="secondary" size="sm" disabled>
            <Download size={14} /> Export recovery kit
          </Button>
        </SettingsAction>
        <SettingsAction
          label="Rotate recovery root"
          comingSoon
          reason="Recovery root rotation depends on the full recovery flow being implemented first."
        >
          <Button variant="secondary" size="sm" disabled>
            <RotateCcw size={14} /> Rotate recovery root
          </Button>
        </SettingsAction>
      </SettingsSection>
    </div>
  );
}
