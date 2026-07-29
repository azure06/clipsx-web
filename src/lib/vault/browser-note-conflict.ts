export type VaultItemContent = {
  type: 'note' | 'login';
  title: string;
  body?: string;
  username?: string;
  password?: string;
  url?: string;
  labels: string[];
};

export type VaultItemHead = VaultItemContent & {
  id: string;
  revisionNumber: number;
  revisionHash: Uint8Array;
};

export type NoteConflict = {
  local: VaultItemContent;
  remote: VaultItemHead;
};

export function isStaleNoteUpdate(status: number): boolean {
  return status === 409;
}

export function beginNoteConflict(local: VaultItemContent, remote: VaultItemHead): NoteConflict {
  return { local: { ...local, labels: [...local.labels] }, remote };
}

export function keepRemoteResolution(): null {
  return null;
}

export function reapplyLocalResolution(conflict: NoteConflict): VaultItemContent {
  return { ...conflict.local, labels: [...conflict.local.labels] };
}

export function manualMergeResolution(conflict: NoteConflict, merged: VaultItemContent): VaultItemContent {
  if (merged.type !== conflict.remote.type) throw new Error('A conflict merge cannot change the item type.');
  return { ...merged, labels: [...merged.labels] };
}
