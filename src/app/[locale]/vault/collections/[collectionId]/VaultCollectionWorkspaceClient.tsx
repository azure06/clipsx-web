"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronLeft, FileCode2, FileText, Plus, RefreshCw, Search, Settings2, Terminal, Trash2 } from "lucide-react";

import { EnvironmentPreview } from "@/components/vault/EnvironmentPreview";
import { MarkdownPreview } from "@/components/vault/MarkdownPreview";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { Link } from "@/i18n/routing";
import { reapplyLocalResolution, type NoteConflict, type VaultItemContent, type VaultItemHead } from "@/lib/vault/browser-note-conflict";
import { resolveVaultFormat } from "@/lib/vault/vault-format";
import { VaultAppShell } from "../../VaultAppShell";
import { useVaultSession } from "../../VaultOnboardingClient";
import { filterVaultItems, sortVaultItems, type VaultItemSort } from "./vault-workspace-utils";

type NewFormat = "text/markdown" | "text/plain" | "application/vnd.clipsx.env";

const formatLabel = (mediaType?: string) => resolveVaultFormat(mediaType)?.label ?? mediaType ?? "Unsupported item";
const blank = (mediaType: NewFormat): VaultItemContent => ({ mediaType, title: mediaType === "application/vnd.clipsx.env" ? ".env" : "Untitled", body: "", labels: mediaType === "application/vnd.clipsx.env" ? ["environment"] : [], properties: mediaType === "application/vnd.clipsx.env" ? { environment: "development", filename: ".env" } : {} });
const clone = (item: VaultItemContent): VaultItemContent => ({ ...item, labels: [...item.labels], properties: { ...item.properties }, content: item.content?.slice() });
const persistable = (item: VaultItemContent): VaultItemContent => ({ ...item, title: item.title.trim(), content: new TextEncoder().encode(item.body ?? ""), properties: { ...item.properties } });

export function VaultCollectionWorkspaceClient({ collectionId }: { collectionId: string }) {
  const { collections, loadItems, createItem, updateItem, deleteItem, working, error, clearError } = useVaultSession();
  const collection = collections.find((candidate) => candidate.id === collectionId);
  const [items, setItems] = useState<VaultItemHead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VaultItemContent | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [conflict, setConflict] = useState<NoteConflict | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VaultItemHead | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<VaultItemSort>("updated");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const visible = sortVaultItems(filterVaultItems(items, query, "all"), sort);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const next = await loadItems(collectionId);
      setItems(next);
      setSelectedId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id ?? null);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Could not sync encrypted items.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [collectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  function beginNew(mediaType: NewFormat) { clearError(); setDraft(blank(mediaType)); setIsNew(true); setConflict(null); }
  function beginEdit() { if (!selected) return; clearError(); setDraft(clone(selected)); setIsNew(false); setConflict(null); }
  function select(id: string) { setSelectedId(id); setDraft(null); setConflict(null); }

  async function save() {
    if (!draft?.title.trim()) return;
    try {
      const content = persistable(draft);
      if (isNew) {
        const next = await createItem(collectionId, content);
        setItems(next);
        setSelectedId(next.at(-1)?.id ?? null);
      } else if (selected) {
        const result = await updateItem(collectionId, selected, content);
        if (result.kind === "conflict") { setConflict(result.conflict); return; }
        setItems(result.items);
      }
      setDraft(null);
    } catch { /* context exposes the error */ }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const next = await deleteItem(collectionId, deleteTarget);
      setItems(next);
      setSelectedId(next[0]?.id ?? null);
    } catch { /* context exposes the error */ } finally {
      setDeleteTarget(null);
    }
  }

  if (!collection) return <VaultAppShell title="Collection"><p>Collection unavailable.</p></VaultAppShell>;

  return (
    <VaultAppShell title={collection.title} actions={<Button size="sm" variant="outline" loading={loading} onClick={() => void refresh()}><RefreshCw size={15} /> Refresh</Button>}>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/vault/collections" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
          <ArrowLeft size={16} /> Collections
        </Link>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => beginNew("text/plain")}><Plus size={16} /> Text</Button>
          <Button size="sm" variant="outline" onClick={() => beginNew("text/markdown")}><FileCode2 size={16} /> Markdown</Button>
          <Button size="sm" variant="outline" onClick={() => beginNew("application/vnd.clipsx.env")}><Terminal size={16} /> .env</Button>
        </div>
      </div>

      <div className="vault-panel grid min-h-[calc(100dvh-11rem)] overflow-hidden rounded-2xl lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className={`${selected ? "hidden lg:block" : "block"} border-b border-(--vault-border) bg-(--vault-muted)/45 lg:border-b-0 lg:border-r`}>
          <div className="space-y-3 border-b border-(--vault-border) p-3">
            <label className="relative block">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-vault pl-9"
                placeholder="Search documents"
              />
            </label>
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value as VaultItemSort)}
              className="text-xs"
            >
              <option value="updated">Recently updated</option>
              <option value="created">Creation date</option>
              <option value="title">Title</option>
            </Select>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-slate-500">Syncing encrypted items…</p>
          ) : loadError ? (
            <p className="p-4 text-sm text-red-600">{loadError}</p>
          ) : (
            <ul className="max-h-[calc(100dvh-17rem)] overflow-y-auto p-2">
              {visible.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => select(item.id)}
                    className={`flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-colors ${item.id === selectedId ? "bg-sky-500/15 text-sky-950 dark:text-sky-50" : "hover:bg-slate-200/60 dark:hover:bg-white/10"}`}
                  >
                    <FileText size={17} className="mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{item.title}</span>
                      <span className="mt-1 block truncate text-xs text-slate-500">{formatLabel(item.mediaType)} · {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "Unsynced"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className={`${selected ? "block" : "hidden lg:block"} min-w-0 p-5 sm:p-8`}>
          {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
          {conflict ? (
            <ConflictView
              onKeep={() => { setConflict(null); setDraft(null); }}
              onReapply={() => { setDraft(reapplyLocalResolution(conflict)); setConflict(null); setIsNew(false); }}
            />
          ) : draft ? (
            <Editor
              value={draft}
              onChange={setDraft}
              onCancel={() => setDraft(null)}
              onSave={() => void save()}
              working={working}
            />
          ) : selected ? (
            <Preview
              item={selected}
              onBack={() => setSelectedId(null)}
              onEdit={beginEdit}
              onDelete={() => setDeleteTarget(selected)}
            />
          ) : (
            <div className="grid h-full min-h-72 place-items-center text-center">
              <div>
                <FileText className="mx-auto text-sky-500" />
                <h2 className="mt-3 text-xl font-semibold">Start a private document</h2>
                <p className="mt-2 text-sm text-slate-500">Create Markdown, text, or an environment file. Formats stay inside encryption.</p>
                <Button className="mt-5" onClick={() => beginNew("text/markdown")}>New Markdown document</Button>
              </div>
            </div>
          )}
        </section>
      </div>

      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogBody>
          <DialogTitle>Delete item</DialogTitle>
          <DialogDescription>
            Delete <strong>{deleteTarget?.title}</strong>? This removes its server ciphertext and cannot be undone.
          </DialogDescription>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={working} onClick={() => void confirmDelete()}>Delete</Button>
        </DialogFooter>
      </Dialog>
    </VaultAppShell>
  );
}

function Editor({ value, onChange, onCancel, onSave, working }: { value: VaultItemContent; onChange: (value: VaultItemContent) => void; onCancel: () => void; onSave: () => void; working: boolean }) {
  const titleRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const environment = value.mediaType === "application/vnd.clipsx.env";

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      onSave();
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-(--vault-border) pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{formatLabel(value.mediaType)}</p>
          <h2 className="mt-1 text-2xl font-semibold">{value.title || "Untitled"}</h2>
        </div>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
      <div className="mt-6 space-y-4">
        <label className="block text-sm font-medium">
          Title
          <input
            ref={titleRef}
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") textareaRef.current?.focus(); }}
            className="input-vault mt-1.5"
            autoFocus
          />
        </label>
        {environment && (
          <label className="block text-sm font-medium">
            Environment
            <input
              value={value.properties?.environment ?? "development"}
              onChange={(e) => onChange({ ...value, properties: { ...value.properties, environment: e.target.value, filename: value.properties?.filename ?? value.title } })}
              className="input-vault mt-1.5"
            />
          </label>
        )}
        <label className="block text-sm font-medium">
          {environment ? "Raw .env file" : "Content"}
          <textarea
            ref={textareaRef}
            value={value.body ?? ""}
            onChange={(e) => onChange({ ...value, body: e.target.value })}
            onKeyDown={handleTextareaKeyDown}
            className="input-vault mt-1.5 min-h-96 resize-y font-mono text-sm leading-6"
            spellCheck={!environment}
          />
        </label>
        <div className="flex items-center gap-3">
          <Button loading={working} disabled={!value.title.trim()} onClick={onSave}>Save encrypted item</Button>
          <span className="text-xs text-slate-400 dark:text-slate-500">⌘S to save</span>
        </div>
      </div>
    </div>
  );
}

function Preview({ item, onBack, onEdit, onDelete }: { item: VaultItemHead; onBack: () => void; onEdit: () => void; onDelete: () => void }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const text = item.body ?? "";
  const environment = item.mediaType === "application/vnd.clipsx.env";

  return (
    <div>
      <div className="flex items-start justify-between gap-4 border-b border-(--vault-border) pb-4">
        <div>
          <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 lg:hidden">
            <ChevronLeft size={16} /> Documents
          </button>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{formatLabel(item.mediaType)}</p>
          <h2 className="mt-1 wrap-break-word text-3xl font-semibold tracking-tight">{item.title}</h2>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={onDelete}><Trash2 size={16} /> Delete</Button>
        </div>
      </div>

      {environment ? (
        <EnvironmentPreview source={text} />
      ) : item.mediaType === "text/markdown" ? (
        <MarkdownPreview markdown={text} className="mt-6 space-y-4" />
      ) : (
        <pre className="mt-6 whitespace-pre-wrap font-mono text-sm leading-6 text-slate-700 dark:text-slate-200">{text || "This item is empty."}</pre>
      )}

      <div className="mt-8 rounded-xl border border-(--vault-border)">
        <button
          type="button"
          onClick={() => setDetailsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        >
          <span className="flex items-center gap-2"><Settings2 size={15} /> Verified details</span>
          <ChevronDown size={15} className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
        </button>
        {detailsOpen && (
          <dl className="grid gap-3 border-t border-(--vault-border) p-4 text-xs sm:grid-cols-2">
            <div><dt className="text-slate-500">Revision</dt><dd>{item.revisionNumber}</dd></div>
            <div><dt className="text-slate-500">Last modifier</dt><dd className="font-mono">{item.authorDeviceId ?? "Unknown device"}</dd></div>
            <div><dt className="text-slate-500">Created</dt><dd>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Unavailable"}</dd></div>
            <div><dt className="text-slate-500">Updated</dt><dd>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "Unavailable"}</dd></div>
            <div><dt className="text-slate-500">Labels</dt><dd>{item.labels.join(", ") || "None"}</dd></div>
          </dl>
        )}
      </div>
    </div>
  );
}

function ConflictView({ onKeep, onReapply }: { onKeep: () => void; onReapply: () => void }) {
  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-50 p-5 dark:bg-amber-400/10">
      <h2 className="text-lg font-semibold">A newer revision is available</h2>
      <p className="mt-2 text-sm">Your local draft was not saved. Choose whether to keep the verified remote revision or reopen your draft from the latest revision.</p>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={onKeep}>Keep remote</Button>
        <Button onClick={onReapply}>Reapply draft</Button>
      </div>
    </div>
  );
}
