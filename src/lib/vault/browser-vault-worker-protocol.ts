export type VaultWorkerRequest =
  | {
    id: string;
    type: 'unlock';
    accountId: string;
    deviceId: string;
    unlockMaterial: Uint8Array;
    bundleSalt: Uint8Array;
    bundleNonce: Uint8Array;
    encryptedBundle: Uint8Array;
  }
  | { id: string; type: 'lock' }
  | { id: string; type: 'status' }
  | {
    id: string;
    type: 'sign-session-bind';
    accountId: string;
    deviceId: string;
    sessionId: string;
    expectedAccountHead: Uint8Array;
    operationId?: string;
  }
  | {
    id: string;
    type: 'create-collection';
    accountId: string;
    deviceId: string;
    metadataTitle: string;
    collectionId?: string;
    operationId?: string;
  }
  | { id: string; type: 'open-bootstrap'; accountId: string; bootstrap: Uint8Array }
  | { id: string; type: 'open-sync'; accountId: string; deviceId: string; collectionId: string; sync: Uint8Array }
  | { id: string; type: 'create-note'; accountId: string; deviceId: string; collectionId: string; content: { type: 'note' | 'login'; title: string; body?: string; username?: string; password?: string; url?: string; labels: string[] } };

export type VaultWorkerResponse =
  | { id: string; type: 'unlocked' }
  | { id: string; type: 'locked' }
  | { id: string; type: 'status'; unlocked: boolean }
  | { id: string; type: 'signed-session-bind'; command: Uint8Array }
  | { id: string; type: 'collection-created'; collectionId: string; command: Uint8Array }
  | { id: string; type: 'bootstrap-opened'; collections: Array<{ id: string; title: string }> }
  | { id: string; type: 'sync-opened'; items: Array<{ id: string; type: 'note' | 'login'; title: string; body?: string; username?: string; password?: string; url?: string; labels: string[] }> }
  | { id: string; type: 'note-created'; noteId: string; command: Uint8Array }
  | { id: string; type: 'error'; message: string };
