export const AUTO_LOCK_CHOICES = [1, 5, 15, 30, 60, "never"] as const;
export const CLIPBOARD_CLEAR_CHOICES = [30, 60, 120, "never"] as const;
export type AutoLockMinutes = (typeof AUTO_LOCK_CHOICES)[number];
export type ClipboardClearSeconds = (typeof CLIPBOARD_CLEAR_CHOICES)[number];

export type VaultSettings = {
  version: 1; accountId: string; theme: "system" | "light" | "dark"; density: "comfortable" | "compact";
  documentWidth: "comfortable" | "wide"; editorMode: "split" | "edit" | "preview";
  lineWrap: boolean; spellcheck: boolean; showMetadata: boolean; sort: "updated" | "created" | "title";
  autoLockMinutes: AutoLockMinutes; clipboardClearSeconds: ClipboardClearSeconds;
};

export function defaultVaultSettings(accountId: string): VaultSettings {
  return { version: 1, accountId, theme: "system", density: "comfortable", documentWidth: "comfortable", editorMode: "split", lineWrap: true, spellcheck: true, showMetadata: true, sort: "updated", autoLockMinutes: 15, clipboardClearSeconds: 60 };
}

export function validateVaultSettings(value: Partial<VaultSettings>, accountId: string): VaultSettings {
  const defaults = defaultVaultSettings(accountId);
  return { ...defaults, ...value, accountId, version: 1,
    autoLockMinutes: AUTO_LOCK_CHOICES.includes(value.autoLockMinutes as AutoLockMinutes) ? value.autoLockMinutes as AutoLockMinutes : defaults.autoLockMinutes,
    clipboardClearSeconds: CLIPBOARD_CLEAR_CHOICES.includes(value.clipboardClearSeconds as ClipboardClearSeconds) ? value.clipboardClearSeconds as ClipboardClearSeconds : defaults.clipboardClearSeconds,
  };
}

const DATABASE_NAME = "clipsx-vault-v1"; const STORE_NAME = "vault-settings";
function database(): Promise<IDBDatabase> { if (typeof indexedDB === "undefined") throw new Error("Vault settings require a browser."); return new Promise((resolve, reject) => { const request = indexedDB.open(DATABASE_NAME, 2); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "accountId" }); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error ?? new Error("Unable to open vault settings.")); }); }
function result<T>(request: IDBRequest<T>): Promise<T> { return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error ?? new Error("Vault settings request failed.")); }); }
export async function loadVaultSettings(accountId: string): Promise<VaultSettings> { const db = await database(); try { return validateVaultSettings(await result(db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(accountId)), accountId); } finally { db.close(); } }
export async function saveVaultSettings(settings: VaultSettings): Promise<VaultSettings> { const valid = validateVaultSettings(settings, settings.accountId); const db = await database(); try { await result(db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(valid)); return valid; } finally { db.close(); } }
