import type { BrowserDeviceRecord } from './browser-device-store';
import type { VaultWorkerRequest, VaultWorkerResponse } from './browser-vault-worker-protocol';

type VaultWorkerPort = {
  onmessage: ((event: MessageEvent<VaultWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: VaultWorkerRequest, transfer?: Transferable[]): void;
  terminate(): void;
};

type PendingRequest = {
  resolve: (response: VaultWorkerResponse) => void;
  reject: (error: Error) => void;
};

function copy(bytes: Uint8Array): Uint8Array {
  return bytes.slice();
}

function transferable(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer as ArrayBuffer;
}

export class BrowserVaultRuntime {
  private worker: VaultWorkerPort | null = null;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly channel: BroadcastChannel | null;
  onLock: (() => void) | null = null;

  constructor(
    private readonly accountId: string,
    private readonly workerFactory: () => VaultWorkerPort = () => new Worker(
      new URL('./browser-vault-worker.ts', import.meta.url),
      { type: 'module', name: 'clipsx-vault-v1' },
    ),
  ) {
    this.channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(`clipsx-vault-v1-lock:${accountId}`);
    this.channel?.addEventListener('message', (event) => {
      if (event.data === 'lock') void this.lock(false);
    });
  }

  async unlock(record: BrowserDeviceRecord, unlockMaterial: Uint8Array): Promise<void> {
    const material = copy(unlockMaterial);
    try {
      const response = await this.request({
        id: crypto.randomUUID(), type: 'unlock', accountId: this.accountId, deviceId: record.deviceId,
        unlockMaterial: material, bundleSalt: copy(record.bundleSalt), bundleNonce: copy(record.bundleNonce),
        encryptedBundle: copy(record.encryptedBundle),
      }, [transferable(material)]);
      if (response.type !== 'unlocked') throw new Error('Vault worker rejected unlock.');
    } finally {
      unlockMaterial.fill(0);
    }
  }

  async lock(broadcast = true): Promise<void> {
    if (broadcast) this.channel?.postMessage('lock');
    if (!this.worker) { this.onLock?.(); return; }
    try {
      const response = await this.request({ id: crypto.randomUUID(), type: 'lock' });
      if (response.type !== 'locked') throw new Error('Vault worker rejected lock.');
    } finally {
      this.stopWorker();
      this.onLock?.();
    }
  }

  async openAccountSync(input: {
    deviceId: string;
    pages: Uint8Array[];
    checkpointSequence?: number;
    checkpointHash?: Uint8Array;
  }): Promise<{ sequence: number; accountHead: Uint8Array }> {
    const response = await this.request({
      id: crypto.randomUUID(), type: 'open-account-sync', accountId: this.accountId,
      deviceId: input.deviceId, pages: input.pages.map(copy), checkpointSequence: input.checkpointSequence,
      checkpointHash: input.checkpointHash ? copy(input.checkpointHash) : undefined,
    });
    if (response.type !== 'account-sync-opened') throw new Error('Vault worker rejected account sync.');
    return { sequence: response.sequence, accountHead: response.accountHead };
  }

  async signSessionBinding(input: {
    deviceId: string;
    sessionId: string;
    expectedAccountHead: Uint8Array;
    operationId?: string;
  }): Promise<Uint8Array> {
    const response = await this.request({
      id: crypto.randomUUID(), type: 'sign-session-bind', accountId: this.accountId,
      deviceId: input.deviceId, sessionId: input.sessionId,
      expectedAccountHead: copy(input.expectedAccountHead), operationId: input.operationId,
    });
    if (response.type !== 'signed-session-bind') throw new Error('Vault worker rejected session binding.');
    return response.command;
  }

  async createCollection(input: {
    deviceId: string;
    metadataTitle: string;
    collectionId?: string;
    operationId?: string;
  }): Promise<{ collectionId: string; command: Uint8Array }> {
    const response = await this.request({
      id: crypto.randomUUID(), type: 'create-collection', accountId: this.accountId,
      deviceId: input.deviceId,
      metadataTitle: input.metadataTitle, collectionId: input.collectionId, operationId: input.operationId,
    });
    if (response.type !== 'collection-created') throw new Error('Vault worker rejected collection creation.');
    return { collectionId: response.collectionId, command: response.command };
  }

  async openBootstrap(bootstrap: Uint8Array): Promise<Array<{ id: string; title: string }>> {
    const response = await this.request({ id: crypto.randomUUID(), type: 'open-bootstrap', accountId: this.accountId, bootstrap: copy(bootstrap) });
    if (response.type !== 'bootstrap-opened') throw new Error('Vault worker rejected bootstrap.');
    return response.collections;
  }

  async authorizeDevice(input: { deviceId: string; offer: string; operationId?: string }) {
    const response = await this.request({ id: crypto.randomUUID(), type: 'authorize-device', accountId: this.accountId, ...input });
    if (response.type !== 'device-authorized') throw new Error('Vault worker rejected device approval.');
    return { deviceId: response.deviceId, sas: response.sas, command: response.command };
  }

  async createItem(input: { deviceId: string; collectionId: string; content: import('./vault-item').VaultItemContent }): Promise<{ itemId: string; command: Uint8Array }> {
    const response = await this.request({ id: crypto.randomUUID(), type: 'create-item', accountId: this.accountId, ...input });
    if (response.type !== 'item-created') throw new Error('Vault worker rejected item creation.');
    return { itemId: response.itemId, command: response.command };
  }

  async updateItem(input: { deviceId: string; collectionId: string; itemId: string; revisionNumber: number; previousRevisionHash: Uint8Array; content: import('./vault-item').VaultItemContent }): Promise<{ itemId: string; command: Uint8Array }> {
    const response = await this.request({ id: crypto.randomUUID(), type: 'update-item', accountId: this.accountId, ...input, previousRevisionHash: copy(input.previousRevisionHash) });
    if (response.type !== 'item-created') throw new Error('Vault worker rejected item update.');
    return { itemId: response.itemId, command: response.command };
  }

  async deleteItem(input: { deviceId: string; collectionId: string; itemId: string; previousRevisionHash: Uint8Array }): Promise<{ itemId: string; command: Uint8Array }> {
    const response = await this.request({ id: crypto.randomUUID(), type: 'delete-item', accountId: this.accountId, ...input, previousRevisionHash: copy(input.previousRevisionHash) });
    if (response.type !== 'item-deleted') throw new Error('Vault worker rejected item deletion.');
    return { itemId: response.itemId, command: response.command };
  }

  /** @deprecated Transitional UI adapter while the legacy shell is removed. */
  async createNote(input: { deviceId: string; collectionId: string; content: import('./vault-item').VaultItemContent }): Promise<{ noteId: string; command: Uint8Array }> {
    const result = await this.createItem(input); return { noteId: result.itemId, command: result.command };
  }
  /** @deprecated Transitional UI adapter while the legacy shell is removed. */
  async updateNote(input: { deviceId: string; collectionId: string; noteId: string; revisionNumber: number; previousRevisionHash: Uint8Array; content: import('./vault-item').VaultItemContent }): Promise<{ noteId: string; command: Uint8Array }> {
    const result = await this.updateItem({ ...input, itemId: input.noteId }); return { noteId: result.itemId, command: result.command };
  }
  /** @deprecated Transitional UI adapter while the legacy shell is removed. */
  async deleteNote(input: { deviceId: string; collectionId: string; noteId: string; previousRevisionHash: Uint8Array }): Promise<{ noteId: string; command: Uint8Array }> {
    const result = await this.deleteItem({ ...input, itemId: input.noteId }); return { noteId: result.itemId, command: result.command };
  }

  async openCollectionSync(input: { deviceId: string; collectionId: string; pages: Uint8Array[] }) {
    const response = await this.request({ id: crypto.randomUUID(), type: 'open-sync', accountId: this.accountId, ...input, pages: input.pages.map(copy) });
    if (response.type !== 'sync-opened') throw new Error('Vault worker rejected collection sync.');
    return response.items;
  }

  dispose() {
    this.channel?.close();
    this.stopWorker();
    this.onLock?.();
  }

  private getWorker(): VaultWorkerPort {
    if (this.worker) return this.worker;
    const worker = this.workerFactory();
    worker.onmessage = (event) => {
      const response = event.data;
      const pending = this.pending.get(response.id);
      if (!pending) return;
      this.pending.delete(response.id);
      if (response.type === 'error') pending.reject(new Error(response.message));
      else pending.resolve(response);
    };
    worker.onerror = (event) => this.failAll(new Error(event.message || 'Vault worker failed.'));
    this.worker = worker;
    return worker;
  }

  private request(request: VaultWorkerRequest, transfer?: Transferable[]): Promise<VaultWorkerResponse> {
    const worker = this.getWorker();
    return new Promise((resolve, reject) => {
      this.pending.set(request.id, { resolve, reject });
      worker.postMessage(request, transfer);
    });
  }

  private stopWorker() {
    this.worker?.terminate();
    this.worker = null;
    this.failAll(new Error('Vault locked.'));
  }

  private failAll(error: Error) {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
}
