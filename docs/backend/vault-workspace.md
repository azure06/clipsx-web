# Vault workspace (implemented)

## Generic encrypted items

A collection is the encryption and access boundary. An item is a generic,
encrypted envelope and an immutable, device-signed revision. The database does
not store an item kind or media type.

The browser encrypts envelope version, `mediaType`, title, labels, encrypted
properties, content bytes, `createdAt`, and `updatedAt`. Server-visible data is
limited to opaque IDs, encrypted bytes, hashes, revision/epoch numbers, device
IDs, timing, and access metadata.

`item-append` and `item-delete` are signed operations. The server validates
canonical CBOR, signatures, hashes, heads, and author/session admission before
its private transaction changes ciphertext state. Physical table names still
contain historical `note` terminology; they store generic item ciphertext and
are not a format discriminator.

## Client format registry

Formats are a browser-only registry. Initial entries are:

- `text/markdown`: GFM preview, strict Mermaid fenced blocks, no raw HTML,
  and safe external links.
- `text/plain`: raw editable text.
- `application/vnd.clipsx.env`: canonical raw `.env` text with encrypted
  `environment` and `filename` properties. The parsed view is read-only and
  redacts values by default; it never writes parsed values back to source.

Unknown `text/*` values are safe raw-text candidates. Unknown binary types are
not rendered or transformed by the workspace.

## Local security settings

Versioned settings are stored only in the browser vault IndexedDB database.
The settings and browser-device stores share one coordinated schema version, so
either store can be opened first during a browser upgrade.
Defaults are 15-minute inactivity auto-lock and 60-second clipboard clearing.
Page exit, explicit lock, and cross-tab lock are mandatory and cannot be
disabled. Settings also retain editor/display preferences for progressive UI
adoption.

The pre-production rebuild uses `clipsx-vault-v1`; it intentionally does not
read the former local browser vault database.

## Local unlock slots

Each browser vault has one random bundle key. A passkey PRF output or a
passphrase-derived key only wraps that bundle key in an independent local
unlock slot; neither is uploaded. Users can add either method as an
alternative, after freshly confirming an existing method. Removing a slot also
requires fresh confirmation and the final remaining slot cannot be removed.

Passkey creation and confirmation both require a browser WebAuthn gesture.
Passphrase slots use a distinct random scrypt salt per slot. The browser record
retains the wrapped bundle key plus public/local credential metadata necessary
to request the selected method; it never retains a passphrase or PRF output.

## Browser approval

Adding a browser starts with a pending record and an approval offer. The
approving browser verifies the SAS, writes the authorization, and shows a
completion receipt. The pending browser polls read-only enrollment status at
2 seconds, then 5 and 10 seconds while visible and online. Once approved it
requires the local passkey gesture or passphrase before session binding and
activation.

## Planned

Cross-account collection collaboration and encrypted binary attachments are
planned. Attachments require per-file keys, signed manifests, chunking,
quotas, retention, and deletion design; they are not implemented.
