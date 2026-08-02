"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardPaste, KeyRound, KeySquare, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select } from "@/components/ui/Select";
import { VaultAppShell } from "../VaultAppShell";
import { useVaultSession } from "../VaultOnboardingClient";
import {
  CLIPBOARD_CLEAR_CHOICES,
  AUTO_LOCK_CHOICES,
  defaultVaultSettings,
  loadVaultSettings,
  saveVaultSettings,
  type VaultSettings,
} from "@/lib/vault/browser-vault-settings";

type Tab = "security" | "devices" | "preferences";

const TABS: { id: Tab; label: string }[] = [
  { id: "security", label: "Security" },
  { id: "devices", label: "Devices" },
  { id: "preferences", label: "Preferences" },
];

export function VaultSettingsClient() {
  const { record, reviewDeviceApproval, approveDevice, addPasskeyUnlockSlot, addPassphraseUnlockSlot, removeUnlockSlot, working, error, clearError } = useVaultSession();
  const [tab, setTab] = useState<Tab>("security");

  // Device approval state
  const [offer, setOffer] = useState("");
  const [approval, setApproval] = useState<{ command: Uint8Array; sas: string; deviceId: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [approvalReceipt, setApprovalReceipt] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<VaultSettings>(() => defaultVaultSettings(record.accountId));
  useEffect(() => { void loadVaultSettings(record.accountId).then(setSettings).catch(() => undefined); }, [record.accountId]);
  function change<K extends keyof VaultSettings>(key: K, value: VaultSettings[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    void saveVaultSettings(next);
  }

  // Unlock slot confirmation state
  const slots = record.unlockSlots ?? [];
  const [confirmationSlotId, setConfirmationSlotId] = useState(() => slots[0]?.id ?? "");
  const [confirmationPassphrase, setConfirmationPassphrase] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  const confirmationSlot = slots.find((slot) => slot.id === confirmationSlotId);

  async function review() {
    try {
      setApproval(await reviewDeviceApproval(offer));
      setConfirmed(false);
    } catch { /* session error visible below */ }
  }

  async function approve() {
    if (!approval || !confirmed) return;
    try {
      await approveDevice(approval.command);
      setOffer(""); setApproval(null); setConfirmed(false);
      setApprovalReceipt(`Browser ${approval.deviceId.slice(0, 8)} was approved. It can now finish its local unlock.`);
    } catch { /* session error visible below */ }
  }

  async function addPasskey() {
    try { await addPasskeyUnlockSlot(confirmationSlotId, confirmationPassphrase); } catch { /* session error visible below */ }
  }

  async function addPassphrase() {
    try { await addPassphraseUnlockSlot(confirmationSlotId, confirmationPassphrase, newPassphrase); } catch { /* session error visible below */ }
  }

  async function remove(slotId: string) {
    try { await removeUnlockSlot(confirmationSlotId, confirmationPassphrase, slotId); } catch { /* session error visible below */ }
  }

  return (
    <VaultAppShell title="Settings">
      <div className="max-w-2xl">
        <h2 className="font-heading text-3xl font-bold tracking-tight">Vault settings</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Manage security, devices, and workspace preferences.</p>

        {/* Tab bar */}
        <div className="mt-6 flex gap-1 rounded-xl border border-(--vault-border) bg-(--vault-muted)/40 p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === id ? "bg-(--vault-surface) shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "security" && (
            <SecurityTab
              slots={slots}
              confirmationSlotId={confirmationSlotId}
              setConfirmationSlotId={(id) => { clearError(); setConfirmationSlotId(id); setConfirmationPassphrase(""); }}
              confirmationSlot={confirmationSlot}
              confirmationPassphrase={confirmationPassphrase}
              setConfirmationPassphrase={(v) => { clearError(); setConfirmationPassphrase(v); }}
              newPassphrase={newPassphrase}
              setNewPassphrase={(v) => { clearError(); setNewPassphrase(v); }}
              working={working}
              error={error}
              onAddPasskey={() => void addPasskey()}
              onAddPassphrase={() => void addPassphrase()}
              onRemove={(id) => void remove(id)}
            />
          )}
          {tab === "devices" && (
            <DevicesTab
              offer={offer}
              setOffer={(v) => { clearError(); setOffer(v); setApproval(null); }}
              approval={approval}
              confirmed={confirmed}
              setConfirmed={setConfirmed}
              approvalReceipt={approvalReceipt}
              working={working}
              error={error}
              onReview={() => void review()}
              onApprove={() => void approve()}
              onCancelApproval={() => { setApproval(null); setConfirmed(false); }}
            />
          )}
          {tab === "preferences" && (
            <PreferencesTab settings={settings} onChange={change} />
          )}
        </div>
      </div>
    </VaultAppShell>
  );
}

// ─── Security tab ─────────────────────────────────────────────────────────────

function SecurityTab({
  slots, confirmationSlotId, setConfirmationSlotId, confirmationSlot,
  confirmationPassphrase, setConfirmationPassphrase, newPassphrase, setNewPassphrase,
  working, error, onAddPasskey, onAddPassphrase, onRemove,
}: {
  slots: NonNullable<ReturnType<typeof useVaultSession>["record"]["unlockSlots"]>;
  confirmationSlotId: string;
  setConfirmationSlotId: (id: string) => void;
  confirmationSlot: { kind: "passkey" | "passphrase" } | undefined;
  confirmationPassphrase: string;
  setConfirmationPassphrase: (v: string) => void;
  newPassphrase: string;
  setNewPassphrase: (v: string) => void;
  working: boolean;
  error: string | null;
  onAddPasskey: () => void;
  onAddPassphrase: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-(--vault-border) p-5 sm:p-6">
        <div className="flex gap-3">
          <KeyRound className="mt-0.5 shrink-0 text-(--vault-accent)" size={22} />
          <div>
            <h3 className="font-heading text-xl font-bold">Local unlock methods</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Each method unlocks the same encrypted browser vault. Confirm an existing method before changing them.</p>
          </div>
        </div>

        {slots.length === 0 ? (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">This browser record has no upgradeable unlock slots. Reset this pre-production browser vault and enroll again.</p>
        ) : (
          <>
            <Select
              label="Confirm with"
              value={confirmationSlotId}
              onChange={(e) => setConfirmationSlotId(e.target.value)}
              className="mt-5"
            >
              {slots.map((slot, index) => (
                <option key={slot.id} value={slot.id}>
                  {slot.kind === "passkey" ? "Vault passkey" : "Vault passphrase"} {index + 1}
                </option>
              ))}
            </Select>

            {confirmationSlot?.kind === "passphrase" && (
              <label className="mt-4 block text-sm font-medium">
                Current vault passphrase
                <input
                  type="password"
                  value={confirmationPassphrase}
                  onChange={(e) => setConfirmationPassphrase(e.target.value)}
                  className="input-vault mt-1.5"
                  autoComplete="current-password"
                />
              </label>
            )}

            <div className="mt-5 space-y-2">
              {slots.map((slot, index) => (
                <div key={slot.id} className="flex items-center justify-between gap-3 rounded-lg border border-(--vault-border) px-3 py-2.5 text-sm">
                  <span className="font-medium">{slot.kind === "passkey" ? "Vault passkey" : "Vault passphrase"} {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                    loading={working}
                    disabled={slots.length <= 1}
                    onClick={() => onRemove(slot.id)}
                  >
                    <Trash2 size={14} /> Remove
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" loading={working} onClick={onAddPasskey}>
                <KeyRound size={16} /> Add passkey
              </Button>
              <div>
                <label className="block text-sm font-medium">
                  New vault passphrase
                  <input
                    type="password"
                    value={newPassphrase}
                    onChange={(e) => setNewPassphrase(e.target.value)}
                    className="input-vault mt-1.5"
                    autoComplete="new-password"
                  />
                </label>
                <Button className="mt-2 w-full" variant="secondary" loading={working} disabled={newPassphrase.length < 12} onClick={onAddPassphrase}>
                  Add passphrase
                </Button>
              </div>
            </div>

            {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </>
        )}
      </section>

      <section className="rounded-xl border border-amber-400/40 bg-amber-50 p-5 dark:bg-amber-500/10">
        <div className="flex gap-3">
          <KeySquare className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" size={22} />
          <div>
            <h3 className="font-heading text-lg font-bold">Recovery phrase</h3>
            <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-200">
              Your recovery phrase is shown only during first-time setup. Keep the original offline copy; it cannot be displayed again from this browser.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Devices tab ──────────────────────────────────────────────────────────────

function DevicesTab({
  offer, setOffer, approval, confirmed, setConfirmed, approvalReceipt,
  working, error, onReview, onApprove, onCancelApproval,
}: {
  offer: string;
  setOffer: (v: string) => void;
  approval: { command: Uint8Array; sas: string; deviceId: string } | null;
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
  approvalReceipt: string | null;
  working: boolean;
  error: string | null;
  onReview: () => void;
  onApprove: () => void;
  onCancelApproval: () => void;
}) {
  return (
    <section className="rounded-xl border border-(--vault-border) p-5 sm:p-6">
      <div className="flex gap-3">
        <ShieldCheck className="mt-0.5 shrink-0 text-(--vault-accent)" size={22} />
        <div>
          <h3 className="font-heading text-xl font-bold">Approve another browser</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            On the new browser, navigate to your vault and click "Copy approval offer". Paste the payload here, then compare the security code on both devices before confirming.
          </p>
        </div>
      </div>

      <label className="mt-5 block text-sm font-medium text-gray-700 dark:text-gray-200">
        Approval payload
        <textarea
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          className="input-vault mt-1.5 min-h-28 font-mono text-xs"
          placeholder="Paste the QR payload here"
        />
      </label>

      {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {approvalReceipt && <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{approvalReceipt}</p>}

      {!approval ? (
        <Button className="mt-4" loading={working} disabled={!offer.trim()} onClick={onReview}>
          <ClipboardPaste size={16} /> Verify approval payload
        </Button>
      ) : (
        <div className="mt-5 rounded-xl border border-(--vault-accent)/30 bg-(--vault-accent-subtle) p-5">
          <p className="text-sm font-semibold">Compare this code on both browsers</p>
          <p className="mt-3 font-mono text-2xl font-bold tracking-wider text-(--vault-accent)">{approval.sas}</p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 cursor-pointer rounded checked:accent-cyan-600"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>I compared the code on both devices and it matches.</span>
          </label>
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={onCancelApproval}>Cancel</Button>
            <Button loading={working} disabled={!confirmed} onClick={onApprove}>
              <CheckCircle2 size={16} /> Approve browser
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Preferences tab ──────────────────────────────────────────────────────────

function PreferencesTab({ settings, onChange }: { settings: VaultSettings; onChange: <K extends keyof VaultSettings>(key: K, value: VaultSettings[K]) => void }) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-(--vault-border) p-5 sm:p-6">
        <h3 className="font-heading text-xl font-bold">Appearance</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">These preferences are stored locally and never leave this browser.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Select
            label="Theme"
            value={settings.theme}
            onChange={(e) => onChange("theme", e.target.value as VaultSettings["theme"])}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
          <Select
            label="Density"
            value={settings.density}
            onChange={(e) => onChange("density", e.target.value as VaultSettings["density"])}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </Select>
        </div>
      </section>

      <section className="rounded-xl border border-(--vault-border) p-5 sm:p-6">
        <h3 className="font-heading text-xl font-bold">Lock &amp; security</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Select
            label="Auto-lock after inactivity"
            value={settings.autoLockMinutes}
            onChange={(e) => {
              const match = AUTO_LOCK_CHOICES.find((c) => String(c) === e.target.value)!;
              onChange("autoLockMinutes", match);
            }}
          >
            {AUTO_LOCK_CHOICES.map((c) => (
              <option key={String(c)} value={String(c)}>{c === "never" ? "Never" : `${c} minutes`}</option>
            ))}
          </Select>
          <Select
            label="Clear copied secrets after"
            value={settings.clipboardClearSeconds}
            onChange={(e) => {
              const match = CLIPBOARD_CLEAR_CHOICES.find((c) => String(c) === e.target.value)!;
              onChange("clipboardClearSeconds", match);
            }}
          >
            {CLIPBOARD_CLEAR_CHOICES.map((c) => (
              <option key={String(c)} value={String(c)}>{c === "never" ? "Never" : `${c} seconds`}</option>
            ))}
          </Select>
        </div>
      </section>

      <section className="rounded-xl border border-(--vault-border) p-5 sm:p-6">
        <h3 className="font-heading text-xl font-bold">Editor</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Select
            label="Document width"
            value={settings.documentWidth}
            onChange={(e) => onChange("documentWidth", e.target.value as VaultSettings["documentWidth"])}
          >
            <option value="comfortable">Comfortable</option>
            <option value="wide">Wide</option>
          </Select>
          <Select
            label="Editor mode"
            value={settings.editorMode}
            onChange={(e) => onChange("editorMode", e.target.value as VaultSettings["editorMode"])}
          >
            <option value="split">Split</option>
            <option value="edit">Edit only</option>
            <option value="preview">Preview only</option>
          </Select>
          <Select
            label="Default sort"
            value={settings.sort}
            onChange={(e) => onChange("sort", e.target.value as VaultSettings["sort"])}
          >
            <option value="updated">Recently updated</option>
            <option value="created">Creation date</option>
            <option value="title">Title</option>
          </Select>
        </div>
        <div className="mt-5 flex flex-wrap gap-5">
          <Checkbox label="Wrap lines" checked={settings.lineWrap} onChange={(e) => onChange("lineWrap", e.target.checked)} />
          <Checkbox label="Spellcheck" checked={settings.spellcheck} onChange={(e) => onChange("spellcheck", e.target.checked)} />
          <Checkbox label="Show metadata" checked={settings.showMetadata} onChange={(e) => onChange("showMetadata", e.target.checked)} />
        </div>
      </section>
    </div>
  );
}
