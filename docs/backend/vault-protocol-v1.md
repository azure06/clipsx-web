# Vault protocol v1

## Status and authority

This is the normative v1 implementation contract for the ClipsX browser vault.
It applies to browser, Next.js route-handler, Supabase, and future desktop
implementations. Where it differs from an earlier illustrative algorithm or
open question in [architecture.md](architecture.md), this document wins.

### Implementation progress

The browser-safe primitive layer is implemented in
`src/lib/vault/protocol.ts` and covered by `src/lib/vault/protocol.test.ts`.
It supplies deterministic-CBOR validation, strict v1 command decoding, HKDF
domain separation, AES-GCM, Ed25519 signing, X25519 HPKE envelopes, and BIP-39
recovery encoding. `POST /api/vault/commands` admits ordinary commands and
executes the separately verified `device-register` bootstrap transaction. That
transaction retains both the recovery authorization signature and the proposed
device's possession-proof signature in its authorization evidence.
`src/lib/vault/browser-onboarding.ts` now creates the recovery phrase,
deterministically derives recovery keys, creates fresh device keys, serializes
only the device private-key pair, and wraps that bundle with domain-separated
AEAD context. The browser-only IndexedDB store persists only that encrypted
bundle and non-secret unlock metadata; the recovery phrase and recovery private
keys are not included in the local bundle.
The browser WebAuthn helper creates a dedicated user-verifying PRF credential
and obtains its 32-byte output only in browser memory. Recovery-phrase
confirmation UI is implemented at `/[locale]/vault`: it shows and confirms the
mandatory phrase, selects a PRF/passphrase local protection profile, obtains a
challenge, signs/submits the bootstrap command, and only then saves the local
encrypted device bundle. The same route discovers this account's local device
record and transfers derived unlock material to the dedicated worker using the
PRF credential or passphrase; locking releases the worker's key references.
Initial registration binds the device to the authenticated Supabase session;
an unlocked active device can submit the signed `device-session-bind` command
after later account sign-in changes that session. Remaining phases add
authorization-chain sync verification, rollback checkpoints, teardown and
delivery hardening, deterministic fixtures, and staging acceptance.
The current unlock flow transfers the derived unlock material to a dedicated
module worker, which unwraps and retains the device keys without returning them
to React. Lock, page exit, and a same-account cross-tab lock event zeroize the
worker-held key buffers and terminate the worker. The worker can also create a
signed session-binding command without releasing the device signing key.
`GET /api/vault/bootstrap` now returns the bound device's current collection
records, epoch transitions, and device envelope bytes as canonical CBOR. The
worker verifies their signatures and hashes, opens its own HPKE envelopes, and
decrypts collection metadata before returning collection labels to the UI.
The unlocked vault screen can create a named collection through that worker;
the collection appears only after the command succeeds and the bootstrap result
has been re-fetched and verified.
The unlocked screen can also create an encrypted note or login. Bootstrap now
includes each collection's authenticated operation head; the worker retains it
with the verified current epoch key. A `note-append` command creates an
initial or later immutable revision, binds that head (and, for a later
revision, its exact prior revision hash), and carries opaque content/key-wrap ciphertext plus
an independently signed immutable-revision record. The command route verifies
both signatures and its hashes before a private transaction atomically inserts
the note, revision, and next collection-operation entry. The UI refreshes the
verified bootstrap after acceptance and never presents locally generated text
as persisted state. On a `409` note-update rejection it keeps the plaintext
draft only in worker/UI memory, re-fetches and verifies bootstrap and
collection sync, and shows the verified remote revision. The user may discard
the draft, reapply it, or manually merge fields; either write is a newly signed
next immutable revision. Lock, page exit, cross-tab lock, and component
teardown clear the draft and rendered plaintext; no conflict draft is persisted
yet.
Cross-runtime fixture files remain a required follow-up before desktop
compatibility is claimed.

Verified collection sharing is implemented by
`src/lib/vault/browser-collection-sharing.ts`, command-specific admission, the
shared command route, and private Supabase transactions. Invitation creation,
recipient acceptance, and inviter confirmation are separate signed
collection-head operations. `member-add` and `member-remove` each combine the
membership transition, clean next epoch, exact envelope set, commitments, and
operation-log append in one transaction. Pending/invited accounts receive no
collection RLS access.

V1 supports encrypted notes and login/password records, personal and shared
collections, device approval, recovery, revocation, conflicts, and browser
sync. File attachments and an independently witnessed transparency log are
explicitly out of scope.

## Security and account model

Supabase Google OAuth, email/password, and optional account passkeys establish
an account session. They do not decrypt the vault. A separate vault WebAuthn
credential or vault passphrase unlocks the browser device bundle.

Every initial vault enrollment creates a mandatory 32-byte recovery secret.
It is encoded as an English 24-word BIP-39 phrase and the user must confirm
randomly selected words before onboarding completes. There is no no-recovery
bootstrap and no extra passphrase for this recovery phrase.

The standard unlock profile is `webauthn-prf-wrapped` with `userVerification`
set to `required`. The browser creates a dedicated vault credential scoped to
the `clipsx.app` relying-party ID. It retains a random 32-byte PRF input,
credential ID, and bundle salt locally. The PRF output is used only in the
browser. A `vault-passphrase-wrapped` profile is the explicit fallback; the
direct `indexeddb-nonextractable` profile is not supported in v1.

The schema reserves an optional `PasskeyRecoveryWrapper`: recovery-secret
ciphertext under a distinct key derived from an eligible vault credential's PRF
output. It is deferred from the shipping v1 browser feature. The mandatory
offline recovery phrase remains the only recovery path implemented by v1. The
server never receives the PRF output, unlock key, recovery secret, or recovery
private key in plaintext.

## Algorithm profile

| Purpose | V1 choice |
| --- | --- |
| Key delivery | RFC 9180 HPKE base mode: DHKEM(X25519, HKDF-SHA-256), HKDF-SHA-256, AES-256-GCM |
| Device and recovery signatures | Ed25519 |
| Content, key wrapping, local bundle, recovery wrapper | AES-256-GCM with fresh 96-bit random nonces |
| Hash and KDF | SHA-256 and HKDF-SHA-256 |
| Vault-passphrase KDF | scrypt: `N=131072`, `r=8`, `p=1`, 16-byte salt, 32-byte output |
| Recovery encoding | 32-byte entropy as a 24-word English BIP-39 phrase |
| Canonical serialization | RFC 8949 core deterministic CBOR |

V1 starts with `@hpke/core@1.9.0`, `@hpke/dhkem-x25519@1.8.0`,
`@noble/curves@2.2.0`, `@noble/hashes@2.2.0`, `@scure/bip39@2.2.0`,
`cborg@5.1.8`, and `zxcvbn@4.4.2`, plus Web Crypto for AES-GCM. Lock these
exact package versions in `package-lock.json`; do not substitute an algorithm,
package, or encoding mode without a new protocol version.

All key derivations use HKDF-SHA-256 with a protocol-versioned ASCII info label:

```text
clipsx/vault/v1/browser-unlock
clipsx/vault/v1/passkey-recovery-wrapper
clipsx/vault/v1/recovery-encryption-key
clipsx/vault/v1/recovery-signing-key
```

The key derivation context always includes the account ID, device or credential
ID where applicable, bundle/recovery version, and purpose. AAD always includes
the protocol version, algorithm ID, and the immutable identity of the object it
protects. Every AEAD nonce is generated with `crypto.getRandomValues()` and
never reused under its key.

## Canonical records and transport

All protocol records are definite-length deterministic CBOR maps. Field labels
are positive integers, allocated contiguously in the field order listed in the
record definition. Labels are never reused. Optional fields are omitted; an
empty value is not the same as an omitted value. Decoders reject duplicate map
keys, indefinite lengths, unknown required fields, unknown versions, non-minimal
integer encodings, and a record whose deterministic re-encoding differs from
the received bytes.

Signatures and hashes are calculated over:

```text
UTF-8(domain-label) || 0x00 || deterministic-CBOR(record-without-signature)
```

`VaultCommandV1` has these ordered fields:

1. `protocolVersion`
2. `operationId`
3. `operationType`
4. `accountId`
5. `authorDeviceId` or `recoveryKeyId`
6. `collectionId` when applicable
7. `expectedAccountHead` when applicable
8. `expectedCollectionHead` when applicable
9. `payload`
10. `signature`

The command domain label is `clipsx/vault/v1/command/<operationType>`. Valid
operations in v1 are `device-register`, `device-session-bind`,
`device-authorize`, `device-revoke`, `recovery-rotate`, `collection-create`,
`note-append`, `note-delete`, `checkpoint-append`, `invitation-create`,
`invitation-accept`, `invitation-confirm`, `member-add`, `member-remove`,
`epoch-rotate`, and `epoch-envelope-grant`.

`device-session-bind` is signed by an unlocked active device after an account
sign-in creates a new Supabase session. It atomically replaces that device's
current session binding and appends an account-log record. It is the sole
exception to the normal requirement that a device command already match the
bound session. `epoch-envelope-grant` is a bounded, signed delivery of an
existing epoch key to a newly authorized device or an explicitly approved
historical member; it never changes the epoch or grants implicit history.

### First-device registration payload

`device-register` is the sole bootstrap command. Its author field is
`recovery:<recoveryKeyId>`; the recovery signing public key is carried in its
payload because no root exists yet. The server requires an authenticated account
session and a short-lived, single-use device challenge before accepting it.

The authenticated browser first sends `POST /api/vault/device-challenges` as a
two-field CBOR map: `1: protocolVersion` and `2: deviceEncryptionPublicKey`.
The response contains challenge ID, HPKE encapsulation, ciphertext, and expiry.
Its AAD binds protocol, account ID, and challenge ID. The server retains only a
SHA-256 challenge hash for five minutes; it never stores the raw challenge.

Its `payload` is a deterministic-CBOR map with these contiguous labels:

1. `deviceId`
2. `recoveryKeyId`
3. `displayName`
4. `platform`
5. `enrollmentOrigin` (`https://clipsx.app`)
6. `protectionProfile` (`webauthn-prf-wrapped` or `vault-passphrase-wrapped`)
7. `clientCryptoCapabilitiesHash`
8. `deviceEncryptionPublicKey` (32 bytes)
9. `deviceSigningPublicKey` (32 bytes)
10. `recoveryEncryptionPublicKey` (32 bytes)
11. `recoverySigningPublicKey` (32 bytes)
12. `keyVersion` (`1`)
13. `challengeId`
14. `challengeResponseHash` (SHA-256 of the HPKE-decrypted server challenge)
15. `deviceProofSignature` (Ed25519 device-signing-key signature over labels
    1--14 using `clipsx/vault/v1/device-register-proof`)

The recovery signing key signs the enclosing command. This self-signature is
the initial recovery root; it is accepted only when the account has no recovery
root or active device. The device proof and HPKE challenge response prove
possession of both newly supplied device private keys. The one transaction then
creates the recovery root, active device, device authorization, and account
operation sequence `1`. No recovery phrase, private key, passphrase, PRF
output, or decrypted challenge is transmitted.

### Existing-device approval payload

A non-bootstrap `device-register` command is signed by the proposed device.
Its deterministic payload carries the proposed public keys, protection metadata,
registration-challenge ID, and hash of the decrypted HPKE challenge. The outer
Ed25519 signature and HPKE response are independent possession proofs. The
server retains this as a private, 15-minute pending registration; pending
devices have neither a public device row nor any bootstrap, sync, envelope, or
session-binding access.

After QR exchange and a local comparison of the displayed SAS, a bound active
device signs `device-authorize`. Its payload is: pending device ID, literal
`qr-sas` method, SHA-256 SAS commitment, pending-command hash, and one signed
HPKE envelope per current personal collection. The private transaction checks
the account head, authorizer binding, retained proof, and exact envelope set;
it atomically creates the active device, evidence row, envelopes, and linked
account operation, then deletes the pending registration. There is no
unauthenticated or account-session-only approval fallback. The browser protects
the proposed bundle before registration, renders the QR, restores it only after
local unlock, compares the SAS, and asks the unlocked authorizer worker to
create the signed current-epoch envelopes.

### Recovery-root device authorization

The recovery phrase is decoded and expanded into the recovery X25519 and
Ed25519 key pairs only in browser memory. The phrase, entropy, and private keys
are never sent to the route handler. A recovery authorization reuses the same
pending-device possession proof, but its command author is
`recovery:<recoveryKeyId>` and its payload replaces the QR/SAS fields with the
pending-command hash and a full current-personal-epoch envelope set. Each
envelope names the recovery key as its sender and is signed by the recovery
signing key; the database records that sender explicitly rather than attributing
it to a browser device. The private transaction requires the active recovery
root, authenticated account session, current account head, and exact envelope
set before it activates the pending device and appends the account operation.

The browser sends commands to `POST /api/vault/commands` as
`application/cbor`. Successful results and sync pages are also canonical CBOR.
Responses use HTTP `401`, `403`, `409`, `413`, or `422` with a stable,
non-secret protocol error code. The route handler verifies session, active
device/recovery authority, canonical bytes, size, hash, and Ed25519 signature
before calling a single private database transaction. Browser clients have no
direct mutation grants.

### Initial collection creation payload

`collection-create` is signed by the active, session-bound device and creates
one empty collection at epoch `1`. Its payload has labels `1` collection ID,
`2` epoch-key-encrypted metadata ciphertext, `3` metadata nonce, `4` owner
membership-state hash, `5` recipient-set commitment, `6` canonical epoch
transition payload, `7` transition signature, `8` transition hash, `9` device
envelope payload, `10` device-envelope signature, `11` recovery-envelope
payload, `12` recovery-envelope signature, and `13` active recovery-key ID.
The two envelope payloads identify the same collection and epoch and include
the recipient kind/ID, sender device, HPKE encapsulation, and ciphertext.

The browser worker generates the random epoch key, encrypts metadata under it,
delivers that key separately to the creating device and current recovery root,
and retains it only in its unlocked worker session. The server stores neither
the epoch key nor metadata plaintext. The private transaction inserts the
collection, active owner membership, current epoch, both envelopes, and the
first collection-log entry atomically.

`GET /api/vault/bootstrap` returns the bound device and its current authorized
collection records, transitions, and device envelopes in canonical CBOR. The
per-collection record also includes the current 32-byte collection-operation
head. The worker verifies the enclosing record and only then uses that head as
the optimistic-concurrency precondition for the next command.
planned `GET /api/vault/collections/{id}/sync?after=<sequence>` endpoint will
return authorized collection operations, ciphertext, envelopes, and tombstones
in bounded CBOR pages. The sequence is an availability cursor only; clients
trust only verified signed heads and local checkpoints. Collection sync is not
implemented for the current personal-device profile at
`GET /api/vault/collections/{collectionId}/sync`: it returns no plaintext,
only canonical operation, revision, and tombstone records. The worker verifies the
hash-linked command sequence, command signatures, revision signatures and
ciphertext hashes before unwrapping/decrypting an item. Records from another
device are rejected until the forthcoming verified device-key directory and
sharing flow are implemented.

## Encrypted item payloads

The encrypted revision payload uses one of two fixed maps:

| Item type | Fields in encrypted payload |
| --- | --- |
| `note` | schema version, type, title, body, labels, created-at, updated-at |
| `login` | schema version, type, name, username, password, URL, notes, labels, created-at, updated-at |

The item type, titles, labels, and all fields above remain inside the content
ciphertext. The server sees opaque item IDs, revision/epoch numbers, ciphertext
sizes, timing, author device ID, and unavoidable membership metadata. A note
revision ciphertext must not exceed 1 MiB.

Each revision receives a fresh random 32-byte content key. Content is encrypted
with the revision key; the revision key is encrypted with the collection epoch
key. The signed operation binds both ciphertext hashes, the parent revision
hash, the collection epoch, and the author device.

`src/lib/vault/encrypted-revision.ts` implements this browser-side envelope
with separate contextual AAD for content and revision-key wrapping. It supports
the fixed note/login content maps and validates that a ciphertext cannot be
replayed under a different note identity. Initial revisions are persisted by
the `note-append` command transaction.

### Initial note append payload

`note-append` is device-signed and requires a 32-byte
`expectedCollectionHead`. Its payload has labels `1` note ID, `2` collection
epoch (currently `1`), `3` revision number (currently `1`), `4` content
ciphertext, `5` content nonce, `6` wrapped revision key, `7` key-wrap nonce,
`8` content ciphertext hash, `9` wrapped-key hash, `10` revision hash, `11`
immutable revision signature, and `12` item type (`note` or `login`). The
revision signature covers the fixed revision identity/hash record using
`clipsx/vault/v1/note-revision`. Servers validate all lengths and hashes but
never receive content or key plaintext.

Later immutable revisions use the same command with an incremented revision
number and payload label `13` containing the exact prior revision hash. The
private transaction locks the note and collection-operation head, rejecting
either stale precondition without writing a partial revision.

For a `409` rejection of a later revision, the client must treat the command
as unaccepted. It refreshes bootstrap and the affected collection through the
same verified worker paths before displaying the accepted remote content. The
three UI resolutions are: keep remote (discard the memory-only local draft),
reapply local (create a new revision from the refreshed remote head), and
manual merge (edit remote/local fields, then create that new revision). A
draft is never reported as synchronized or durable before a `201` response.

### Signed item deletion and tombstones

`note-delete` is device-signed and requires the current 32-byte
`expectedCollectionHead`. Its two-field payload contains the note ID and exact
current revision hash. The private transaction locks both heads, verifies the
bound active owner/editor session, marks the note deleted, deletes its stored
revision ciphertext and wrapped revision keys, appends the signed
`note-delete` collection operation, and stores a non-secret tombstone in the
same transaction. A stale or repeated deletion returns `409` without a partial
change. Sync returns tombstones bound to their signed operation; the worker
verifies that operation and removes the matching item from rendered results.
Deletion does not claim cryptographic erasure from previous recipients,
browser copies, backups, or exports.

## Sharing, recovery, deletion, and locking

Verified invitations are mandatory. An invitation link contains its
high-entropy secret in a URL fragment, while the server stores only a
commitment. The inviter and recipient compare a QR transcript or grouped
20-digit safety number; both sign confirmation before membership activation or
epoch envelopes. New members receive only the joining epoch unless the owner
explicitly grants selected or all retained earlier epochs.

### Verified invitation and membership payloads

`invitation-create` is owner/device signed and carries: invitation ID,
membership-lifecycle ID, recipient account ID, requested `editor`/`viewer`
role, expiry, invitation-secret commitment, verification-transcript
commitment, and the inviter signing public key. The user-carried fragment is a
canonical record containing the signed command and random 32-byte secret. That
secret is absent from the HTTP body, URL path/query, logs, and database.

`invitation-accept` is signed by the recipient's active session-bound device.
It carries the invitation-command hash, verification commitment, acceptance
transcript hash, and that device's signing/encryption public keys. The
transcript hash binds those keys, both account/device contexts, the invitation
command, and the fragment secret. `invitation-confirm` is signed by the
inviter device and binds the accepted command hash, the same transcript hash,
and verification commitment. The grouped 20-digit SAS is computed locally
from the fragment secret and invitation command and must be compared through
an authenticated channel. Account-session-only acceptance and TOFU are not
available.

`member-add` carries invitation/membership/recipient IDs, role, joining epoch,
explicit earliest historical epoch, membership-state and recipient-set
commitments, the signed epoch transition, exact new-epoch device/recovery
envelope arrays, and separate historical envelope arrays. Historical arrays
must cover every selected retained epoch for every active endpoint of the new
member; the default boundary equals the joining epoch and both arrays are
empty. The private transaction requires completed acceptance and confirmation,
then atomically activates membership, accepts the invitation, supersedes the
old epoch, creates the next epoch/envelopes, and appends `member-add`.

`member-remove` carries the terminal membership/account IDs, next epoch,
commitments, signed transition, and exact device/recovery envelope arrays for
remaining active members. The transaction excludes all endpoints and recovery
roots belonging to the removed account and commits removal, rotation, and
`member-remove` together. No standalone `epoch-rotate` command is needed for
these membership transitions.

Removing a member or revoking a device creates a new epoch for every affected
collection, commits the removal/revocation and recipient set atomically, and
issues no later envelope to the removed recipient. This protects future writes;
it cannot erase keys or plaintext already learned.

On signed item deletion, remove its primary ciphertext and wrapped keys in the
same transaction and retain a signed non-secret tombstone. Backups and prior
recipient copies are not cryptographic erasure.

Lock on explicit lock, sign-out, 15 minutes of inactivity, and browser page
termination. Lock releases application references and clears rendered secrets;
it does not claim physical memory erasure. Offline cache and conflict drafts
remain locally encrypted. V1 has no service worker or background sync task.

## Device revocation and epoch rotation

`device-revoke` is signed by a bound active device and names the terminal
device ID, non-secret reason, and one next-epoch rotation per current personal
collection. Every rotation carries the new epoch number, membership and
recipient commitments, signed transition, plus device and recovery envelope
sets. The server atomically revokes the target and clears its session binding,
supersedes each old epoch, inserts the fresh current epoch and envelope sets,
then appends the account operation. The recipient sets must contain exactly all
remaining active devices and recovery roots, never the revoked device.

Rotation protects future data only. It cannot erase keys, ciphertext, or
plaintext already copied by the lost device.

## Recovery-root rotation

`recovery-rotate` is a recovery-root-signed command with a co-signature from a
currently session-bound active device. Its payload names a fresh recovery key
ID, 32-byte encryption and signing public keys, and exactly one signed recovery
envelope for the current epoch of every non-deleted personal collection. The
active-device co-signature covers the canonical payload with its signature
field omitted.

The private transaction locks the account operation head and old active root,
validates complete, unique current-epoch coverage before its first write,
revokes the old root, creates the next key version, stores the replacement
envelopes with a recovery sender, and appends one `recovery-rotate` account
operation. A rejection writes neither root nor envelope state. The old phrase
can still represent already copied material; rotation only limits future
server-mediated recovery.

## Compatibility and test vectors

The protocol fixture directory must contain deterministic fixtures for each
record type, key derivation, HPKE envelope, signature, encrypted note/login
revision, recovery wrapper, invitation confirmation, epoch rotation, tombstone,
and rejected malformed record. Fixtures use fixed test-only keys and nonces and
are never production material.

Every browser implementation must verify the fixtures before release. The
launch compatibility suite covers current desktop Chrome, Edge, Firefox, and
Safari. PRF is used only after the browser and authenticator return a valid
result; the vault-passphrase profile is tested as the supported fallback.
Mobile certification is deferred. The future desktop repository consumes the
same CBOR bytes and tests. Legacy epoch `0` migration fixtures are part of the
contract, but no desktop migration code is implemented in this repository.
