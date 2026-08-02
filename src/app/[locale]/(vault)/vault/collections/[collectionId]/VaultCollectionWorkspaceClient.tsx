"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ChevronDown, ChevronLeft, Copy, FileText, Plus,
  RefreshCw, Search, Settings2, Trash2, X,
} from "lucide-react";

import { EnvironmentPreview } from "@/components/vault/EnvironmentPreview";
import { MarkdownPreview } from "@/components/vault/MarkdownPreview";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { Link } from "@/i18n/routing";
import { reapplyLocalResolution, type NoteConflict, type VaultItemContent, type VaultItemHead } from "@/lib/vault/browser-note-conflict";
import { vaultFormats, resolveVaultFormat } from "@/lib/vault/vault-format";
import { readEnvSections, writeEnvSections, mergeEnvSections, type EnvSection } from "@/lib/vault/env-sections";
import { VaultAppShell } from "../../VaultAppShell";
import { useVaultSession } from "../../VaultOnboardingClient";
import { filterVaultItems, sortVaultItems, type VaultItemSort } from "./vault-workspace-utils";

type NewFormat = string; // open to all registered mediaTypes

const formatLabel = (mediaType?: string) => resolveVaultFormat(mediaType)?.label ?? mediaType ?? "Unsupported item";

function blank(mediaType: NewFormat): VaultItemContent {
  const isEnv = mediaType === "application/vnd.clipsx.env";
  const isJson = mediaType === "application/json";
  return {
    mediaType,
    title: isEnv ? ".env" : "Untitled",
    body: isJson ? "{\n  \n}" : "",
    labels: isEnv ? ["environment"] : [],
    properties: isEnv
      ? { sections: JSON.stringify([{ name: "base", content: "" }]) }
      : {},
  };
}

const clone = (item: VaultItemContent): VaultItemContent => ({
  ...item,
  labels: [...item.labels],
  properties: { ...item.properties },
  content: item.content?.slice(),
});

const persistable = (item: VaultItemContent): VaultItemContent => ({
  ...item,
  title: item.title.trim(),
  content: new TextEncoder().encode(item.body ?? ""),
  properties: { ...item.properties },
});

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
      setSelectedId((current) => (current && next.some((item) => item.id === current) ? current : (next[0]?.id ?? null)));
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
    <VaultAppShell
      title={collection.title}
      actions={
        <Button size="sm" variant="outline" loading={loading} onClick={() => void refresh()}>
          <RefreshCw size={15} /> Refresh
        </Button>
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/vault/collections"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
        >
          <ArrowLeft size={16} /> Collections
        </Link>
        <NewItemMenu onSelect={beginNew} />
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
            <Select value={sort} onChange={(e) => setSort(e.target.value as VaultItemSort)} className="text-xs">
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
              {visible.map((item) => {
                const fmt = resolveVaultFormat(item.mediaType);
                const Icon = fmt?.icon ?? FileText;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => select(item.id)}
                      className={`flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-colors ${item.id === selectedId ? "bg-sky-500/15 text-sky-950 dark:text-sky-50" : "hover:bg-slate-200/60 dark:hover:bg-white/10"}`}
                    >
                      <Icon size={17} className="mt-0.5 shrink-0" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{item.title}</span>
                        <span className="mt-1 block truncate text-xs text-slate-500">
                          {formatLabel(item.mediaType)} · {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "Unsynced"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
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
            <EmptyState onNew={beginNew} />
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

// ─── New item menu ─────────────────────────────────────────────────────────────

function NewItemMenu({ onSelect }: { onSelect: (mediaType: string) => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const primaryFormats = vaultFormats.filter((f) => f.primary);
  const secondaryFormats = vaultFormats.filter((f) => !f.primary);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function pick(mediaType: string) {
    setOpen(false);
    onSelect(mediaType);
  }

  return (
    <div ref={menuRef} className="relative flex items-center gap-1">
      {/* Primary quick-create button — defaults to Markdown */}
      <Button size="sm" onClick={() => pick("text/markdown")}>
        <Plus size={15} /> New
      </Button>

      {/* Dropdown trigger */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Choose item type"
        className="px-2"
      >
        <ChevronDown size={15} />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-60 overflow-hidden rounded-xl border border-(--vault-border) bg-(--vault-surface) shadow-xl">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Common</p>
          {primaryFormats.map((fmt) => {
            const Icon = fmt.icon;
            return (
              <button
                key={fmt.mediaType}
                type="button"
                onClick={() => pick(fmt.mediaType)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-(--vault-muted)"
              >
                <Icon size={16} className="shrink-0 text-(--vault-accent)" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{fmt.label}</span>
                  <span className="block truncate text-xs text-gray-500">{fmt.description}</span>
                </span>
              </button>
            );
          })}
          <p className="border-t border-(--vault-border) px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Other</p>
          {secondaryFormats.map((fmt) => {
            const Icon = fmt.icon;
            return (
              <button
                key={fmt.mediaType}
                type="button"
                onClick={() => pick(fmt.mediaType)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-(--vault-muted)"
              >
                <Icon size={16} className="shrink-0 text-gray-500" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{fmt.label}</span>
                  <span className="block truncate text-xs text-gray-500">{fmt.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

function Editor({
  value,
  onChange,
  onCancel,
  onSave,
  working,
}: {
  value: VaultItemContent;
  onChange: (value: VaultItemContent) => void;
  onCancel: () => void;
  onSave: () => void;
  working: boolean;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const isEnv = value.mediaType === "application/vnd.clipsx.env";

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); onSave(); }
  }

  return (
    <div onKeyDown={handleKeyDown}>
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
            className="input-vault mt-1.5"
            autoFocus
          />
        </label>

        {isEnv ? (
          <EnvEditor value={value} onChange={onChange} />
        ) : (
          <label className="block text-sm font-medium">
            Content
            <textarea
              value={value.body ?? ""}
              onChange={(e) => onChange({ ...value, body: e.target.value })}
              className="input-vault mt-1.5 min-h-96 resize-y font-mono text-sm leading-6"
              spellCheck={value.mediaType === "text/plain"}
            />
          </label>
        )}

        <div className="flex items-center gap-3">
          <Button loading={working} disabled={!value.title.trim()} onClick={onSave}>
            Save encrypted item
          </Button>
          <span className="text-xs text-slate-400 dark:text-slate-500">⌘S to save</span>
        </div>
      </div>
    </div>
  );
}

// ─── Env editor with sections ─────────────────────────────────────────────────

function EnvEditor({
  value,
  onChange,
}: {
  value: VaultItemContent;
  onChange: (value: VaultItemContent) => void;
}) {
  const sections = readEnvSections(value.properties, value.body);
  const [activeIdx, setActiveIdx] = useState(0);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  function updateSection(idx: number, content: string) {
    const next = sections.map((s, i) => (i === idx ? { ...s, content } : s));
    const { properties, body } = writeEnvSections(next, value.properties);
    onChange({ ...value, properties, body });
  }

  function addSection() {
    const name = newSectionName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name || sections.some((s) => s.name === name)) return;
    const next = [...sections, { name, content: "" }];
    const { properties, body } = writeEnvSections(next, value.properties);
    onChange({ ...value, properties, body });
    setActiveIdx(next.length - 1);
    setAddingSection(false);
    setNewSectionName("");
  }

  function removeSection(idx: number) {
    if (sections[idx]?.name === "base") return; // never remove base
    const next = sections.filter((_, i) => i !== idx);
    const { properties, body } = writeEnvSections(next, value.properties);
    onChange({ ...value, properties, body });
    setActiveIdx(Math.min(activeIdx, next.length - 1));
  }

  const active = sections[activeIdx] ?? sections[0];

  return (
    <div className="space-y-3">
      {/* Section tabs */}
      <div className="flex flex-wrap items-center gap-1">
        {sections.map((section, idx) => (
          <div key={section.name} className="group relative flex items-center">
            <button
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                idx === activeIdx
                  ? "bg-(--vault-accent-subtle) text-(--vault-accent)"
                  : "text-gray-500 hover:bg-(--vault-muted) hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
              }`}
            >
              {section.name}
            </button>
            {section.name !== "base" && (
              <button
                type="button"
                onClick={() => removeSection(idx)}
                className="ml-0.5 hidden rounded p-0.5 text-gray-400 hover:text-red-500 group-hover:block"
                aria-label={`Remove ${section.name} section`}
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}

        {addingSection ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addSection();
                if (e.key === "Escape") { setAddingSection(false); setNewSectionName(""); }
              }}
              placeholder="e.g. production"
              className="input-vault h-7 w-32 px-2 py-0 text-xs"
            />
            <Button size="sm" onClick={addSection} className="h-7 px-2 text-xs">Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingSection(false); setNewSectionName(""); }} className="h-7 px-2 text-xs">Cancel</Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingSection(true)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-400 transition-colors hover:bg-(--vault-muted) hover:text-gray-700 dark:hover:text-gray-200"
          >
            <Plus size={12} /> Add environment
          </button>
        )}
      </div>

      {/* Active section hint */}
      {active && active.name !== "base" && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Keys here override <code className="font-mono">base</code> when merged. Leave a key out to inherit the base value.
        </p>
      )}

      {/* Raw editor for active section */}
      <label className="block text-sm font-medium">
        Raw .env — <span className="font-normal text-gray-500">{active?.name}</span>
        <textarea
          value={active?.content ?? ""}
          onChange={(e) => updateSection(activeIdx, e.target.value)}
          className="input-vault mt-1.5 min-h-64 resize-y font-mono text-sm leading-6"
          spellCheck={false}
          placeholder={"DATABASE_URL=postgres://localhost/mydb\nSECRET_KEY=changeme"}
        />
      </label>
    </div>
  );
}

// ─── Preview ──────────────────────────────────────────────────────────────────

function Preview({
  item,
  onBack,
  onEdit,
  onDelete,
}: {
  item: VaultItemHead;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const text = item.body ?? "";
  const isEnv = item.mediaType === "application/vnd.clipsx.env";
  const isJson = item.mediaType === "application/json";
  const isCsv = item.mediaType === "text/csv";
  const isMarkdown = item.mediaType === "text/markdown";

  return (
    <div>
      <div className="flex items-start justify-between gap-4 border-b border-(--vault-border) pb-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 lg:hidden"
          >
            <ChevronLeft size={16} /> Documents
          </button>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{formatLabel(item.mediaType)}</p>
          <h2 className="mt-1 wrap-break-word text-3xl font-semibold tracking-tight">{item.title}</h2>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={onDelete}>
            <Trash2 size={16} /> Delete
          </Button>
        </div>
      </div>

      {isEnv ? (
        <EnvPreview item={item} />
      ) : isJson ? (
        <JsonPreview source={text} />
      ) : isCsv ? (
        <CsvPreview source={text} />
      ) : isMarkdown ? (
        <MarkdownPreview markdown={text} className="mt-6 space-y-4" />
      ) : (
        <pre className="mt-6 whitespace-pre-wrap font-mono text-sm leading-6 text-slate-700 dark:text-slate-200">
          {text || "This item is empty."}
        </pre>
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

// ─── Env preview with sections + merge ───────────────────────────────────────

function EnvPreview({ item }: { item: VaultItemHead }) {
  const sections = readEnvSections(item.properties, item.body);
  const hasMultiple = sections.length > 1;
  const [activeSection, setActiveSection] = useState(sections[0]?.name ?? "base");
  const [showMerged, setShowMerged] = useState(false);

  const displaySource = hasMultiple && showMerged
    ? mergeEnvSections(sections, activeSection)
    : (sections.find((s) => s.name === activeSection)?.content ?? "");

  return (
    <div className="mt-6 space-y-3">
      {hasMultiple && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {sections.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setActiveSection(s.name)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  s.name === activeSection
                    ? "bg-(--vault-accent-subtle) text-(--vault-accent)"
                    : "text-gray-500 hover:bg-(--vault-muted)"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
          {activeSection !== "base" && (
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={showMerged}
                onChange={(e) => setShowMerged(e.target.checked)}
                className="h-3.5 w-3.5 rounded checked:accent-cyan-600"
              />
              Show merged with base
            </label>
          )}
        </div>
      )}
      <EnvironmentPreview source={displaySource} />
    </div>
  );
}

// ─── JSON preview ─────────────────────────────────────────────────────────────

function JsonPreview({ source }: { source: string }) {
  const [copied, setCopied] = useState(false);
  let parsed: unknown = null;
  let parseError = false;
  try { parsed = JSON.parse(source); } catch { parseError = true; }

  async function copy() {
    await navigator.clipboard.writeText(source);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-(--vault-border)">
      <div className="flex items-center justify-between border-b border-(--vault-border) bg-(--vault-muted) px-4 py-3">
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {parseError ? "Invalid JSON" : "JSON"}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-200 dark:hover:bg-white/10"
        >
          <Copy size={13} /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-6 text-slate-700 dark:text-slate-200">
        {parseError ? source : JSON.stringify(parsed, null, 2)}
      </pre>
    </div>
  );
}

// ─── CSV preview ──────────────────────────────────────────────────────────────

function CsvPreview({ source }: { source: string }) {
  const rows = source.trim().split("\n").map((line) =>
    line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
  );
  const [headers, ...body] = rows;

  if (!headers?.length) {
    return <pre className="mt-6 whitespace-pre-wrap font-mono text-sm">{source || "Empty"}</pre>;
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-(--vault-border)">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-(--vault-border) bg-(--vault-muted)">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="border-b border-(--vault-border) last:border-b-0 hover:bg-(--vault-muted)/50">
              {headers.map((_, ci) => (
                <td key={ci} className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{row[ci] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: (mediaType: string) => void }) {
  return (
    <div className="grid h-full min-h-72 place-items-center text-center">
      <div>
        <FileText className="mx-auto text-sky-500" />
        <h2 className="mt-3 text-xl font-semibold">Start a private document</h2>
        <p className="mt-2 text-sm text-slate-500">
          Create Markdown, text, environment files, JSON, or CSV. Formats stay inside encryption.
        </p>
        <Button className="mt-5" onClick={() => onNew("text/markdown")}>New Markdown document</Button>
      </div>
    </div>
  );
}

// ─── Conflict ─────────────────────────────────────────────────────────────────

function ConflictView({ onKeep, onReapply }: { onKeep: () => void; onReapply: () => void }) {
  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-50 p-5 dark:bg-amber-400/10">
      <h2 className="text-lg font-semibold">A newer revision is available</h2>
      <p className="mt-2 text-sm">
        Your local draft was not saved. Choose whether to keep the verified remote revision or reopen your draft from the latest revision.
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={onKeep}>Keep remote</Button>
        <Button onClick={onReapply}>Reapply draft</Button>
      </div>
    </div>
  );
}
