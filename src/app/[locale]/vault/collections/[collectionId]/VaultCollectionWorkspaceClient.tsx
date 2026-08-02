"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Copy, Eye, EyeOff, FileText, KeyRound, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/routing";
import { reapplyLocalResolution, type NoteConflict, type VaultItemContent, type VaultItemHead } from "@/lib/vault/browser-note-conflict";
import { VaultAppShell } from "../../VaultAppShell";
import { useVaultSession } from "../../VaultOnboardingClient";
import { filterVaultItems } from "./vault-workspace-utils";

type EditorMode = "preview" | "new-note" | "new-login" | "edit";

const blank = (type: "note" | "login"): VaultItemContent => type === "note"
  ? { type, title: "", body: "", labels: [] }
  : { type, title: "", username: "", password: "", url: "", labels: [] };

const copyContent = (item: VaultItemContent): VaultItemContent => ({ ...item, labels: [...item.labels] });

export function VaultCollectionWorkspaceClient({ collectionId }: { collectionId: string }) {
  const { collections, loadItems, createItem, updateItem, deleteItem, working, error, clearError } = useVaultSession();
  const collection = collections.find((candidate) => candidate.id === collectionId);
  const [items, setItems] = useState<VaultItemHead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "note" | "login">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>("preview");
  const [draft, setDraft] = useState<VaultItemContent | null>(null);
  const [conflict, setConflict] = useState<NoteConflict | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const opened = await loadItems(collectionId);
      setItems(opened);
      setSelectedId((current) => current && opened.some((item) => item.id === current) ? current : (opened[0]?.id ?? null));
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Could not sync encrypted items.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const request = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(request);
  }, [collectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleItems = filterVaultItems(items, query, filter);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  function select(item: VaultItemHead) {
    setSelectedId(item.id);
    setMode("preview");
    setDraft(null);
    setConflict(null);
    setConfirmDelete(false);
    setShowPassword(false);
  }

  function startNew(type: "note" | "login") {
    clearError();
    setMode(type === "note" ? "new-note" : "new-login");
    setDraft(blank(type));
    setConflict(null);
    setConfirmDelete(false);
  }

  function startEdit() {
    if (!selected) return;
    clearError();
    setMode("edit");
    setDraft(copyContent(selected));
    setConflict(null);
    setConfirmDelete(false);
  }

  function cancelEditor() {
    setMode("preview");
    setDraft(null);
    setConflict(null);
  }

  async function save() {
    if (!draft || !draft.title.trim()) return;
    try {
      if (mode === "new-note" || mode === "new-login") {
        if (draft.type === "login" && (!draft.username || !draft.password)) return;
        const next = await createItem(collectionId, { ...draft, title: draft.title.trim() });
        setItems(next);
        const created = next[next.length - 1];
        if (created) select(created);
        else setSelectedId(null);
        return;
      }
      if (!selected) return;
      const result = await updateItem(collectionId, selected, { ...draft, title: draft.title.trim() });
      if (result.kind === "conflict") {
        setConflict(result.conflict);
        setDraft(null);
        return;
      }
      setItems(result.items);
      const updated = result.items.find((item) => item.id === selected.id) ?? null;
      setSelectedId(updated?.id ?? null);
      setMode("preview");
      setDraft(null);
    } catch {
      // The session owns the user-visible error message.
    }
  }

  async function resolveConflict(content: VaultItemContent) {
    if (!conflict) return;
    try {
      const result = await updateItem(collectionId, conflict.remote, content);
      if (result.kind === "conflict") { setConflict(result.conflict); return; }
      setItems(result.items);
      setSelectedId(conflict.remote.id);
      setConflict(null);
      setMode("preview");
    } catch { /* session error is displayed below */ }
  }

  async function remove() {
    if (!selected) return;
    try {
      const next = await deleteItem(collectionId, selected);
      setItems(next);
      setSelectedId(next[0]?.id ?? null);
      setConfirmDelete(false);
      setMode("preview");
    } catch { /* session error is displayed below */ }
  }

  if (!collection) {
    return <VaultAppShell title="Collection"><section className="max-w-xl rounded-xl border border-dashed border-gray-300 p-8 dark:border-white/15"><h2 className="font-heading text-2xl font-bold">Collection unavailable</h2><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">This collection is not available to the currently unlocked vault.</p><Link href="/vault/collections" className="mt-5 inline-flex text-sm font-semibold text-cyan-700 dark:text-cyan-300">Back to collections</Link></section></VaultAppShell>;
  }

  return (
    <VaultAppShell title={collection.title} actions={<Button variant="outline" size="sm" loading={loading} onClick={() => void refresh()}><RefreshCw size={16} /> Refresh</Button>}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/vault/collections" className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"><ArrowLeft size={16} /> Collections</Link>
        <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => startNew("note")}><Plus size={16} /> Note</Button><Button size="sm" onClick={() => startNew("login")}><Plus size={16} /> Login</Button></div>
      </div>
      <div className="vault-panel grid min-h-[calc(100dvh-12rem)] overflow-hidden rounded-2xl md:grid-cols-[minmax(17rem,24rem)_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-[var(--vault-border)] bg-[var(--vault-muted)]/50 md:border-b-0 md:border-r">
          <div className="border-b border-gray-200 p-3 dark:border-white/10">
            <label className="relative block"><Search className="absolute left-3 top-2.5 text-gray-400" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-white/20 dark:bg-gray-900" placeholder="Search this collection" /></label>
            <div className="mt-3 flex gap-2 text-xs"><FilterButton active={filter === "all"} onClick={() => setFilter("all")}>All</FilterButton><FilterButton active={filter === "note"} onClick={() => setFilter("note")}>Notes</FilterButton><FilterButton active={filter === "login"} onClick={() => setFilter("login")}>Logins</FilterButton></div>
          </div>
          {loading ? <p className="p-4 text-sm text-gray-500">Syncing encrypted items…</p> : loadError ? <div className="p-4 text-sm text-red-600 dark:text-red-400"><p>{loadError}</p><Button className="mt-3" size="sm" variant="outline" onClick={() => void refresh()}>Try again</Button></div> : visibleItems.length === 0 ? <p className="p-4 text-sm text-gray-500">{items.length ? "No items match this search." : "No documents in this collection yet."}</p> : <ul className="max-h-[31rem] overflow-y-auto p-2">{visibleItems.map((item) => <li key={item.id}><button type="button" onClick={() => select(item)} className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors ${item.id === selectedId ? "bg-cyan-500/10" : "hover:bg-gray-100 dark:hover:bg-white/5"}`}><span className="mt-0.5 text-gray-500">{item.type === "note" ? <FileText size={17} /> : <KeyRound size={17} />}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="mt-0.5 block truncate text-xs text-gray-500">{item.type === "note" ? item.body || "Empty note" : item.username || "Login"}</span></span></button></li>)}</ul>}
        </aside>
        <section className="min-w-0 p-5 sm:p-7">
          {(error || conflict) && error && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {conflict ? <ConflictPanel conflict={conflict} working={working} onKeep={() => { setSelectedId(conflict.remote.id); setConflict(null); setMode("preview"); }} onReapply={() => void resolveConflict(reapplyLocalResolution(conflict))} onManual={() => { setDraft(copyContent(conflict.local)); setMode("edit"); setConflict(null); }} /> : draft ? <ItemEditor value={draft} onChange={setDraft} canChangeType={mode.startsWith("new")} onCancel={cancelEditor} onSave={() => void save()} working={working} /> : selected ? <ItemPreview item={selected} showPassword={showPassword} onTogglePassword={() => setShowPassword((value) => !value)} onEdit={startEdit} onDelete={() => setConfirmDelete(true)} confirmDelete={confirmDelete} onCancelDelete={() => setConfirmDelete(false)} onConfirmDelete={() => void remove()} working={working} /> : <EmptyDetail onNewNote={() => startNew("note")} onNewLogin={() => startNew("login")} />}
        </section>
      </div>
    </VaultAppShell>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) { return <button type="button" onClick={onClick} className={`rounded-full px-2.5 py-1 font-medium ${active ? "bg-cyan-500 text-white" : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"}`}>{children}</button>; }

function EmptyDetail({ onNewNote, onNewLogin }: { onNewNote: () => void; onNewLogin: () => void }) { return <div className="grid min-h-72 place-items-center text-center"><div><FileText className="mx-auto mb-3 text-cyan-600 dark:text-cyan-300" size={30} /><h2 className="font-heading text-xl font-bold">Select a document</h2><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Or add the first encrypted item to this collection.</p><div className="mt-5 flex justify-center gap-2"><Button size="sm" variant="outline" onClick={onNewNote}>New note</Button><Button size="sm" onClick={onNewLogin}>New login</Button></div></div></div>; }

function ItemPreview({ item, showPassword, onTogglePassword, onEdit, onDelete, confirmDelete, onCancelDelete, onConfirmDelete, working }: { item: VaultItemHead; showPassword: boolean; onTogglePassword: () => void; onEdit: () => void; onDelete: () => void; confirmDelete: boolean; onCancelDelete: () => void; onConfirmDelete: () => void; working: boolean }) { const [copied, setCopied] = useState(false); async function copy(value: string) { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } return <div><div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-5 dark:border-white/10"><div><p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{item.type === "note" ? "Note" : "Login"}</p><h2 className="mt-1 break-words font-heading text-2xl font-bold">{item.title}</h2></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={onEdit}>Edit</Button><Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 dark:text-red-400" onClick={onDelete}><Trash2 size={16} /> Delete</Button></div></div>{item.type === "note" ? <p className="mt-6 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-200">{item.body || "This note is empty."}</p> : <div className="mt-6 space-y-5"><InfoField label="Username" value={item.username || "—"} onCopy={() => void copy(item.username || "")} /><InfoField label="Password" value={showPassword ? item.password || "" : "••••••••••"} onCopy={() => void copy(item.password || "")} action={<Button size="sm" variant="ghost" onClick={onTogglePassword}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}{showPassword ? "Hide" : "Reveal"}</Button>} /><InfoField label="Website" value={item.url || "—"} onCopy={item.url ? () => void copy(item.url!) : undefined} />{copied && <p className="text-sm text-cyan-700 dark:text-cyan-300">Copied to clipboard.</p>}</div>}{confirmDelete && <div className="mt-8 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10"><p className="text-sm font-semibold text-red-800 dark:text-red-200">Delete this encrypted item?</p><p className="mt-1 text-sm text-red-700 dark:text-red-300">This removes its server ciphertext and cannot be undone.</p><div className="mt-3 flex gap-2"><Button size="sm" variant="ghost" onClick={onCancelDelete}>Cancel</Button><Button size="sm" variant="danger" loading={working} onClick={onConfirmDelete}>Delete item</Button></div></div>}</div>; }

function InfoField({ label, value, onCopy, action }: { label: string; value: string; onCopy?: () => void; action?: ReactNode }) { return <div className="border-b border-gray-200 pb-4 dark:border-white/10"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{label}</p><div className="flex items-center gap-1">{action}{onCopy && <Button size="sm" variant="ghost" onClick={onCopy}><Copy size={16} /> Copy</Button>}</div></div><p className="mt-2 break-all font-mono text-sm text-gray-800 dark:text-gray-100">{value}</p></div>; }

function ItemEditor({ value, onChange, canChangeType, onCancel, onSave, working }: { value: VaultItemContent; onChange: (value: VaultItemContent) => void; canChangeType: boolean; onCancel: () => void; onSave: () => void; working: boolean }) { const change = (patch: Partial<VaultItemContent>) => onChange({ ...value, ...patch }); const valid = value.title.trim() && (value.type === "note" || Boolean(value.username && value.password)); return <div><div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-5 dark:border-white/10"><div><p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{value.type === "note" ? "Note editor" : "Login editor"}</p><h2 className="mt-1 font-heading text-2xl font-bold">{value.title || "Untitled"}</h2></div><Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button></div><div className="mt-6 space-y-4">{canChangeType && <div className="flex gap-2"><FilterButton active={value.type === "note"} onClick={() => onChange(blank("note"))}>Note</FilterButton><FilterButton active={value.type === "login"} onClick={() => onChange(blank("login"))}>Login</FilterButton></div>}<Field label="Title"><input value={value.title} onChange={(event) => change({ title: event.target.value })} className="input-vault" autoFocus placeholder="Document title" /></Field>{value.type === "note" ? <Field label="Note"><textarea value={value.body ?? ""} onChange={(event) => change({ body: event.target.value })} className="input-vault min-h-56 resize-y" placeholder="Write your note" /></Field> : <><Field label="Username"><input value={value.username ?? ""} onChange={(event) => change({ username: event.target.value })} className="input-vault" autoComplete="off" /></Field><Field label="Password"><input type="password" value={value.password ?? ""} onChange={(event) => change({ password: event.target.value })} className="input-vault" autoComplete="new-password" /></Field><Field label="Website (optional)"><input value={value.url ?? ""} onChange={(event) => change({ url: event.target.value })} className="input-vault" placeholder="https://" /></Field></>}<Button loading={working} disabled={!valid} onClick={onSave}>Save encrypted {value.type}</Button></div></div>; }

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{label}<span className="mt-1.5 block">{children}</span></label>; }

function ConflictPanel({ conflict, working, onKeep, onReapply, onManual }: { conflict: NoteConflict; working: boolean; onKeep: () => void; onReapply: () => void; onManual: () => void }) { return <div className="rounded-xl border border-amber-400/50 bg-amber-50 p-5 dark:bg-amber-500/10"><p className="text-xs font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-200">Update conflict</p><h2 className="mt-1 font-heading text-2xl font-bold">A newer version was saved first</h2><p className="mt-3 text-sm text-gray-700 dark:text-gray-200">Your draft is only in this page’s memory. Choose which version to keep.</p><div className="mt-5 rounded-lg border border-amber-400/30 bg-white/60 p-4 text-sm dark:bg-gray-950/30"><b>Verified remote: {conflict.remote.title}</b><p className="mt-2 whitespace-pre-wrap">{conflict.remote.type === "note" ? conflict.remote.body : conflict.remote.username}</p></div><div className="mt-5 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={onKeep}>Keep remote</Button><Button size="sm" loading={working} onClick={onReapply}>Reapply my draft</Button><Button size="sm" variant="ghost" onClick={onManual}>Edit my draft</Button></div></div>; }
