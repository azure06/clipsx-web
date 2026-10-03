# Desktop release downloads

The localized download page reads the latest published desktop release's
`downloads.json` at request time. Draft candidates never become active website
downloads. Version, tag, source revision, complete platform matrix, SHA-256 and
native signing/notarization flags are validated before links are exposed.

Schema version 1 provides Windows x64 NSIS, macOS Apple Silicon and Intel DMGs,
Linux x64 AppImage and Debian targets. URLs must be exact versioned assets in
`azure06/clipsx`; arbitrary hosts, unsigned Windows targets, unnotarized Mac
targets, incomplete inventories and duplicate target IDs are rejected.

The server loader uses a 30-second cache and a five-second fetch timeout. Expired
metadata refreshes before the request completes, and concurrent requests share
one refresh per process. A previously validated release remains available during
temporary upstream failure. A cold instance without valid metadata displays the
unavailable state and no placeholder URLs. Healthy publication is normally
visible on a subsequent request within one minute; there is no refresh webhook
or website redeployment per desktop release.

Deploy this reader once before publishing the first desktop release. Verify both
localized download pages, separate Mac architecture labels, the unavailable
first-release state and active exact asset URLs after publication. Once downloads
exist, the unavailable notice is hidden. A cold upstream failure explains that
the latest download list could not be verified; it does not claim no release
exists. The page includes localized installation steps, descriptive installer
link labels, setup documentation, and the editorial changelog.

Focused validation:

```sh
npx vitest run src/config/download.test.ts src/lib/releases.test.ts
npm run typecheck
npm run lint
npm run build
```

Installed desktop certification, updater signatures and merge-triggered publication
are maintained in the desktop repository's release documentation. Linux native
GPG signing is not claimed by the manifest's `signed` flag; mandatory Tauri
updater signatures are a separate trust mechanism.
