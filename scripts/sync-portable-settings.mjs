import { createHash, createPublicKey, verify } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const TRUSTED_KEYS = new Map([
  ['infiniti-registry-2026-01', 'zWBq9jTt/X/ps0+qFlu8GekJDI+Ju87GFkyDnP0Fia8='],
])
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const fail = message => { throw new Error(message) }
const option = name => {
  const index = process.argv.indexOf(name)
  return index < 0 ? null : process.argv[index + 1]
}
const compareSemver = (left, right) => {
  const parse = value => {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value)
    return match?.slice(1).map(Number) ?? null
  }
  const a = parse(left)
  const b = parse(right)
  if (!a || !b) return a ? 1 : b ? -1 : left.localeCompare(right)
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}
const sqlText = value => `'${value.replaceAll("'", "''")}'`

function trustedKey(rawBase64) {
  const raw = Buffer.from(rawBase64, 'base64')
  if (raw.length !== 32) fail('Trusted Ed25519 key is malformed')
  return createPublicKey({
    key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]),
    format: 'der',
    type: 'spki',
  })
}

export function catalogFromRegistry(indexBytes, signatureBytes, expectedHash, trustedKeys = TRUSTED_KEYS) {
  if (sha256(indexBytes) !== expectedHash) fail('Registry index hash does not match the dispatched revision')
  const signatures = JSON.parse(signatureBytes)
  if (signatures.schemaVersion !== 1 || !Array.isArray(signatures.signatures)) fail('Unsupported registry signature document')
  const accepted = signatures.signatures.some(signature => {
    const key = trustedKeys.get(signature.keyId)
    return key && signature.algorithm === 'ed25519' && verify(null, indexBytes, trustedKey(key), Buffer.from(signature.signature, 'base64'))
  })
  if (!accepted) fail('Registry index is not signed by a trusted key')

  const index = JSON.parse(indexBytes)
  if (index.schemaVersion !== 4 || !Array.isArray(index.packages) || !Array.isArray(index.revocations)) fail('Unsupported registry index')
  const revoked = new Set(index.revocations.map(item => `${item.packageId}@${item.version}@${item.sha256}`))
  const latest = new Map()
  for (const entry of index.packages) {
    if (revoked.has(`${entry.packageId}@${entry.version}@${entry.sha256}`) || entry.version.includes('-')) continue
    const previous = latest.get(entry.packageId)
    if (!previous || compareSemver(entry.version, previous.version) > 0) latest.set(entry.packageId, entry)
  }
  const rows = []
  for (const entry of latest.values()) {
    if (!/^infiniti\.[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.packageId)) fail('Registry contains an invalid package ID')
    if (!Array.isArray(entry.portableSettings)) fail(`${entry.packageId}: portableSettings is missing`)
    let previousSettingId = ''
    for (const setting of entry.portableSettings) {
      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(setting.settingId) ||
        !['boolean', 'number'].includes(setting.valueKind) ||
        setting.settingId <= previousSettingId ||
        Object.keys(setting).sort().join(',') !== 'settingId,valueKind'
      ) {
        fail(`${entry.packageId}: invalid portable setting declaration`)
      }
      previousSettingId = setting.settingId
      rows.push({ packageId: entry.packageId, settingId: setting.settingId, valueKind: setting.valueKind })
    }
  }
  rows.sort((a, b) => a.packageId.localeCompare(b.packageId) || a.settingId.localeCompare(b.settingId))
  if (new Set(rows.map(row => `${row.packageId}/${row.settingId}`)).size !== rows.length) fail('Portable setting declarations are duplicated')
  return rows
}

function reconciliationSql(rows) {
  const values = rows.length
    ? rows.map(row => `(${sqlText(row.packageId)}, ${sqlText(row.settingId)}, ${sqlText(row.valueKind)}, NULL::jsonb)`).join(',\n  ')
    : null
  return `BEGIN;
LOCK TABLE sync_internal.extension_settings IN EXCLUSIVE MODE;
CREATE TEMP TABLE desired_extension_settings (
  package_id text NOT NULL,
  setting_id text NOT NULL,
  value_kind text NOT NULL,
  allowed_values jsonb,
  UNIQUE (package_id, setting_id)
) ON COMMIT DROP;
${values ? `INSERT INTO desired_extension_settings (package_id, setting_id, value_kind, allowed_values) VALUES\n  ${values};` : ''}
DELETE FROM sync_internal.extension_settings AS current
WHERE NOT EXISTS (
  SELECT 1 FROM desired_extension_settings AS desired
  WHERE desired.package_id = current.package_id AND desired.setting_id = current.setting_id
);
INSERT INTO sync_internal.extension_settings (package_id, setting_id, value_kind, allowed_values)
SELECT package_id, setting_id, value_kind, allowed_values FROM desired_extension_settings
ON CONFLICT (package_id, setting_id) DO UPDATE
SET value_kind = EXCLUDED.value_kind, allowed_values = EXCLUDED.allowed_values;
DO $verify$
BEGIN
  IF EXISTS (
    (SELECT package_id, setting_id, value_kind, allowed_values FROM desired_extension_settings
     EXCEPT SELECT package_id, setting_id, value_kind, allowed_values FROM sync_internal.extension_settings)
    UNION ALL
    (SELECT package_id, setting_id, value_kind, allowed_values FROM sync_internal.extension_settings
     EXCEPT SELECT package_id, setting_id, value_kind, allowed_values FROM desired_extension_settings)
  ) THEN RAISE EXCEPTION 'portable setting catalog reconciliation mismatch'; END IF;
END $verify$;
COMMIT;
`
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const registry = option('--registry')
  const expectedHash = option('--index-sha256')
  const catalogOutput = option('--catalog-output')
  const sqlOutput = option('--sql-output')
  if (!registry || !expectedHash || !catalogOutput || !sqlOutput) {
    fail('usage: sync-portable-settings --registry <dir> --index-sha256 <hash> --catalog-output <json> --sql-output <sql>')
  }
  const root = resolve(registry)
  const rows = catalogFromRegistry(
    readFileSync(resolve(root, 'index.json')),
    readFileSync(resolve(root, 'index.signatures.json')),
    expectedHash,
  )
  writeFileSync(resolve(catalogOutput), `${JSON.stringify(rows, null, 2)}\n`)
  writeFileSync(resolve(sqlOutput), reconciliationSql(rows))
  console.log(`prepared ${rows.length} portable setting approvals`)
}
