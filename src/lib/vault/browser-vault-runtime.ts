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
    if (!this.worker) return;
    try {
      const response = await this.request({ id: crypto.randomUUID(), type: 'lock' });
      if (response.type !== 'locked') throw new Error('Vault worker rejected lock.');
    } finally {
      this.stopWorker();
    }
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

  async createNote(input: { deviceId: string; collectionId: string; content: { type: 'note' | 'login'; title: string; body?: string; username?: string; password?: string; url?: string; labels: string[] } }): Promise<{ noteId: string; command: Uint8Array }> {
    const response = await this.request({ id: crypto.randomUUID(), type: 'create-note', accountId: this.accountId, ...input });
    if (response.type !== 'note-created') throw new Error('Vault worker rejected note creation.');
    return { noteId: response.noteId, command: response.command };
  }

  async updateNote(input: { deviceId: string; collectionId: string; noteId: string; revisionNumber: number; previousRevisionHash: Uint8Array; content: { type: 'note' | 'login'; title: string; body?: string; username?: string; password?: string; url?: string; labels: string[] } }): Promise<{ noteId: string; command: Uint8Array }> {
    const response = await this.request({ id: crypto.randomUUID(), type: 'update-note', accountId: this.accountId, ...input, previousRevisionHash: copy(input.previousRevisionHash) });
    if (response.type !== 'note-created') throw new Error('Vault worker rejected note update.');
    return { noteId: response.noteId, command: response.command };
  }

  async openCollectionSync(input: { deviceId: string; collectionId: string; sync: Uint8Array }) {
    const response = await this.request({ id: crypto.randomUUID(), type: 'open-sync', accountId: this.accountId, ...input, sync: copy(input.sync) });
    if (response.type !== 'sync-opened') throw new Error('Vault worker rejected collection sync.');
    return response.items;
  }

  dispose() {
    this.channel?.close();
    this.stopWorker();
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
