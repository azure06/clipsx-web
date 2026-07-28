# Vault key lifecycle

This visual guide explains which secret does what in ClipsX vault v1. It is an
architectural guide; [Vault protocol v1](vault-protocol-v1.md) remains the
normative implementation contract.

## One-page map

```mermaid
flowchart TB
  Account["Account login\nGoogle / email / account passkey"]
  Session["Authenticated session\naccess to encrypted records"]
  Passkey["Dedicated vault passkey\nWebAuthn PRF"]
  Fallback["Vault passphrase\nexplicit fallback"]
  Bundle["Encrypted local device bundle\nIndexedDB only"]
  DeviceKeys["Device private keys\nencryption + signing"]
  Recovery["24-word recovery phrase\noffline only"]
  RecoveryKeys["Recovery private keys\nderived locally"]
  Collection["Collection epoch key\nfor one secure container"]
  Revision["Fresh note revision key"]
  Plaintext["Note / login plaintext\nbrowser memory while unlocked"]
  Server[("ClipsX / Supabase\nciphertext + public keys + signatures")]

  Account --> Session
  Passkey -->|local PRF output| Bundle
  Fallback -->|scrypt-derived key| Bundle
  Bundle --> DeviceKeys
  Recovery --> RecoveryKeys
  DeviceKeys -->|decrypt device envelope| Collection
  RecoveryKeys -->|decrypt recovery envelope| Collection
  Collection -->|unwrap| Revision
  Revision -->|decrypt| Plaintext
  DeviceKeys -->|public keys, signatures| Server
  RecoveryKeys -->|public keys, envelopes| Server
  Collection -->|encrypted envelopes only| Server
  Revision -->|ciphertext only| Server
```

The server can authenticate an account and synchronize encrypted records. It
does not receive the recovery phrase, PRF output, vault passphrase, private
keys, collection epoch keys, or plaintext content.

## Key roles and locations

| Item | Role | Stored / available at | Server sees |
| --- | --- | --- | --- |
| Account session | Accesses account-scoped API and encrypted records | Browser session / Supabase Auth | Session and account identity |
| Vault passkey PRF output | Derives the local bundle-unlock key | Browser memory during a WebAuthn ceremony | Never the output |
| Vault passphrase | Fallback local bundle-unlock secret | User memory/password manager only | Never |
| Device private keys | Decrypt device envelopes and sign vault operations | Encrypted local IndexedDB bundle, then unlocked memory | Never |
| Device public keys | Encrypt to and verify one device | Server | Public key only |
| Recovery phrase | Offline ownership and last-resort recovery | User-controlled offline storage | Never |
| Recovery private keys | Recover/enroll devices and decrypt recovery envelopes | Derived transiently from the phrase | Never |
| Recovery public keys | Encrypt recovery envelopes and verify root actions | Server | Public key only |
| Collection epoch key | Shared key generation for one collection | Unlocked device memory / encrypted local cache | Encrypted envelopes only |
| Revision key | Fresh key for one note/login revision | Wrapped under its epoch key | Wrapped key + ciphertext only |

## Normal unlock on an existing browser

```mermaid
sequenceDiagram
  participant U as User
  participant A as Vault passkey or passphrase
  participant B as Browser IndexedDB
  participant M as Browser memory
  participant S as Server

  U->>A: Confirm vault unlock
  A-->>M: PRF output or passphrase-derived key
  B-->>M: Encrypted device bundle
  M->>M: Decrypt device private keys
  M->>S: Request authorized ciphertext/envelopes
  S-->>M: Encrypted records only
  M->>M: Decrypt collection epoch + revision keys
  M-->>U: Render plaintext locally
```

## Add a device or recover after loss

```mermaid
flowchart LR
  New["New browser creates\nnew device key pair"]
  Existing["Existing unlocked device\nQR / safety-number approval"]
  Phrase["24-word recovery phrase"]
  Wrapper["Optional compatible\nsynced vault passkey wrapper"]
  Authorize["Signed device authorization"]
  Envelope["New encrypted device envelopes"]
  Active["New trusted device"]

  Existing --> Authorize
  Phrase --> Authorize
  Wrapper -->|convenience only; phrase remains fallback| Phrase
  New --> Authorize --> Envelope --> Active
```

An account login alone cannot make a new browser a trusted vault device. The
new device needs an authorization rooted in an existing trusted device or the
offline recovery root.

## Write one note or login record

```mermaid
flowchart LR
  Content["Plaintext note/login\nin browser memory"]
  RevisionKey["Fresh random revision key"]
  Ciphertext["Encrypted revision ciphertext"]
  EpochKey["Current collection epoch key"]
  Wrapped["Wrapped revision key"]
  Command["Device-signed canonical command"]
  Server[("Server stores\nciphertext + wrapped key + signature")]

  Content -->|AES-256-GCM| Ciphertext
  RevisionKey -->|encrypts| Content
  EpochKey -->|wraps| RevisionKey --> Wrapped
  Ciphertext --> Command
  Wrapped --> Command
  Command --> Server
```

Every note revision receives a fresh key. The collection epoch key does not
encrypt every note directly; it protects the fresh revision key instead.

## Revoke a device or member

```mermaid
flowchart LR
  Remove["Remove device or member"]
  Rotate["Create next collection epoch key"]
  Eligible["Encrypt new envelopes only\nfor eligible devices/recovery keys"]
  Future["Future note revisions\nuse the new epoch"]
  Limitation["Already decrypted old content\ncannot be taken back"]

  Remove --> Rotate --> Eligible --> Future
  Remove -. does not erase .-> Limitation
```

Revocation protects future writes. It cannot erase data already decrypted or
copied by a removed device/member.

## Recovery-root rotation

Rotate the 24-word phrase only when it may be compromised, was stored
unsafely, or is no longer available to the owner. The operation requires fresh
account confirmation plus current vault proof; it creates new recovery keys and
rotates affected collection epochs. It is not routine password maintenance.
