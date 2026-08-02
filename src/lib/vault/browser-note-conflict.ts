import type { VaultItemContent } from './vault-item';
export type { VaultItemContent } from './vault-item';

export type VaultItemHead = VaultItemContent & {
  id: string;
  revisionNumber: number;
  revisionHash: Uint8Array;
};

export type NoteConflict = {
  local: VaultItemContent;
  remote: VaultItemHead;
};

export function isStaleItemUpdate(status: number): boolean {
  return status === 409;
}
/** @deprecated use isStaleItemUpdate */
export const isStaleNoteUpdate = isStaleItemUpdate;

export function beginItemConflict(local: VaultItemContent, remote: VaultItemHead): NoteConflict {
  return { local: { ...local, labels: [...local.labels], content: local.content?.slice(), properties: { ...local.properties } }, remote };
}
/** @deprecated use beginItemConflict */
export const beginNoteConflict = beginItemConflict;

export function keepRemoteResolution(): null {
  return null;
}

export function reapplyLocalResolution(conflict: NoteConflict): VaultItemContent {
  return { ...conflict.local, labels: [...conflict.local.labels], content: conflict.local.content?.slice(), properties: { ...conflict.local.properties } };
}

export function manualMergeResolution(conflict: NoteConflict, merged: VaultItemContent): VaultItemContent {
  return { ...merged, labels: [...merged.labels], content: merged.content?.slice(), properties: { ...merged.properties } };
}
