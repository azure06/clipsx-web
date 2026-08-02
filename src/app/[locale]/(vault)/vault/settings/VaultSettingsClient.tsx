"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2, ClipboardPaste, Database, Download, KeyRound, KeySquare,
  Monitor, Settings2, Shield, ShieldCheck, Smartphone, Trash2, Upload,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { VaultAppShell } from "../VaultAppShell";
import { useVaultSession } from "../VaultOnboardingClient";
import {
  forgetBrowserDeviceRecord,
  listBrowserDeviceRecords,
  type BrowserDeviceRecord,
} from "@/lib/vault/browser-device-store";
import {
  AUTO_LOCK_CHOICES,
  CLIPBOARD_CLEAR_CHOICES,
  defaultVaultSettings,
  loadVaultSettings,
  saveVaultSettings,
  type VaultSettings,
} from "@/lib/vault/browser-vault-settings";

type Tab = "general" | "security" | "devices" | "data";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "security", label: "Security", icon: Shield },
  { id: "devices", label: "Devices", icon: Monitor },
  { id: "data", label: "Data", icon: Database },
];

export function VaultSettingsClient() {
  const {
    record, reviewDeviceApproval, approveDevice,
    addPasskeyUnlockSlot, addPassphraseUnlockSlot, removeUnlockSlot,
    working, error, clearError,
  } = useVaultSession();
  const [tab, setTab] = useState<Tab>("general");

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

  // Unlock slot state
  const slots = record.unlockSlots ?? [];
  const [confirmationSlotId, setConfirmationSlotId] = useState(() => slots[0]?.id ?? "");
  const [confirmationPassphrase, setConfirmationPassphrase] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  const [addMode, setAddMode] = useState<"passkey" | "passphrase" | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const confirmationSlot = slots.find((slot) => slot.id === confirmationSlotId);

  async function review() {
    try { setApproval(await reviewDeviceApproval(offer)); setConfirmed(false); } catch { /* visible below */ }
  }

  async function approve() {
    if (!approval || !confirmed) return;
    try {
      await approveDevice(approval.command);
      setOffer(""); setApproval(null); setConfirmed(false);
      setApprovalReceipt(`Browser ${approval.deviceId.slice(0, 8)} was approved.`);
    } catch { /* visible below */ }
  }

  async function addPasskey() {
    try { await addPasskeyUnlockSlot(confirmationSlotId, confirmationPassphrase); setAddMode(null); } catch { /* visible below */ }
  }

  async function addPassphrase() {
    try {
      await addPassphraseUnlockSlot(confirmationSlotId, confirmationPassphrase, newPassphrase);
      setAddMode(null); setNewPassphrase("");
    } catch { /* visible below */ }
  }

  async function remove(slotId: string) {
    try { await removeUnlockSlot(confirmationSlotId, confirmationPassphrase, slotId); setRemoveTarget(null); } catch { /* visible below */ }
  }

  function openAdd(mode: "passkey" | "passphrase") {
    clearError(); setConfirmationPassphrase(""); setNewPassphrase(""); setAddMode(mode);
  }

  function openRemove(slotId: string) {
    clearError(); setConfirmationPassphrase(""); setRemoveTarget(slotId);
  }

  return (
    <VaultAppShell title="Settings">
      <div className="max-w-2xl">
        {/* Tab bar */}
        <div className="mb-6 flex gap-0.5 overflow-x-auto rounded-xl border border-(--vault-border) bg-(--vault-muted)/40 p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${tab === id ? "bg-(--vault-surface) shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {tab === "general" && <GeneralTab settings={settings} onChange={change} />}
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
            addMode={addMode}
            setAddMode={openAdd}
            removeTarget={removeTarget}
            setRemoveTarget={openRemove}
            working={working}
            error={error}
            onAddPasskey={() => void addPasskey()}
            onAddPassphrase={() => void addPassphrase()}
            onRemove={(id) => void remove(id)}
            onCancelAction={() => { setAddMode(null); setRemoveTarget(null); clearError(); }}
          />
        )}
        {tab === "devices" && (
          <DevicesTab
            record={record}
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
        {tab === "data" && <DataTab record={record} />}
      </div>
    </VaultAppShell>
  );
}

// ─── General tab ──────────────────────────────────────────────────────────────

function GeneralTab({ settings, onChange }: { settings: VaultSettings; onChange: <K extends keyof VaultSettings>(key: K, value: VaultSettings[K]) => void }) {
  return (
    <div className="space-y-6">
      <SettingsSection title="Appearance" description="Stored locally, never sent to the server." icon={<Settings2 size={16} />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Theme" value={settings.theme} onChange={(e) => onChange("theme", e.target.value as VaultSettings["theme"])}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
          <Select label="Density" value={settings.density} onChange={(e) => onChange("density", e.target.value as VaultSettings["density"])}>
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </Select>
        </div>
      </SettingsSection>

      <SettingsSection title="Lock &amp; security" icon={<Shield size={16} />}>
        <div className="grid gap-4 sm:grid-cols-2">
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
      </SettingsSection>

      <SettingsSection title="Editor" icon={<Database size={16} />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Document width" value={settings.documentWidth} onChange={(e) => onChange("documentWidth", e.target.value as VaultSettings["documentWidth"])}>
            <option value="comfortable">Comfortable</option>
            <option value="wide">Wide</option>
          </Select>
          <Select label="Editor mode" value={settings.editorMode} onChange={(e) => onChange("editorMode", e.target.value as VaultSettings["editorMode"])}>
            <option value="split">Split</option>
            <option value="edit">Edit only</option>
            <option value="preview">Preview only</option>
          </Select>
          <Select label="Default sort" value={settings.sort} onChange={(e) => onChange("sort", e.target.value as VaultSettings["sort"])}>
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
      </SettingsSection>
    </div>
  );
}

// ─── Security tab ─────────────────────────────────────────────────────────────

type SecurityTabProps = {
  slots: NonNullable<ReturnType<typeof useVaultSession>["record"]["unlockSlots"]>;
  confirmationSlotId: string;
  setConfirmationSlotId: (id: string) => void;
  confirmationSlot: { kind: "passkey" | "passphrase" } | undefined;
  confirmationPassphrase: string;
  setConfirmationPassphrase: (v: string) => void;
  newPassphrase: string;
  setNewPassphrase: (v: string) => void;
  addMode: "passkey" | "passphrase" | null;
  setAddMode: (mode: "passkey" | "passphrase") => void;
  removeTarget: string | null;
  setRemoveTarget: (id: string) => void;
  working: boolean;
  error: string | null;
  onAddPasskey: () => void;
  onAddPassphrase: () => void;
  onRemove: (id: string) => void;
  onCancelAction: () => void;
};

function SecurityTab({
  slots, confirmationSlotId, setConfirmationSlotId, confirmationSlot,
  confirmationPassphrase, setConfirmationPassphrase, newPassphrase, setNewPassphrase,
  addMode, setAddMode, removeTarget, setRemoveTarget,
  working, error, onAddPasskey, onAddPassphrase, onRemove, onCancelAction,
}: SecurityTabProps) {
  const needsConfirmation = removeTarget !== null || addMode !== null;

  return (
    <div className="space-y-6">
      <SettingsSection title="Unlock methods" description="Each method independently decrypts the same vault." icon={<KeyRound size={16} />}>
        {slots.length === 0 ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            No upgradeable unlock slots. Reset this pre-production vault and enroll again.
          </p>
        ) : (
          <div className="space-y-2">
            {slots.map((slot, index) => (
              <div key={slot.id} className="flex items-center gap-3 rounded-xl border border-(--vault-border) px-4 py-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-(--vault-muted) text-gray-500">
                  {slot.kind === "passkey" ? <KeyRound size={16} /> : <KeySquare size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{slot.kind === "passkey" ? "Passkey" : "Passphrase"} {index + 1}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {slot.kind === "passkey" ? "Biometric / hardware key" : "Text passphrase"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-red-500 hover:text-red-600"
                  disabled={slots.length <= 1}
                  onClick={() => setRemoveTarget(slot.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}

        {slots.length > 0 && !needsConfirmation && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAddMode("passkey")}>
              <KeyRound size={14} /> Add passkey
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setAddMode("passphrase")}>
              <KeySquare size={14} /> Add passphrase
            </Button>
          </div>
        )}

        {needsConfirmation && (
          <div className="mt-4 rounded-xl border border-(--vault-accent)/30 bg-(--vault-accent-subtle) p-4 space-y-4">
            <p className="text-sm font-semibold">
              {removeTarget
                ? `Remove method ${slots.findIndex((s) => s.id === removeTarget) + 1}`
                : `Add ${addMode}`}
            </p>

            <Select
              label="Confirm with existing method"
              value={confirmationSlotId}
              onChange={(e) => setConfirmationSlotId(e.target.value)}
            >
              {slots.map((slot, index) => (
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
                  onChange={(e) => setConfirmationPassphrase(e.target.value)}
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
                  onChange={(e) => setNewPassphrase(e.target.value)}
                  className="input-vault mt-1.5"
                  autoComplete="new-password"
                  placeholder="12+ characters"
                />
              </label>
            )}

            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onCancelAction}>Cancel</Button>
              {removeTarget && (
                <Button variant="danger" size="sm" loading={working} onClick={() => onRemove(removeTarget)}>
                  Remove method
                </Button>
              )}
              {addMode === "passkey" && (
                <Button size="sm" loading={working} onClick={onAddPasskey}>Add passkey</Button>
              )}
              {addMode === "passphrase" && (
                <Button size="sm" loading={working} disabled={newPassphrase.length < 12} onClick={onAddPassphrase}>
                  Add passphrase
                </Button>
              )}
            </div>
          </div>
        )}
      </SettingsSection>

      <section className="rounded-xl border border-amber-400/40 bg-amber-50 p-5 dark:bg-amber-500/10">
        <div className="flex gap-3">
          <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <KeySquare size={16} />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold">Recovery phrase</h3>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
              Your recovery phrase was shown only during first-time setup. Keep the original offline copy — it cannot be displayed again.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Devices tab ──────────────────────────────────────────────────────────────

function DevicesTab({
  record, offer, setOffer, approval, confirmed, setConfirmed, approvalReceipt,
  working, error, onReview, onApprove, onCancelApproval,
}: {
  record: ReturnType<typeof useVaultSession>["record"];
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
  const [devices, setDevices] = useState<BrowserDeviceRecord[]>([]);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  useEffect(() => {
    void listBrowserDeviceRecords(record.accountId).then(setDevices).catch(() => undefined);
  }, [record.accountId]);

  async function removeDevice(deviceId: string) {
    await forgetBrowserDeviceRecord(record.accountId, deviceId);
    setDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
    setRemoveConfirmId(null);
  }

  return (
    <div className="space-y-6">
      <SettingsSection title="Enrolled browsers" icon={<Smartphone size={16} />} description="Browsers that have a local copy of the encrypted vault bundle.">
        <div className="space-y-2">
          {devices.map((device) => {
            const isCurrent = device.deviceId === record.deviceId;
            return (
              <div key={device.deviceId} className="flex items-center gap-3 rounded-xl border border-(--vault-border) px-4 py-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-(--vault-muted) text-gray-500">
                  <Monitor size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold">{device.deviceId.slice(0, 14)}…</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enrolled {new Date(device.createdAt).toLocaleDateString()}
                    {isCurrent && (
                      <span className="ml-2 rounded-full bg-(--vault-accent-subtle) px-1.5 py-0.5 text-[10px] font-bold text-(--vault-accent)">
                        This browser
                      </span>
                    )}
                  </p>
                </div>
                {!isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-red-500 hover:text-red-600"
                    onClick={() => setRemoveConfirmId(device.deviceId)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            );
          })}
          {devices.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No device records found in this browser.</p>
          )}
        </div>
      </SettingsSection>

      <SettingsSection title="Approve another browser" icon={<ShieldCheck size={16} />} description="On the new browser, navigate to your vault and copy the approval offer. Paste it here, then compare the security code on both devices.">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Approval payload
          <textarea
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            className="input-vault mt-1.5 min-h-24 font-mono text-xs"
            placeholder="Paste the approval offer payload here"
          />
        </label>

        {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {approvalReceipt && <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{approvalReceipt}</p>}

        {!approval ? (
          <Button className="mt-3" loading={working} disabled={!offer.trim()} onClick={onReview}>
            <ClipboardPaste size={16} /> Verify payload
          </Button>
        ) : (
          <div className="mt-4 rounded-xl border border-(--vault-accent)/30 bg-(--vault-accent-subtle) p-4">
            <p className="text-sm font-semibold">Compare this code on both browsers</p>
            <p className="mt-2 font-mono text-2xl font-bold tracking-wider text-(--vault-accent)">{approval.sas}</p>
            <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 cursor-pointer rounded checked:accent-cyan-600"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>The codes match on both devices.</span>
            </label>
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" size="sm" onClick={onCancelApproval}>Cancel</Button>
              <Button size="sm" loading={working} disabled={!confirmed} onClick={onApprove}>
                <CheckCircle2 size={15} /> Approve browser
              </Button>
            </div>
          </div>
        )}
      </SettingsSection>

      <Dialog open={removeConfirmId !== null} onClose={() => setRemoveConfirmId(null)}>
        <DialogBody>
          <DialogTitle>Remove browser record</DialogTitle>
          <DialogDescription>
            This removes the local vault bundle for device <strong className="font-mono">{removeConfirmId?.slice(0, 14)}…</strong>. The device will need to re-enroll to access the vault again.
          </DialogDescription>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setRemoveConfirmId(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => void (removeConfirmId && removeDevice(removeConfirmId))}>Remove</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

// ─── Data tab ─────────────────────────────────────────────────────────────────

function DataTab({ record }: { record: ReturnType<typeof useVaultSession>["record"] }) {
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  async function removeBrowser() {
    await forgetBrowserDeviceRecord(record.accountId, record.deviceId);
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <SettingsSection title="Export vault data" icon={<Download size={16} />} description="Download your encrypted notes as a JSON archive. You'll need your passphrase or passkey to decrypt them.">
        <Button variant="secondary" disabled title="Coming soon">
          <Download size={15} /> Export notes
        </Button>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Export is coming in a future update.</p>
      </SettingsSection>

      <SettingsSection title="Import vault data" icon={<Upload size={16} />} description="Import notes from a previous export or migrate from another vault manager.">
        <Button variant="secondary" disabled title="Coming soon">
          <Upload size={15} /> Import notes
        </Button>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Import is coming in a future update.</p>
      </SettingsSection>

      <section className="rounded-xl border border-red-300/50 bg-red-50/50 p-5 dark:border-red-800/40 dark:bg-red-900/10">
        <h3 className="font-heading text-base font-bold text-red-700 dark:text-red-400">Danger zone</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Remove this browser&apos;s local vault record. The encrypted bundle and unlock keys are erased from this device only — server-side ciphertext is unaffected. You can re-enroll at any time.
        </p>
        <Button className="mt-4" variant="danger" onClick={() => setRemoveDialogOpen(true)}>
          <Trash2 size={15} /> Remove this browser
        </Button>
      </section>

      <Dialog open={removeDialogOpen} onClose={() => setRemoveDialogOpen(false)}>
        <DialogBody>
          <DialogTitle>Remove this browser?</DialogTitle>
          <DialogDescription>
            This erases the local vault bundle and all unlock keys from this browser. Your encrypted notes remain on the server. To access the vault again, you&apos;ll need to re-enroll from an approved device.
          </DialogDescription>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setRemoveDialogOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => void removeBrowser()}>Remove &amp; reload</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

// ─── Shared section wrapper ────────────────────────────────────────────────────

function SettingsSection({
  title, description, icon, children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-(--vault-border) p-5 sm:p-6">
      <div className="mb-5 flex gap-3">
        {icon && (
          <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-(--vault-muted) text-(--vault-accent)">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-heading text-base font-bold">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
