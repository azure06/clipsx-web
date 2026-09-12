import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyMigrationHistory } from './verify-migration-history.mjs';

test('released migrations are immutable while forward migrations are accepted', () => {
  const directory = mkdtempSync(join(tmpdir(), 'clipsx-migrations-'));
  const migrations = join(directory, 'supabase/migrations');
  try {
    mkdirSync(migrations, { recursive: true });
    const git = (...args) => execFileSync('git', args, { cwd: directory, stdio: 'pipe' });
    git('init');
    const baseline = join(migrations, '20260912000000_baseline.sql');
    writeFileSync(baseline, 'create table example(id integer);\n');
    git('add', '.');
    git('-c', 'user.name=Migration Test', '-c', 'user.email=test@invalid.example', '-c', 'commit.gpgsign=false', 'commit', '-m', 'baseline');
    writeFileSync(join(migrations, '20260913000000_add_name.sql'), 'alter table example add column name text;\n');
    assert.deepEqual(verifyMigrationHistory('HEAD', directory), { preserved: 1, added: 1 });
    writeFileSync(baseline, 'drop table example;\n');
    assert.throws(() => verifyMigrationHistory('HEAD', directory), /Released migration changed/);
  } finally {
    // This path is the exact directory created by mkdtemp above.
    rmSync(directory, { recursive: true, force: true });
  }
});
