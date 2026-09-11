import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { catalogFromRegistry } from './sync-portable-settings.mjs'

function signed(index) {
  const bytes = Buffer.from(JSON.stringify(index))
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const rawPublicKey = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64')
  const signatures = Buffer.from(JSON.stringify({
    schemaVersion: 1,
    signatures: [{ keyId: 'test', algorithm: 'ed25519', signature: sign(null, bytes, privateKey).toString('base64') }],
  }))
  return { bytes, signatures, hash: createHash('sha256').update(bytes).digest('hex'), keys: new Map([['test', rawPublicKey]]) }
}

describe('portable setting catalog generation', () => {
  it('uses only the latest stable unrevoked release and sorts rows', () => {
    const fixture = signed({
      schemaVersion: 4,
      packages: [
        { packageId: 'infiniti.mermaid', version: '1.0.0', sha256: 'a', portableSettings: [] },
        { packageId: 'infiniti.mermaid', version: '1.0.1', sha256: 'b', portableSettings: [
          { settingId: 'fit-diagram', valueKind: 'boolean' },
          { settingId: 'show-source', valueKind: 'boolean' },
        ] },
        { packageId: 'infiniti.jwt-inspector', version: '1.2.2', sha256: 'c', portableSettings: [
          { settingId: 'show-raw', valueKind: 'boolean' },
        ] },
      ],
      revocations: [],
    })
    expect(catalogFromRegistry(fixture.bytes, fixture.signatures, fixture.hash, fixture.keys)).toEqual([
      { packageId: 'infiniti.jwt-inspector', settingId: 'show-raw', valueKind: 'boolean' },
      { packageId: 'infiniti.mermaid', settingId: 'fit-diagram', valueKind: 'boolean' },
      { packageId: 'infiniti.mermaid', settingId: 'show-source', valueKind: 'boolean' },
    ])
  })

  it('rejects a mismatched digest', () => {
    const fixture = signed({ schemaVersion: 4, packages: [], revocations: [] })
    expect(() => catalogFromRegistry(fixture.bytes, fixture.signatures, '0'.repeat(64), fixture.keys)).toThrow(/hash/)
  })
})
