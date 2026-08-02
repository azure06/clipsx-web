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
Defaults are 15-minute inactivity auto-lock and 60-second clipboard clearing.
Page exit, explicit lock, and cross-tab lock are mandatory and cannot be
disabled. Settings also retain editor/display preferences for progressive UI
adoption.

The pre-production rebuild uses `clipsx-vault-v2`; it intentionally does not
read the former local browser vault database.

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

Multi-slot local unlock (passkey and passphrase as alternatives to one browser
vault) is planned security work. Current enrollment chooses one local unlock
profile per browser.
