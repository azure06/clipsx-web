"use client";

import { FolderKey, Archive, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsAction } from "@/components/settings/SettingsAction";
import type { SectionProps } from "@/components/settings/SettingsRegistry";

export default function CollectionSection({ collection }: SectionProps) {
  return (
    <div className="space-y-6">
      {!collection && (
        <div className="rounded-xl border border-(--vault-border) bg-(--vault-muted) p-4 text-sm text-gray-500 dark:text-gray-400">
          Open a collection to see its settings.
        </div>
      )}

      <SettingsSection title="Collection details" icon={FolderKey}>
        <SettingsAction
          label="Collection name"
          comingSoon
          reason="Renaming collections requires encrypted metadata updates that are not yet implemented."
        >
          <input
            disabled
            className="input-vault w-full opacity-50"
            defaultValue={collection?.title ?? ""}
            placeholder="Collection name"
          />
        </SettingsAction>
        <SettingsAction
          label="Description"
          comingSoon
          reason="Collection descriptions are not yet supported."
        >
          <textarea disabled className="input-vault w-full opacity-50" rows={2} placeholder="—" />
        </SettingsAction>
      </SettingsSection>

      <SettingsSection title="Access" icon={Share2}>
        <SettingsAction
          label="Share collection"
          comingSoon
          reason="Collection sharing requires a multi-party access model that is not yet built."
        >
          <Button variant="secondary" size="sm" disabled>
            <Share2 size={14} /> Share
          </Button>
        </SettingsAction>
      </SettingsSection>

      <SettingsSection title="Lifecycle" danger>
        <SettingsAction
          label="Archive collection"
          comingSoon
          reason="Archive functionality is planned for a future release."
        >
          <Button variant="secondary" size="sm" disabled>
            <Archive size={14} /> Archive
          </Button>
        </SettingsAction>
        <SettingsAction
          label="Delete collection"
          comingSoon
          reason="Collection deletion with confirmation and encrypted cleanup is not yet implemented."
        >
          <Button variant="danger" size="sm" disabled>
            <Trash2 size={14} /> Delete collection
          </Button>
        </SettingsAction>
      </SettingsSection>
    </div>
  );
}
