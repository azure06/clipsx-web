import type { VaultItemContent } from './vault-item';

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
  | {
    id: string;
    type: 'open-account-sync';
    accountId: string;
    deviceId: string;
    pages: Uint8Array[];
    checkpointSequence?: number;
    checkpointHash?: Uint8Array;
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
  | { id: string; type: 'authorize-device'; accountId: string; deviceId: string; offer: string; operationId?: string }
  | { id: string; type: 'open-sync'; accountId: string; deviceId: string; collectionId: string; pages: Uint8Array[] }
  | { id: string; type: 'create-item'; accountId: string; deviceId: string; collectionId: string; content: Omit<VaultItemContent, 'createdAt' | 'updatedAt'> }
  | { id: string; type: 'update-item'; accountId: string; deviceId: string; collectionId: string; itemId: string; revisionNumber: number; previousRevisionHash: Uint8Array; content: VaultItemContent }
  | { id: string; type: 'delete-item'; accountId: string; deviceId: string; collectionId: string; itemId: string; previousRevisionHash: Uint8Array };

export type VaultWorkerResponse =
  | { id: string; type: 'unlocked' }
  | { id: string; type: 'account-sync-opened'; sequence: number; accountHead: Uint8Array }
  | { id: string; type: 'locked' }
  | { id: string; type: 'status'; unlocked: boolean }
  | { id: string; type: 'signed-session-bind'; command: Uint8Array }
  | { id: string; type: 'collection-created'; collectionId: string; command: Uint8Array }
  | { id: string; type: 'bootstrap-opened'; collections: Array<{ id: string; title: string }> }
  | { id: string; type: 'device-authorized'; deviceId: string; sas: string; command: Uint8Array }
  | { id: string; type: 'sync-opened'; items: Array<VaultItemContent & { id: string; revisionNumber: number; revisionHash: Uint8Array; authorDeviceId: string }> }
  | { id: string; type: 'item-created'; itemId: string; command: Uint8Array }
  | { id: string; type: 'item-deleted'; itemId: string; command: Uint8Array }
  | { id: string; type: 'error'; message: string };
