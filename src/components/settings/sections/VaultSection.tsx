"use client";

import { useEffect, useState } from "react";
import { Database, Settings2, Shield, Trash2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsAction } from "@/components/settings/SettingsAction";
import type { SectionProps } from "@/components/settings/SettingsRegistry";
import {
  AUTO_LOCK_CHOICES,
  CLIPBOARD_CLEAR_CHOICES,
  defaultVaultSettings,
  loadVaultSettings,
  saveVaultSettings,
  type VaultSettings,
} from "@/lib/vault/browser-vault-settings";

export default function VaultSection({ session }: SectionProps) {
  const accountId = session?.record.accountId ?? "anonymous";

  const [settings, setSettings] = useState<VaultSettings>(() => defaultVaultSettings(accountId));

  useEffect(() => {
    void loadVaultSettings(accountId).then(setSettings).catch(() => undefined);
  }, [accountId]);

  function change<K extends keyof VaultSettings>(key: K, value: VaultSettings[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    void saveVaultSettings(next);
  }

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <SettingsSection
        title="Appearance"
        description="Stored locally in this browser only."
        icon={Settings2}
      >
        <SettingsAction notEnforced description="Theme preference is saved but not yet applied globally.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Theme"
              value={settings.theme}
              onChange={(e) => change("theme", e.target.value as VaultSettings["theme"])}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
            <Select
              label="Density"
              value={settings.density}
              onChange={(e) => change("density", e.target.value as VaultSettings["density"])}
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </Select>
          </div>
        </SettingsAction>
      </SettingsSection>

      {/* Lock & security */}
      <SettingsSection title="Lock &amp; security" icon={Shield}>
        <SettingsAction
          notEnforced
          description="These timers are saved but not yet enforced — the vault does not auto-lock or clear the clipboard automatically."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Auto-lock after inactivity"
              value={settings.autoLockMinutes}
              onChange={(e) => {
                const match = AUTO_LOCK_CHOICES.find((c) => String(c) === e.target.value)!;
                change("autoLockMinutes", match);
              }}
            >
              {AUTO_LOCK_CHOICES.map((c) => (
                <option key={String(c)} value={String(c)}>
                  {c === "never" ? "Never" : `${c} minutes`}
                </option>
              ))}
            </Select>
            <Select
              label="Clear copied secrets after"
              value={settings.clipboardClearSeconds}
              onChange={(e) => {
                const match = CLIPBOARD_CLEAR_CHOICES.find((c) => String(c) === e.target.value)!;
                change("clipboardClearSeconds", match);
              }}
            >
              {CLIPBOARD_CLEAR_CHOICES.map((c) => (
                <option key={String(c)} value={String(c)}>
                  {c === "never" ? "Never" : `${c} seconds`}
                </option>
              ))}
            </Select>
          </div>
        </SettingsAction>
      </SettingsSection>

      {/* Editor */}
      <SettingsSection title="Editor" icon={Database}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Document width"
            value={settings.documentWidth}
            onChange={(e) => change("documentWidth", e.target.value as VaultSettings["documentWidth"])}
          >
            <option value="comfortable">Comfortable</option>
            <option value="wide">Wide</option>
          </Select>
          <Select
            label="Editor mode"
            value={settings.editorMode}
            onChange={(e) => change("editorMode", e.target.value as VaultSettings["editorMode"])}
          >
            <option value="split">Split</option>
            <option value="edit">Edit only</option>
            <option value="preview">Preview only</option>
          </Select>
          <Select
            label="Default sort"
            value={settings.sort}
            onChange={(e) => change("sort", e.target.value as VaultSettings["sort"])}
          >
            <option value="updated">Recently updated</option>
            <option value="created">Creation date</option>
            <option value="title">Title</option>
          </Select>
        </div>
        <div className="mt-5 flex flex-wrap gap-5">
          <Checkbox label="Wrap lines" checked={settings.lineWrap} onChange={(e) => change("lineWrap", e.target.checked)} />
          <Checkbox label="Spellcheck" checked={settings.spellcheck} onChange={(e) => change("spellcheck", e.target.checked)} />
          <Checkbox label="Show metadata" checked={settings.showMetadata} onChange={(e) => change("showMetadata", e.target.checked)} />
        </div>
      </SettingsSection>

      {/* Collection defaults */}
      <SettingsSection title="Collection defaults" icon={FolderOpen}>
        <SettingsAction
          label="Default collection behavior"
          comingSoon
          reason="Collection preference settings will be available in a future update."
        >
          <Button variant="secondary" size="sm" disabled>Configure defaults</Button>
        </SettingsAction>
      </SettingsSection>

      {/* Trash */}
      <SettingsSection title="Trash" icon={Trash2}>
        <SettingsAction
          label="Trash &amp; restore"
          comingSoon
          reason="A true encrypted trash model does not yet exist. Deletion is currently permanent and immediate."
        >
          <Button variant="secondary" size="sm" disabled>View trash</Button>
        </SettingsAction>
      </SettingsSection>
    </div>
  );
}
