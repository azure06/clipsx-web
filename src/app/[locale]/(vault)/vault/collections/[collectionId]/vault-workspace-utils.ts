import type { VaultItemHead } from "@/lib/vault/browser-note-conflict";

export function filterVaultItems(items: VaultItemHead[], query: string, filter: "all" | "note" | "login"): VaultItemHead[] {
  const normalized = query.trim().toLocaleLowerCase();
  return items.filter((item) => {
    if (filter !== "all" && item.type !== filter) return false;
    if (!normalized) return true;
    const searchable = item.type === "note"
      ? `${item.title}\n${item.body ?? ""}`
      : `${item.title}\n${item.username ?? ""}\n${item.url ?? ""}`;
    return searchable.toLocaleLowerCase().includes(normalized);
  });
}

export type VaultItemSort = "updated" | "created" | "title";

export function sortVaultItems(items: VaultItemHead[], sort: VaultItemSort): VaultItemHead[] {
  return [...items].sort((left, right) => {
    if (sort === "title") return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
    const field = sort === "updated" ? "updatedAt" : "createdAt";
    return (right[field] ?? "").localeCompare(left[field] ?? "");
  });
}
