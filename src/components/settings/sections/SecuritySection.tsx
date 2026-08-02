"use client";

import { useState } from "react";
import {
  KeyRound, KeySquare, ShieldCheck, Smartphone, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsAction } from "@/components/settings/SettingsAction";
import type { SectionProps } from "@/components/settings/SettingsRegistry";
import type { BrowserUnlockSlot } from "@/lib/vault/browser-unlock-slots";

export default function SecuritySection({ session }: SectionProps) {
  const slots = session?.record.unlockSlots ?? [];

  const [confirmationSlotId, setConfirmationSlotId] = useState(() => slots[0]?.id ?? "");
  const [confirmationPassphrase, setConfirmationPassphrase] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  const [addMode, setAddMode] = useState<"passkey" | "passphrase" | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const confirmationSlot = slots.find((s: BrowserUnlockSlot) => s.id === confirmationSlotId);
  const needsConfirmation = removeTarget !== null || addMode !== null;
  const working = session?.working ?? false;
  const error = session?.error ?? null;

  function openAdd(mode: "passkey" | "passphrase") {
    session?.clearError();
    setConfirmationPassphrase("");
    setNewPassphrase("");
    setAddMode(mode);
  }

  function openRemove(slotId: string) {
    session?.clearError();
    setConfirmationPassphrase("");
    setRemoveTarget(slotId);
  }

  function cancel() {
    setAddMode(null);
    setRemoveTarget(null);
    session?.clearError();
  }

  async function addPasskey() {
    if (!session) return;
    try {
      await session.addPasskeyUnlockSlot(confirmationSlotId, confirmationPassphrase);
      setAddMode(null);
    } catch { /* error shown via session.error */ }
  }

  async function addPassphrase() {
    if (!session) return;
    try {
      await session.addPassphraseUnlockSlot(confirmationSlotId, confirmationPassphrase, newPassphrase);
      setAddMode(null);
      setNewPassphrase("");
    } catch { /* error shown via session.error */ }
  }

  async function remove(slotId: string) {
    if (!session) return;
    try {
      await session.removeUnlockSlot(confirmationSlotId, confirmationPassphrase, slotId);
      setRemoveTarget(null);
    } catch { /* error shown via session.error */ }
  }

  return (
    <div className="space-y-6">
      {/* Vault unlock methods — functional */}
      <SettingsSection
        title="Vault unlock methods"
        description="Each method independently decrypts the same vault key."
        icon={KeyRound}
      >
        {!session ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Open your vault to manage unlock methods.
          </p>
        ) : slots.length === 0 ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            No upgradeable unlock slots. Reset this pre-production vault and enroll again.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {slots.map((slot: BrowserUnlockSlot, index: number) => (
                <div
                  key={slot.id}
                  className="flex items-center gap-3 rounded-xl border border-(--vault-border) px-4 py-3"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-(--vault-muted) text-gray-500">
                    {slot.kind === "passkey" ? <KeyRound size={16} /> : <KeySquare size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {slot.kind === "passkey" ? "Passkey" : "Passphrase"} {index + 1}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {slot.kind === "passkey" ? "Biometric / hardware key" : "Text passphrase"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-red-500 hover:text-red-600"
                    disabled={slots.length <= 1}
                    onClick={() => openRemove(slot.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>

            {!needsConfirmation && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => openAdd("passkey")}>
                  <KeyRound size={14} /> Add passkey
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openAdd("passphrase")}>
                  <KeySquare size={14} /> Add passphrase
                </Button>
              </div>
            )}

            {needsConfirmation && (
              <div className="mt-4 space-y-4 rounded-xl border border-(--vault-accent)/30 bg-(--vault-accent-subtle) p-4">
                <p className="text-sm font-semibold">
                  {removeTarget
                    ? `Remove method ${slots.findIndex((s) => s.id === removeTarget) + 1}`
                    : `Add ${addMode}`}
                </p>

                <Select
                  label="Confirm with existing method"
                  value={confirmationSlotId}
                  onChange={(e) => {
                    session.clearError();
                    setConfirmationSlotId(e.target.value);
                    setConfirmationPassphrase("");
                  }}
                >
                  {slots.map((slot: BrowserUnlockSlot, index: number) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.kind === "passkey" ? "Passkey" : "Passphrase"} {index + 1}
                    </option>
                  ))}
                </Select>

                {confirmationSlot?.kind === "passphrase" && (
                  <label className="block text-sm font-medium">
                    Current passphrase
                    <input
                      type="password"
                      value={confirmationPassphrase}
                      onChange={(e) => { session.clearError(); setConfirmationPassphrase(e.target.value); }}
                      className="input-vault mt-1.5"
                      autoComplete="current-password"
                      autoFocus
                    />
                  </label>
                )}

                {addMode === "passphrase" && (
                  <label className="block text-sm font-medium">
                    New passphrase
                    <input
                      type="password"
                      value={newPassphrase}
                      onChange={(e) => { session.clearError(); setNewPassphrase(e.target.value); }}
                      className="input-vault mt-1.5"
                      autoComplete="new-password"
                      placeholder="12+ characters"
                    />
                  </label>
                )}

                {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={cancel}>Cancel</Button>
                  {removeTarget && (
                    <Button variant="danger" size="sm" loading={working} onClick={() => void remove(removeTarget)}>
                      Remove method
                    </Button>
                  )}
                  {addMode === "passkey" && (
                    <Button size="sm" loading={working} onClick={() => void addPasskey()}>Add passkey</Button>
                  )}
                  {addMode === "passphrase" && (
                    <Button size="sm" loading={working} disabled={newPassphrase.length < 12} onClick={() => void addPassphrase()}>
                      Add passphrase
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </SettingsSection>

      {/* Recovery phrase info — static */}
      <SettingsSection title="Recovery phrase" icon={KeySquare}>
        <div className="rounded-xl border border-amber-400/40 bg-amber-50 p-4 dark:bg-amber-500/10">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            Your recovery phrase was shown only during first-time setup. Keep the original offline copy — it cannot be displayed again.
          </p>
        </div>
      </SettingsSection>

      {/* Account MFA — placeholders */}
      <SettingsSection
        title="Account two-factor authentication"
        description="Protects your account login, separate from vault unlock."
        icon={ShieldCheck}
      >
        <SettingsAction
          label="Authenticator app (TOTP)"
          comingSoon
          reason="Account MFA setup requires a complete enrollment flow that is not yet implemented."
        >
          <Button variant="secondary" size="sm" disabled>
            <Smartphone size={14} /> Set up authenticator
          </Button>
        </SettingsAction>
        <SettingsAction
          label="Hardware security key"
          comingSoon
          reason="Account-level WebAuthn is planned for a future release."
        >
          <Button variant="secondary" size="sm" disabled>
            <KeyRound size={14} /> Add security key
          </Button>
        </SettingsAction>
        <SettingsAction
          label="Backup codes"
          comingSoon
          reason="Backup codes depend on account MFA being set up first."
        >
          <Button variant="secondary" size="sm" disabled>Generate backup codes</Button>
        </SettingsAction>
      </SettingsSection>
    </div>
  );
}
