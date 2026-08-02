"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ChevronDown, ChevronLeft, Copy, FileText, Plus,
  RefreshCw, Search, Settings2, Trash2, X, Download, Star,
  Tag, Eye, EyeOff, Grid3x3, AlignLeft, Check,
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

const MEDIA_EXT: Record<string, string> = {
  "text/markdown": "md",
  "text/plain": "txt",
  "application/vnd.clipsx.env": "env",
  "application/json": "json",
  "text/csv": "csv",
  "text/yaml": "yaml",
  "text/toml": "toml",
  "text/x-shellscript": "sh",
  "text/x-sql": "sql",
  "text/xml": "xml",
  "text/x-ini": "ini",
  "text/x-dockerfile": "dockerfile",
  "application/vnd.clipsx.login": "json",
  "application/vnd.clipsx.totp": "json",
  "application/vnd.clipsx.ssh": "txt",
};

function ext(mediaType?: string) {
  return mediaType ? (MEDIA_EXT[mediaType] ?? "txt") : "txt";
}

const TEMPLATES: Record<string, string> = {
  "text/yaml": "# yaml config\n",
  "text/toml": "# toml config\n",
  "text/x-shellscript": "#!/usr/bin/env bash\nset -euo pipefail\n",
  "text/x-sql": "-- SQL\nSELECT * FROM table_name;\n",
  "text/xml": '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>\n',
  "text/x-ini": "[section]\nkey = value\n",
  "text/x-dockerfile": "FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci\nCMD [\"node\", \"index.js\"]\n",
};

function blank(mediaType: NewFormat): VaultItemContent {
  const isEnv = mediaType === "application/vnd.clipsx.env";
  const isJson = mediaType === "application/json";
  const isLogin = mediaType === "application/vnd.clipsx.login";
  const isTotp = mediaType === "application/vnd.clipsx.totp";
  const isSsh = mediaType === "application/vnd.clipsx.ssh";
  let body = TEMPLATES[mediaType] ?? "";
  if (isJson) body = "{\n  \n}";
  const properties: Record<string, string> = {};
  if (isEnv) properties.sections = JSON.stringify([{ name: "base", content: "" }]);
  if (isLogin) properties.login = JSON.stringify({ url: "", username: "", password: "", notes: "" });
  if (isTotp) properties.totp = JSON.stringify({ secret: "", issuer: "", account: "" });
  if (isSsh) properties.ssh = JSON.stringify({ privateKey: "", publicKey: "", passphrase: "", comment: "" });
  return {
    mediaType,
    title: isEnv ? ".env" : "Untitled",
    body,
    labels: isEnv ? ["environment"] : [],
    properties,
  };
}

const clone = (item: VaultItemContent): VaultItemContent => ({
  ...item,
  labels: [...item.labels],
  properties: { ...item.properties },
  content: item.content?.slice(),
});

const STRUCTURED_TYPES = new Set(["application/vnd.clipsx.login", "application/vnd.clipsx.totp", "application/vnd.clipsx.ssh"]);

const persistable = (item: VaultItemContent): VaultItemContent => ({
  ...item,
  title: item.title.trim(),
  content: STRUCTURED_TYPES.has(item.mediaType ?? "") ? new Uint8Array(0) : new TextEncoder().encode(item.body ?? ""),
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
  const filtered = filterVaultItems(items, query, "all");
  const sorted = sortVaultItems(filtered, sort);
  const visible = [...sorted.filter((i) => i.properties?.pinned === "true"), ...sorted.filter((i) => i.properties?.pinned !== "true")];

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

  async function togglePin(item: VaultItemHead) {
    const pinned = item.properties?.pinned === "true" ? undefined : "true";
    const properties = { ...(item.properties ?? {}) };
    if (pinned) properties.pinned = pinned; else delete properties.pinned;
    try {
      const result = await updateItem(collectionId, item, persistable({ ...item, properties, body: item.body ?? "" }));
      if (result.kind !== "conflict") setItems(result.items);
    } catch { /* context exposes error */ }
  }

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
                  <li key={item.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => select(item.id)}
                      className={`flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-colors ${item.id === selectedId ? "bg-sky-500/15 text-sky-950 dark:text-sky-50" : "hover:bg-slate-200/60 dark:hover:bg-white/10"}`}
                    >
                      <Icon size={17} className="mt-0.5 shrink-0" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{item.title}</span>
                        <span className="mt-1 block truncate text-xs text-slate-500">
                          {item.properties?.pinned === "true" && <Star size={10} className="mr-1 inline text-amber-500" />}
                          {formatLabel(item.mediaType)} · {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "Unsynced"}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void togglePin(item)}
                      className={`absolute right-2 top-3 rounded p-1 transition-colors ${item.properties?.pinned === "true" ? "text-amber-500" : "hidden text-slate-400 hover:text-amber-500 group-hover:block"}`}
                      aria-label={item.properties?.pinned === "true" ? "Unpin" : "Pin"}
                    >
                      <Star size={13} />
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

function editorStats(value: VaultItemContent): string {
  const mt = value.mediaType ?? "";
  const body = value.body ?? "";
  if (mt === "application/vnd.clipsx.env") {
    try {
      const sections = JSON.parse(value.properties?.sections ?? "[]") as Array<{ content: string }>;
      const total = sections.reduce((acc, s) => {
        const keys = s.content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("=")).length;
        return acc + keys;
      }, 0);
      return `${total} key${total !== 1 ? "s" : ""}`;
    } catch { return ""; }
  }
  if (mt === "text/csv") {
    const rows = body.trim().split("\n").length;
    return rows > 1 ? `${rows - 1} row${rows - 1 !== 1 ? "s" : ""}` : "no rows";
  }
  if (!body) return "";
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const lines = body.split("\n").length;
  return `${words} word${words !== 1 ? "s" : ""} · ${lines} line${lines !== 1 ? "s" : ""}`;
}

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
  const isEnv = value.mediaType === "application/vnd.clipsx.env";
  const isLogin = value.mediaType === "application/vnd.clipsx.login";
  const isTotp = value.mediaType === "application/vnd.clipsx.totp";
  const isSsh = value.mediaType === "application/vnd.clipsx.ssh";
  const isStructured = isLogin || isTotp || isSsh;
  const fmt = resolveVaultFormat(value.mediaType);
  const description = value.properties?.description ?? "";
  const labelList: string[] = (() => { try { return JSON.parse(value.properties?.labelsList ?? "[]"); } catch { return value.labels; } })();
  const stats = editorStats(value);

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); onSave(); }
  }

  function setDescription(v: string) {
    onChange({ ...value, properties: { ...(value.properties ?? {}), description: v } });
  }

  function addLabel(label: string) {
    const next = [...new Set([...value.labels, label.trim().toLowerCase()])];
    onChange({ ...value, labels: next });
  }

  function removeLabel(label: string) {
    onChange({ ...value, labels: value.labels.filter((l) => l !== label) });
  }

  return (
    <div onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between border-b border-(--vault-border) pb-4">
        <span className="rounded bg-(--vault-accent-subtle) px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-(--vault-accent)">
          {fmt?.label ?? value.mediaType}
        </span>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>

      <div className="mt-5 space-y-4">
        <div className="space-y-2">
          <input
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            className="input-vault text-xl font-semibold"
            placeholder="Title"
            autoFocus
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-vault text-sm text-slate-500"
            placeholder="Description (optional)"
          />
        </div>

        <LabelEditor labels={value.labels} onAdd={addLabel} onRemove={removeLabel} />

        {isEnv ? (
          <EnvEditor value={value} onChange={onChange} />
        ) : isLogin ? (
          <LoginEditor value={value} onChange={onChange} />
        ) : isTotp ? (
          <TotpEditor value={value} onChange={onChange} />
        ) : isSsh ? (
          <SshEditor value={value} onChange={onChange} />
        ) : value.mediaType === "text/csv" ? (
          <CsvEditorToggle body={value.body ?? ""} onChange={(b) => onChange({ ...value, body: b })} />
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

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button loading={working} disabled={!value.title.trim()} onClick={onSave}>
              Save encrypted item
            </Button>
            <span className="text-xs text-slate-400 dark:text-slate-500">⌘S</span>
          </div>
          {stats && <span className="text-xs text-slate-400">{stats}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Label editor ─────────────────────────────────────────────────────────────

function LabelEditor({ labels, onAdd, onRemove }: { labels: string[]; onAdd: (l: string) => void; onRemove: (l: string) => void }) {
  const [input, setInput] = useState("");

  function commit() {
    const v = input.trim().toLowerCase();
    if (v) { onAdd(v); setInput(""); }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Tag size={13} className="text-slate-400" />
      {labels.map((l) => (
        <span key={l} className="flex items-center gap-1 rounded-full bg-(--vault-accent-subtle) px-2 py-0.5 text-xs font-medium text-(--vault-accent)">
          {l}
          <button type="button" onClick={() => onRemove(l)} className="hover:text-red-500"><X size={10} /></button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }}
        onBlur={commit}
        placeholder="Add label…"
        className="h-6 w-24 rounded border border-(--vault-border) bg-transparent px-2 text-xs outline-none focus:border-(--vault-accent)"
      />
    </div>
  );
}

// ─── Structured type editors ──────────────────────────────────────────────────

function LoginEditor({ value, onChange }: { value: VaultItemContent; onChange: (v: VaultItemContent) => void }) {
  const data = (() => { try { return JSON.parse(value.properties?.login ?? "{}"); } catch { return {}; } }) as () => Record<string, string>;
  const [showPw, setShowPw] = useState(false);

  function set(key: string, val: string) {
    onChange({ ...value, properties: { ...(value.properties ?? {}), login: JSON.stringify({ ...data(), [key]: val }) } });
  }

  const d = data();
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">URL<input value={d.url ?? ""} onChange={(e) => set("url", e.target.value)} className="input-vault mt-1.5" placeholder="https://example.com" /></label>
      <label className="block text-sm font-medium">Username<input value={d.username ?? ""} onChange={(e) => set("username", e.target.value)} className="input-vault mt-1.5" autoComplete="off" /></label>
      <label className="block text-sm font-medium">
        Password
        <div className="relative mt-1.5">
          <input type={showPw ? "text" : "password"} value={d.password ?? ""} onChange={(e) => set("password", e.target.value)} className="input-vault pr-10" autoComplete="new-password" />
          <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
        </div>
      </label>
      <label className="block text-sm font-medium">Notes<textarea value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className="input-vault mt-1.5 min-h-24 resize-y text-sm" /></label>
    </div>
  );
}

function TotpEditor({ value, onChange }: { value: VaultItemContent; onChange: (v: VaultItemContent) => void }) {
  const data = (() => { try { return JSON.parse(value.properties?.totp ?? "{}"); } catch { return {}; } }) as () => Record<string, string>;

  function set(key: string, val: string) {
    onChange({ ...value, properties: { ...(value.properties ?? {}), totp: JSON.stringify({ ...data(), [key]: val }) } });
  }

  const d = data();
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Secret (base32)<input value={d.secret ?? ""} onChange={(e) => set("secret", e.target.value)} className="input-vault mt-1.5 font-mono" placeholder="JBSWY3DPEHPK3PXP" autoComplete="off" /></label>
      <label className="block text-sm font-medium">Issuer<input value={d.issuer ?? ""} onChange={(e) => set("issuer", e.target.value)} className="input-vault mt-1.5" placeholder="GitHub" /></label>
      <label className="block text-sm font-medium">Account<input value={d.account ?? ""} onChange={(e) => set("account", e.target.value)} className="input-vault mt-1.5" placeholder="user@example.com" /></label>
    </div>
  );
}

function SshEditor({ value, onChange }: { value: VaultItemContent; onChange: (v: VaultItemContent) => void }) {
  const data = (() => { try { return JSON.parse(value.properties?.ssh ?? "{}"); } catch { return {}; } }) as () => Record<string, string>;
  const [showKey, setShowKey] = useState(false);

  function set(key: string, val: string) {
    onChange({ ...value, properties: { ...(value.properties ?? {}), ssh: JSON.stringify({ ...data(), [key]: val }) } });
  }

  const d = data();
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        Private key
        <div className="relative mt-1.5">
          <textarea value={d.privateKey ?? ""} onChange={(e) => set("privateKey", e.target.value)} className={`input-vault min-h-32 resize-y font-mono text-xs leading-5 ${showKey ? "" : "blur-sm select-none"}`} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" />
          <button type="button" onClick={() => setShowKey((v) => !v)} className="absolute right-2 top-2 rounded bg-(--vault-muted) px-2 py-1 text-xs text-slate-500 hover:text-slate-800">{showKey ? "Hide" : "Reveal"}</button>
        </div>
      </label>
      <label className="block text-sm font-medium">Public key<textarea value={d.publicKey ?? ""} onChange={(e) => set("publicKey", e.target.value)} className="input-vault mt-1.5 min-h-16 resize-y font-mono text-xs leading-5" placeholder="ssh-ed25519 AAAA..." /></label>
      <label className="block text-sm font-medium">Passphrase hint<input value={d.passphrase ?? ""} onChange={(e) => set("passphrase", e.target.value)} className="input-vault mt-1.5" placeholder="Optional hint (not the actual passphrase)" /></label>
      <label className="block text-sm font-medium">Comment<input value={d.comment ?? ""} onChange={(e) => set("comment", e.target.value)} className="input-vault mt-1.5" placeholder="work laptop" /></label>
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

function downloadBlob(filename: string, content: string, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

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
  const [copied, setCopied] = useState(false);
  const text = item.body ?? "";
  const isEnv = item.mediaType === "application/vnd.clipsx.env";
  const isJson = item.mediaType === "application/json";
  const isCsv = item.mediaType === "text/csv";
  const isMarkdown = item.mediaType === "text/markdown";
  const isLogin = item.mediaType === "application/vnd.clipsx.login";
  const isTotp = item.mediaType === "application/vnd.clipsx.totp";
  const isSsh = item.mediaType === "application/vnd.clipsx.ssh";
  const description = item.properties?.description;
  const filename = `${item.title.replace(/[^a-z0-9._-]/gi, "_")}.${ext(item.mediaType)}`;

  async function copyAs() {
    let content = text;
    if (isJson) { try { content = JSON.stringify(JSON.parse(text), null, 2); } catch { /* raw */ } }
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    downloadBlob(filename, text);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 border-b border-(--vault-border) pb-4">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 lg:hidden"
          >
            <ChevronLeft size={16} /> Documents
          </button>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{formatLabel(item.mediaType)}</p>
          <h2 className="mt-1 wrap-break-word text-3xl font-semibold tracking-tight">{item.title}</h2>
          {description && <p className="mt-1.5 text-sm text-slate-500">{description}</p>}
          {item.labels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.labels.map((l) => (
                <span key={l} className="rounded-full bg-(--vault-accent-subtle) px-2 py-0.5 text-xs text-(--vault-accent)">{l}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!isLogin && !isTotp && !isSsh && (
            <>
              <button
                type="button"
                onClick={() => void copyAs()}
                className="flex items-center gap-1.5 rounded-lg border border-(--vault-border) px-3 py-1.5 text-xs font-medium transition-colors hover:bg-(--vault-muted)"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={download}
                className="flex items-center gap-1.5 rounded-lg border border-(--vault-border) px-3 py-1.5 text-xs font-medium transition-colors hover:bg-(--vault-muted)"
              >
                <Download size={13} /> Download
              </button>
            </>
          )}
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
      ) : isLogin ? (
        <LoginPreview item={item} />
      ) : isTotp ? (
        <TotpPreview item={item} />
      ) : isSsh ? (
        <SshPreview item={item} />
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

// ─── Structured type previews ─────────────────────────────────────────────────

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button type="button" onClick={() => void copy()} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-(--vault-muted)">
      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : label}
    </button>
  );
}

function LoginPreview({ item }: { item: VaultItemHead }) {
  const [showPw, setShowPw] = useState(false);
  const d: Record<string, string> = (() => { try { return JSON.parse(item.properties?.login ?? "{}"); } catch { return {}; } })();
  return (
    <div className="mt-6 space-y-4 rounded-xl border border-(--vault-border) p-5">
      {d.url && <div className="flex items-center justify-between gap-2"><div><p className="text-xs text-slate-500">URL</p><a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-(--vault-accent) hover:underline">{d.url}</a></div></div>}
      {d.username && <div className="flex items-center justify-between gap-2"><div><p className="text-xs text-slate-500">Username</p><p className="font-mono text-sm">{d.username}</p></div><CopyButton value={d.username} /></div>}
      {d.password && (
        <div className="flex items-center justify-between gap-2">
          <div><p className="text-xs text-slate-500">Password</p><p className={`font-mono text-sm ${showPw ? "" : "select-none tracking-widest"}`}>{showPw ? d.password : "••••••••••••"}</p></div>
          <div className="flex gap-1">
            <button type="button" onClick={() => setShowPw((v) => !v)} className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-(--vault-muted)">{showPw ? <EyeOff size={13} /> : <Eye size={13} />}</button>
            <CopyButton value={d.password} />
          </div>
        </div>
      )}
      {d.notes && <div><p className="text-xs text-slate-500">Notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{d.notes}</p></div>}
    </div>
  );
}

function TotpPreview({ item }: { item: VaultItemHead }) {
  const d: Record<string, string> = (() => { try { return JSON.parse(item.properties?.totp ?? "{}"); } catch { return {}; } })();
  const [code, setCode] = useState("------");
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    if (!d.secret) return;
    async function generate() {
      try {
        const { totpAsync } = await import("@/lib/vault/totp");
        const result = await totpAsync(d.secret);
        setCode(result.code);
        setSecondsLeft(result.secondsLeft);
      } catch { setCode("Error"); }
    }
    void generate();
    const id = window.setInterval(() => void generate(), 1000);
    return () => window.clearInterval(id);
  }, [d.secret]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mt-6 space-y-3 rounded-xl border border-(--vault-border) p-5">
      {d.issuer && <p className="text-sm font-medium">{d.issuer}{d.account ? ` — ${d.account}` : ""}</p>}
      <div className="flex items-center gap-4">
        <span className="font-mono text-4xl font-bold tracking-widest text-(--vault-accent)">{code}</span>
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-(--vault-muted)">
            <div className="h-full bg-(--vault-accent) transition-all duration-1000" style={{ width: `${(secondsLeft / 30) * 100}%` }} />
          </div>
          <span className="text-xs text-slate-500">{secondsLeft}s</span>
        </div>
        <CopyButton value={code} />
      </div>
      <p className="text-xs text-slate-400">Code refreshes every 30 seconds. Never share this secret.</p>
    </div>
  );
}

function SshPreview({ item }: { item: VaultItemHead }) {
  const d: Record<string, string> = (() => { try { return JSON.parse(item.properties?.ssh ?? "{}"); } catch { return {}; } })();
  const [showPrivate, setShowPrivate] = useState(false);
  return (
    <div className="mt-6 space-y-4 rounded-xl border border-(--vault-border) p-5">
      {d.publicKey && (
        <div>
          <div className="flex items-center justify-between"><p className="text-xs text-slate-500">Public key</p><CopyButton value={d.publicKey} label="Copy public key" /></div>
          <pre className="mt-1 overflow-x-auto rounded bg-(--vault-muted) p-2 font-mono text-xs leading-5">{d.publicKey}</pre>
        </div>
      )}
      {d.privateKey && (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Private key</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => setShowPrivate((v) => !v)} className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-(--vault-muted)">{showPrivate ? "Hide" : "Reveal"}</button>
              {showPrivate && <CopyButton value={d.privateKey} label="Copy" />}
            </div>
          </div>
          <pre className={`mt-1 overflow-x-auto rounded bg-(--vault-muted) p-2 font-mono text-xs leading-5 ${showPrivate ? "" : "blur-sm select-none"}`}>{showPrivate ? d.privateKey : "REDACTED"}</pre>
        </div>
      )}
      {d.comment && <div><p className="text-xs text-slate-500">Comment</p><p className="mt-0.5 text-sm">{d.comment}</p></div>}
      {d.passphrase && <div><p className="text-xs text-slate-500">Passphrase hint</p><p className="mt-0.5 text-sm">{d.passphrase}</p></div>}
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

  function downloadSection(sectionName: string) {
    const content = sectionName === "__merged__"
      ? mergeEnvSections(sections, activeSection)
      : (sections.find((s) => s.name === sectionName)?.content ?? "");
    const filename = `${item.title.replace(/[^a-z0-9._-]/gi, "_")}.${sectionName === "base" ? "env" : `${sectionName}.env`}`;
    downloadBlob(filename, content);
  }

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
          <div className="flex items-center gap-2">
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
            <EnvDownloadMenu sections={sections} activeSection={activeSection} onDownload={downloadSection} />
          </div>
        </div>
      )}
      {!hasMultiple && (
        <div className="flex justify-end">
          <EnvDownloadMenu sections={sections} activeSection={activeSection} onDownload={downloadSection} />
        </div>
      )}
      <EnvironmentPreview source={displaySource} />
    </div>
  );
}

function EnvDownloadMenu({ sections, activeSection, onDownload }: {
  sections: EnvSection[];
  activeSection: string;
  onDownload: (section: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasMultiple = sections.length > 1;

  useEffect(() => {
    if (!open) return;
    function close(e: PointerEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  if (!hasMultiple) {
    return (
      <button type="button" onClick={() => onDownload(activeSection)} className="flex items-center gap-1.5 rounded-lg border border-(--vault-border) px-3 py-1.5 text-xs font-medium transition-colors hover:bg-(--vault-muted)">
        <Download size={12} /> Download
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 rounded-lg border border-(--vault-border) px-3 py-1.5 text-xs font-medium transition-colors hover:bg-(--vault-muted)">
        <Download size={12} /> Download <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-xl border border-(--vault-border) bg-(--vault-surface) shadow-lg">
          {sections.map((s) => (
            <button key={s.name} type="button" onClick={() => { onDownload(s.name); setOpen(false); }} className="flex w-full items-center px-3 py-2 text-left text-xs hover:bg-(--vault-muted)">{s.name}</button>
          ))}
          {activeSection !== "base" && (
            <button type="button" onClick={() => { onDownload("__merged__"); setOpen(false); }} className="flex w-full items-center border-t border-(--vault-border) px-3 py-2 text-left text-xs hover:bg-(--vault-muted)">merged ({activeSection} + base)</button>
          )}
        </div>
      )}
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

// ─── CSV editor toggle ────────────────────────────────────────────────────────

function CsvEditorToggle({ body, onChange }: { body: string; onChange: (v: string) => void }) {
  const [gridView, setGridView] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Content</span>
        <button
          type="button"
          onClick={() => setGridView((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-(--vault-border) px-3 py-1.5 text-xs font-medium transition-colors hover:bg-(--vault-muted)"
        >
          {gridView ? <><AlignLeft size={12} /> Raw</> : <><Grid3x3 size={12} /> Grid</>}
        </button>
      </div>
      {gridView ? (
        <CsvGrid source={body} onChange={onChange} />
      ) : (
        <textarea
          value={body}
          onChange={(e) => onChange(e.target.value)}
          className="input-vault mt-0 min-h-64 resize-y font-mono text-sm leading-6"
          spellCheck={false}
          placeholder="col1,col2,col3&#10;a,b,c"
        />
      )}
    </div>
  );
}

// ─── CSV grid + preview ───────────────────────────────────────────────────────

function parseCsv(source: string): string[][] {
  return source.trim().split("\n").map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

function serializeCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => (cell.includes(",") ? `"${cell}"` : cell)).join(",")).join("\n");
}

function CsvGrid({ source, onChange }: { source: string; onChange?: (v: string) => void }) {
  const parsed = parseCsv(source);
  const [headers, ...body] = parsed;
  if (!headers?.length) return <pre className="mt-6 whitespace-pre-wrap font-mono text-sm">{source || "Empty"}</pre>;

  function edit(ri: number, ci: number, val: string) {
    if (!onChange) return;
    const next = parsed.map((row, r) => row.map((cell, c) => (r === ri + 1 && c === ci ? val : cell)));
    onChange(serializeCsv(next));
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-(--vault-border)">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-(--vault-border) bg-(--vault-muted)">
          <tr>{headers.map((h, i) => <th key={i} className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">{h}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="border-b border-(--vault-border) last:border-b-0">
              {headers.map((_, ci) => (
                <td key={ci} className="p-0">
                  {onChange ? (
                    <input
                      value={row[ci] ?? ""}
                      onChange={(e) => edit(ri, ci, e.target.value)}
                      className="w-full bg-transparent px-4 py-2.5 text-gray-600 outline-none focus:bg-(--vault-accent-subtle) dark:text-gray-300"
                    />
                  ) : (
                    <span className="block px-4 py-2.5 text-gray-600 dark:text-gray-300">{row[ci] ?? ""}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CsvPreview({ source }: { source: string }) {
  const [gridView, setGridView] = useState(true);
  return (
    <div className="mt-6 space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setGridView((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-(--vault-border) px-3 py-1.5 text-xs font-medium transition-colors hover:bg-(--vault-muted)"
        >
          {gridView ? <><AlignLeft size={12} /> Raw</> : <><Grid3x3 size={12} /> Grid</>}
        </button>
      </div>
      {gridView ? <CsvGrid source={source} /> : <pre className="overflow-x-auto rounded-xl border border-(--vault-border) p-4 font-mono text-sm leading-6">{source}</pre>}
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
