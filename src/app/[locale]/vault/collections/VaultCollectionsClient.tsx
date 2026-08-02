"use client";

import { FormEvent, useState } from "react";
import { ChevronRight, Folder, FolderPlus, Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Link, useRouter } from "@/i18n/routing";
import { VaultAppShell } from "../VaultAppShell";
import { useVaultSession } from "../VaultOnboardingClient";

export function VaultCollectionsClient() {
  const router = useRouter();
  const { collections, createCollection, error, clearError, working } = useVaultSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function openDialog() {
    clearError();
    setFormError(null);
    setTitle("");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setTitle("");
    setFormError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    try {
      const id = await createCollection(title);
      closeDialog();
      router.push(`/vault/collections/${id}`);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not create the collection.");
    }
  }

  return (
    <VaultAppShell
      title="Collections"
      actions={<Button size="sm" onClick={openDialog}><Plus size={16} /> New collection</Button>}
    >
      <section className="max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl font-bold tracking-tight">Your collections</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Open a secure collection to view and manage its documents.</p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{collections.length} {collections.length === 1 ? "collection" : "collections"}</p>
        </div>

        {error && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {collections.length === 0 ? (
          <div
            className="grid min-h-72 place-items-center rounded-xl border border-dashed border-(--vault-border) px-6 text-center"
            style={{ backgroundImage: "radial-gradient(circle, rgb(148 163 184 / 0.12) 1px, transparent 1px)", backgroundSize: "20px 20px" }}
          >
            <div>
              <FolderPlus className="mx-auto mb-4 text-(--vault-accent)" size={32} />
              <h3 className="font-heading text-xl font-bold">Create your first collection</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-300">Collections separate your encrypted documents without exposing their contents to the server.</p>
              <Button className="mt-5" onClick={openDialog}>Create collection</Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-(--vault-border) overflow-hidden rounded-xl border border-(--vault-border)">
            {collections.map((collection) => (
              <li key={collection.id}>
                <Link href={`/vault/collections/${collection.id}`} className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-(--vault-accent-subtle) sm:px-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-(--vault-accent-subtle) text-(--vault-accent) transition-colors group-hover:bg-(--vault-accent)/15">
                    <Folder size={18} className="group-hover:hidden" />
                    <FolderPlus size={18} className="hidden group-hover:block" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{collection.title}</span>
                    <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">Encrypted collection</span>
                  </span>
                  <span className="hidden text-sm font-medium text-(--vault-accent) opacity-0 transition-opacity group-hover:opacity-100 sm:inline">Open</span>
                  <ChevronRight className="text-gray-400 transition-transform group-hover:translate-x-0.5" size={20} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={dialogOpen} onClose={closeDialog}>
        <form onSubmit={submit}>
          <DialogBody>
            <DialogTitle>New collection</DialogTitle>
            <DialogDescription>Collections separate your encrypted documents without exposing names to the server.</DialogDescription>
            <label className="mt-5 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Collection name
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={128}
                className="input-vault mt-1.5"
                placeholder="e.g. Personal, Work, Travel"
              />
            </label>
            {formError && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{formError}</p>}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeDialog}>Cancel</Button>
            <Button type="submit" loading={working} disabled={!title.trim()}>Create</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </VaultAppShell>
  );
}
