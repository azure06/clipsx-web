import { describe, expect, it } from 'vitest';

import { beginNoteConflict, isStaleNoteUpdate, keepRemoteResolution, manualMergeResolution, reapplyLocalResolution } from './browser-note-conflict';

const remote = {
  id: 'note-1', revisionNumber: 2, revisionHash: new Uint8Array(32).fill(2),
  type: 'note' as const, title: 'Remote', body: 'Accepted version', labels: ['remote'],
};
const local = { type: 'note' as const, title: 'Local', body: 'Unsaved version', labels: ['local'] };

describe('browser note conflict resolution', () => {
  it('recognizes only a stale-write rejection as a conflict', () => {
    expect(isStaleNoteUpdate(409)).toBe(true);
    expect(isStaleNoteUpdate(422)).toBe(false);
  });

  it('keeps the verified remote version when requested', () => {
    const conflict = beginNoteConflict(local, remote);
    expect(keepRemoteResolution()).toBeNull();
    expect(conflict.remote).toBe(remote);
  });

  it('reapplies an in-memory local draft against the refreshed remote head', () => {
    const resolved = reapplyLocalResolution(beginNoteConflict(local, remote));
    expect(resolved).toEqual(local);
    expect(resolved.labels).not.toBe(local.labels);
  });

  it('uses the user-provided manual merge without changing the remote item identity', () => {
    const resolved = manualMergeResolution(beginNoteConflict(local, remote), {
      type: 'note', title: 'Merged', body: 'Remote and local', labels: ['merged'],
    });
    expect(resolved).toMatchObject({ title: 'Merged', body: 'Remote and local' });
    expect(() => manualMergeResolution(beginNoteConflict(local, remote), { type: 'login', title: 'Wrong type', username: 'x', password: 'y', labels: [] })).toThrow('cannot change the item type');
  });
});
