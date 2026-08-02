"use client";

import { FormEvent, useState } from "react";
import { ChevronRight, FolderPlus, Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Link, useRouter } from "@/i18n/routing";
import { VaultAppShell } from "../VaultAppShell";
import { useVaultSession } from "../VaultOnboardingClient";

export function VaultCollectionsClient() {
  const router = useRouter();
  const { collections, createCollection, error, clearError, working } = useVaultSession();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    try {
      const id = await createCollection(title);
      setTitle("");
      setCreating(false);
      router.push(`/vault/collections/${id}`);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not create the collection.");
    }
  }

  return (
    <VaultAppShell
      title="Collections"
      actions={<Button size="sm" onClick={() => { clearError(); setCreating(true); }}><Plus size={16} /> New collection</Button>}
    >
      <section className="max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl font-bold tracking-tight">Your collections</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Open a secure collection to view and manage its documents.</p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{collections.length} {collections.length === 1 ? "collection" : "collections"}</p>
        </div>

        {creating && (
          <form onSubmit={submit} className="mb-4 flex flex-col gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              Collection name
              <input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Escape") { setCreating(false); setTitle(""); } }}
                maxLength={128}
                className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-gray-950"
                placeholder="e.g. Personal, Work, Travel"
              />
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => { setCreating(false); setTitle(""); }}>Cancel</Button>
              <Button type="submit" loading={working}>Create</Button>
            </div>
            {formError && <p role="alert" className="basis-full text-sm text-red-600 dark:text-red-400">{formError}</p>}
          </form>
        )}

        {(error || !formError) && error && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {collections.length === 0 ? (
          <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-gray-300 px-6 text-center dark:border-white/15">
            <div>
              <FolderPlus className="mx-auto mb-4 text-cyan-600 dark:text-cyan-300" size={32} />
              <h3 className="font-heading text-xl font-bold">Create your first collection</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-300">Collections separate your encrypted documents without exposing their contents to the server.</p>
              <Button className="mt-5" onClick={() => setCreating(true)}>Create collection</Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 dark:divide-white/10 dark:border-white/10">
            {collections.map((collection) => (
              <li key={collection.id}>
                <Link href={`/vault/collections/${collection.id}`} className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-cyan-500/5 sm:px-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"><FolderPlus size={19} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{collection.title}</span>
                    <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">Encrypted collection</span>
                  </span>
                  <span className="hidden text-sm font-medium text-cyan-700 group-hover:text-cyan-900 dark:text-cyan-300 dark:group-hover:text-cyan-100 sm:inline">Open</span>
                  <ChevronRight className="text-gray-400 transition-transform group-hover:translate-x-0.5" size={20} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </VaultAppShell>
  );
}
