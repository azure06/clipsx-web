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
    deviceEncryptionPublicKey: Uint8Array;
    recoveryKeyId: string;
    recoveryEncryptionPublicKey: Uint8Array;
    encryptedMetadata: Uint8Array;
    collectionId?: string;
    operationId?: string;
  };

export type VaultWorkerResponse =
  | { id: string; type: 'unlocked' }
  | { id: string; type: 'locked' }
  | { id: string; type: 'status'; unlocked: boolean }
  | { id: string; type: 'signed-session-bind'; command: Uint8Array }
  | { id: string; type: 'collection-created'; collectionId: string; command: Uint8Array }
  | { id: string; type: 'error'; message: string };
