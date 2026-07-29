export type BrowserDeviceRecord = {
  accountId: string;
  deviceId: string;
  schemaVersion: 1;
  protectionProfile: 'webauthn-prf-wrapped' | 'vault-passphrase-wrapped';
  encryptedBundle: Uint8Array;
  bundleNonce: Uint8Array;
  bundleSalt: Uint8Array;
  passphraseKdfSalt?: Uint8Array;
  webauthnCredentialId?: Uint8Array;
  webauthnRpId?: string;
  prfInput?: Uint8Array;
  createdAt: string;
  updatedAt: string;
  enrollmentStatus?: 'registering' | 'pending' | 'active';
  pendingOfferCiphertext?: Uint8Array;
  pendingOfferNonce?: Uint8Array;
  accountCheckpointSequence?: number;
  accountCheckpointHash?: Uint8Array;
};

const DATABASE_NAME = 'clipsx-vault-v1';
const STORE_NAME = 'browser-device-records';

function database(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') throw new Error('Vault local storage requires a browser.');
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: ['accountId', 'deviceId'] });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open vault local storage.'));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Vault local storage request failed.'));
  });
}

export async function saveBrowserDeviceRecord(record: BrowserDeviceRecord): Promise<void> {
  const db = await database();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    await requestResult(transaction.objectStore(STORE_NAME).put(record));
  } finally { db.close(); }
}

export async function loadBrowserDeviceRecord(accountId: string, deviceId: string): Promise<BrowserDeviceRecord | null> {
  const db = await database();
  try {
    return (await requestResult(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get([accountId, deviceId]))) ?? null;
  } finally { db.close(); }
}

export async function listBrowserDeviceRecords(accountId: string): Promise<BrowserDeviceRecord[]> {
  const db = await database();
  try {
    const records = await requestResult(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll());
    return records.filter((record) => record.accountId === accountId);
  } finally { db.close(); }
}

export async function forgetBrowserDeviceRecord(accountId: string, deviceId: string): Promise<void> {
  const db = await database();
  try {
    await requestResult(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete([accountId, deviceId]));
  } finally { db.close(); }
}
