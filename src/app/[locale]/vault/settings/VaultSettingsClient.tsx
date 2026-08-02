"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardPaste, KeyRound, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { VaultAppShell } from "../VaultAppShell";
import { useVaultSession } from "../VaultOnboardingClient";
import { CLIPBOARD_CLEAR_CHOICES, AUTO_LOCK_CHOICES, defaultVaultSettings, loadVaultSettings, saveVaultSettings, type VaultSettings } from "@/lib/vault/browser-vault-settings";

export function VaultSettingsClient() {
  const { record, reviewDeviceApproval, approveDevice, addPasskeyUnlockSlot, addPassphraseUnlockSlot, removeUnlockSlot, working, error, clearError } = useVaultSession();
  const [offer, setOffer] = useState("");
  const [approval, setApproval] = useState<{ command: Uint8Array; sas: string; deviceId: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [approvalReceipt, setApprovalReceipt] = useState<string | null>(null);
  const [settings, setSettings] = useState<VaultSettings>(() => defaultVaultSettings(record.accountId));
  const slots = record.unlockSlots ?? [];
  const [confirmationSlotId, setConfirmationSlotId] = useState(() => slots[0]?.id ?? "");
  const [confirmationPassphrase, setConfirmationPassphrase] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  useEffect(() => { void loadVaultSettings(record.accountId).then(setSettings).catch(() => undefined); }, [record.accountId]);
  function change<K extends keyof VaultSettings>(key: K, value: VaultSettings[K]) { const next = { ...settings, [key]: value }; setSettings(next); void saveVaultSettings(next); }

  async function review() {
    try {
      setApproval(await reviewDeviceApproval(offer));
      setConfirmed(false);
    } catch { /* session error is visible below */ }
  }

  async function approve() {
    if (!approval || !confirmed) return;
    try {
      await approveDevice(approval.command);
      setOffer("");
      setApproval(null);
      setConfirmed(false);
      setApprovalReceipt(`Browser ${approval.deviceId.slice(0, 8)} was approved. It can now finish its local unlock.`);
    } catch { /* session error is visible below */ }
  }

  async function addPasskey() {
    try { await addPasskeyUnlockSlot(confirmationSlotId, confirmationPassphrase); } catch { /* session error is visible below */ }
  }

  async function addPassphrase() {
    try { await addPassphraseUnlockSlot(confirmationSlotId, confirmationPassphrase, newPassphrase); } catch { /* session error is visible below */ }
  }

  async function remove(slotId: string) {
    try { await removeUnlockSlot(confirmationSlotId, confirmationPassphrase, slotId); } catch { /* session error is visible below */ }
  }

  const confirmationSlot = slots.find((slot) => slot.id === confirmationSlotId);

  return (
    <VaultAppShell title="Vault settings">
      <section className="max-w-2xl">
        <h2 className="font-heading text-3xl font-bold tracking-tight">Security settings</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Manage security actions separately from your encrypted documents.</p>

        <section className="mt-8 rounded-xl border border-[var(--vault-border)] p-5 sm:p-6">
          <div className="flex gap-3"><KeyRound className="mt-0.5 shrink-0 text-cyan-700 dark:text-cyan-300" size={22} /><div><h3 className="font-heading text-xl font-bold">Local unlock methods</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Each method unlocks the same encrypted browser vault. Confirm an existing method before changing them.</p></div></div>
          {slots.length === 0 ? <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">This browser record has no upgradeable unlock slots. Reset this pre-production browser vault and enroll again.</p> : <>
            <label className="mt-5 block text-sm font-medium">Confirm with<select value={confirmationSlotId} onChange={(event) => { clearError(); setConfirmationSlotId(event.target.value); setConfirmationPassphrase(""); }} className="mt-1.5 block w-full rounded-lg border border-[var(--vault-border)] bg-transparent px-3 py-2">{slots.map((slot, index) => <option key={slot.id} value={slot.id}>{slot.kind === "passkey" ? "Vault passkey" : "Vault passphrase"} {index + 1}</option>)}</select></label>
            {confirmationSlot?.kind === "passphrase" && <label className="mt-4 block text-sm font-medium">Current vault passphrase<input type="password" value={confirmationPassphrase} onChange={(event) => { clearError(); setConfirmationPassphrase(event.target.value); }} className="mt-1.5 block w-full rounded-lg border border-[var(--vault-border)] bg-transparent px-3 py-2" autoComplete="current-password" /></label>}
            <div className="mt-5 space-y-2">{slots.map((slot, index) => <div key={slot.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--vault-border)] px-3 py-2 text-sm"><span>{slot.kind === "passkey" ? "Vault passkey" : "Vault passphrase"} {index + 1}</span><Button variant="ghost" className="text-red-700 dark:text-red-300" loading={working} disabled={slots.length <= 1} onClick={() => void remove(slot.id)}><Trash2 size={15} /> Remove</Button></div>)}</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><Button variant="secondary" loading={working} onClick={() => void addPasskey()}><KeyRound size={16} /> Add passkey</Button><div><label className="block text-sm font-medium">New vault passphrase<input type="password" value={newPassphrase} onChange={(event) => { clearError(); setNewPassphrase(event.target.value); }} className="mt-1.5 block w-full rounded-lg border border-[var(--vault-border)] bg-transparent px-3 py-2" autoComplete="new-password" /></label><Button className="mt-2 w-full" variant="secondary" loading={working} disabled={newPassphrase.length < 12} onClick={() => void addPassphrase()}>Add passphrase</Button></div></div>
          </>}
        </section>

        <section className="mt-8 rounded-xl border border-gray-200 p-5 dark:border-white/10 sm:p-6">
          <div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-cyan-700 dark:text-cyan-300" size={22} /><div><h3 className="font-heading text-xl font-bold">Approve another browser</h3><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Paste the approval payload shown on a new browser, then compare the security code on both devices before confirming.</p></div></div>
          <label className="mt-5 block text-sm font-medium text-gray-700 dark:text-gray-200">Approval payload<textarea value={offer} onChange={(event) => { clearError(); setOffer(event.target.value); setApproval(null); }} className="mt-1.5 min-h-28 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs dark:border-white/20 dark:bg-gray-950" placeholder="Paste the QR payload here" /></label>
          {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {approvalReceipt && <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{approvalReceipt}</p>}
          {!approval ? <Button className="mt-4" loading={working} disabled={!offer.trim()} onClick={() => void review()}><ClipboardPaste size={16} /> Verify approval payload</Button> : <div className="mt-5 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4"><p className="text-sm font-semibold">Compare this code on both browsers</p><p className="mt-3 font-mono text-2xl font-bold tracking-wider text-cyan-900 dark:text-cyan-100">{approval.sas}</p><label className="mt-4 flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I compared the code on both devices and it matches.</span></label><div className="mt-4 flex gap-2"><Button variant="ghost" onClick={() => { setApproval(null); setConfirmed(false); }}>Cancel</Button><Button loading={working} disabled={!confirmed} onClick={() => void approve()}><CheckCircle2 size={16} /> Approve browser</Button></div></div>}
        </section>

        <section className="mt-5 rounded-xl border border-amber-400/40 bg-amber-50 p-5 dark:bg-amber-500/10"><h3 className="font-heading text-lg font-bold">Recovery phrase</h3><p className="mt-2 text-sm text-gray-700 dark:text-gray-200">Your recovery phrase is shown only during first-time setup. Keep the original offline copy; it cannot be displayed again from this browser.</p></section>
        <section className="mt-5 rounded-xl border border-[var(--vault-border)] p-5 sm:p-6"><h3 className="font-heading text-xl font-bold">Workspace preferences</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">These local preferences never leave this browser.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><SettingSelect label="Auto-lock after inactivity" value={settings.autoLockMinutes} choices={AUTO_LOCK_CHOICES} suffix="minutes" onChange={(value) => change("autoLockMinutes", value as VaultSettings["autoLockMinutes"])} /><SettingSelect label="Clear copied secrets after" value={settings.clipboardClearSeconds} choices={CLIPBOARD_CLEAR_CHOICES} suffix="seconds" onChange={(value) => change("clipboardClearSeconds", value as VaultSettings["clipboardClearSeconds"])} /><SettingSelect label="Document width" value={settings.documentWidth} choices={["comfortable", "wide"]} onChange={(value) => change("documentWidth", value as VaultSettings["documentWidth"])} /><SettingSelect label="Editor mode" value={settings.editorMode} choices={["split", "edit", "preview"]} onChange={(value) => change("editorMode", value as VaultSettings["editorMode"])} /></div><div className="mt-5 flex flex-wrap gap-5 text-sm"><label><input type="checkbox" checked={settings.lineWrap} onChange={(event) => change("lineWrap", event.target.checked)} /> Wrap lines</label><label><input type="checkbox" checked={settings.spellcheck} onChange={(event) => change("spellcheck", event.target.checked)} /> Spellcheck</label><label><input type="checkbox" checked={settings.showMetadata} onChange={(event) => change("showMetadata", event.target.checked)} /> Show metadata</label></div></section>
      </section>
    </VaultAppShell>
  );
}

function SettingSelect({ label, value, choices, suffix, onChange }: { label: string; value: string | number; choices: readonly (string | number)[]; suffix?: string; onChange: (value: string | number) => void }) { return <label className="text-sm font-medium">{label}<select value={String(value)} onChange={(event) => { const match = choices.find((choice) => String(choice) === event.target.value)!; onChange(match); }} className="mt-1.5 block w-full rounded-lg border border-[var(--vault-border)] bg-transparent px-3 py-2">{choices.map((choice) => <option key={String(choice)} value={String(choice)}>{choice === "never" ? "Never" : `${choice} ${suffix ?? ""}`}</option>)}</select></label>; }
