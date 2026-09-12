import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function verifyMigrationHistory(base, cwd = process.cwd()) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
  const commit = git('rev-parse', '--verify', `${base}^{commit}`).trim();
  const directory = 'supabase/migrations';
  const previous = git('ls-tree', '-r', '--name-only', commit, '--', directory).trim().split('\n').filter((name) => name.endsWith('.sql')).sort();
  const current = readdirSync(`${cwd}/${directory}`).filter((name) => name.endsWith('.sql')).map((name) => `${directory}/${name}`).sort();
  const canonical = (value) => value.replaceAll('\r\n', '\n');
  for (const name of previous) {
    if (!current.includes(name) || canonical(readFileSync(`${cwd}/${name}`, 'utf8')) !== canonical(git('show', `${commit}:${name}`))) {
      throw new Error(`Released migration changed: ${name}. Add a forward migration instead.`);
    }
  }
  const added = current.filter((name) => !previous.includes(name));
  for (const name of added) {
    if (!/\/\d{14}_[a-z0-9_]+\.sql$/.test(name) || (previous.length && name <= previous.at(-1))) {
      throw new Error(`New migration must sort after the released history: ${name}`);
    }
  }
  return { preserved: previous.length, added: added.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.argv[process.argv.indexOf('--base') + 1];
  if (!process.argv.includes('--base') || !base) throw new Error('Usage: node scripts/verify-migration-history.mjs --base RELEASE_TAG_OR_COMMIT');
  console.log(verifyMigrationHistory(base));
}
