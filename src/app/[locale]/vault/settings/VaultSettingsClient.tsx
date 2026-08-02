"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardPaste, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { VaultAppShell } from "../VaultAppShell";
import { useVaultSession } from "../VaultOnboardingClient";

export function VaultSettingsClient() {
  const { reviewDeviceApproval, approveDevice, working, error, clearError } = useVaultSession();
  const [offer, setOffer] = useState("");
  const [approval, setApproval] = useState<{ command: Uint8Array; sas: string; deviceId: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

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
    } catch { /* session error is visible below */ }
  }

  return (
    <VaultAppShell title="Vault settings">
      <section className="max-w-2xl">
        <h2 className="font-heading text-3xl font-bold tracking-tight">Security settings</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Manage security actions separately from your encrypted documents.</p>

        <section className="mt-8 rounded-xl border border-gray-200 p-5 dark:border-white/10 sm:p-6">
          <div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-cyan-700 dark:text-cyan-300" size={22} /><div><h3 className="font-heading text-xl font-bold">Approve another browser</h3><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Paste the approval payload shown on a new browser, then compare the security code on both devices before confirming.</p></div></div>
          <label className="mt-5 block text-sm font-medium text-gray-700 dark:text-gray-200">Approval payload<textarea value={offer} onChange={(event) => { clearError(); setOffer(event.target.value); setApproval(null); }} className="mt-1.5 min-h-28 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs dark:border-white/20 dark:bg-gray-950" placeholder="Paste the QR payload here" /></label>
          {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {!approval ? <Button className="mt-4" loading={working} disabled={!offer.trim()} onClick={() => void review()}><ClipboardPaste size={16} /> Verify approval payload</Button> : <div className="mt-5 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4"><p className="text-sm font-semibold">Compare this code on both browsers</p><p className="mt-3 font-mono text-2xl font-bold tracking-wider text-cyan-900 dark:text-cyan-100">{approval.sas}</p><label className="mt-4 flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I compared the code on both devices and it matches.</span></label><div className="mt-4 flex gap-2"><Button variant="ghost" onClick={() => { setApproval(null); setConfirmed(false); }}>Cancel</Button><Button loading={working} disabled={!confirmed} onClick={() => void approve()}><CheckCircle2 size={16} /> Approve browser</Button></div></div>}
        </section>

        <section className="mt-5 rounded-xl border border-amber-400/40 bg-amber-50 p-5 dark:bg-amber-500/10"><h3 className="font-heading text-lg font-bold">Recovery phrase</h3><p className="mt-2 text-sm text-gray-700 dark:text-gray-200">Your recovery phrase is shown only during first-time setup. Keep the original offline copy; it cannot be displayed again from this browser.</p></section>
      </section>
    </VaultAppShell>
  );
}
