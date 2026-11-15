# Desktop release downloads

The localized download page is statically generated with platform-specific links
to `/api/download/[target]`. Viewing or prefetching the page does not read GitHub
release metadata. Clicking a download link resolves the latest published desktop
release's `downloads.json` through a persistent server cache and returns a
temporary redirect to the exact GitHub installer. GitHub transfers the file;
the website does not proxy installer bytes. Draft candidates never become active
website downloads. Version, tag, source revision, complete platform matrix,
SHA-256 and native signing/notarization flags are validated before redirecting.

Schema version 1 provides Windows x64 NSIS, macOS Apple Silicon and Intel DMGs,
Linux x64 AppImage and Debian targets. URLs must be exact versioned assets in
`azure06/clipsx`; arbitrary hosts, unsigned Windows targets, unnotarized Mac
targets, incomplete inventories and duplicate target IDs are rejected.

The server loader uses Next.js's persistent data cache with 24-hour
revalidation, a five-second fetch timeout, and a streamed 64 KiB byte limit.
Only validated manifests enter the cache. After the interval elapses, a download
request can receive the previous verified release while metadata revalidation
runs in the background. Failed refreshes do not overwrite the last verified
manifest. An empty cache during an upstream failure redirects to GitHub Releases
instead of an unverified installer. Unknown target IDs return 404 without loading
release metadata. Redirect responses are not cached; the metadata cache is shared
across platforms and locales and does not depend on the same running function
instance. The page has no timed revalidation or live version/signing badges.
The refresh interval is not a strict publication-latency guarantee; there is no
refresh webhook or website redeployment per desktop release.

Verify both localized download pages, separate Mac architecture labels, GitHub Releases
fallback on an empty-cache failure and exact asset redirects after publication.
The page includes localized installation steps, descriptive installer
link labels, setup documentation, and the editorial changelog.

Focused validation:

```sh
npx vitest run src/config/download.test.ts src/lib/releases.test.ts src/lib/releases-cache.test.ts src/app/api/download src/app/\[locale\]/download
npm run typecheck
npm run lint
npm run build
```

Installed desktop certification, updater signatures and merge-triggered publication
are maintained in the desktop repository's release documentation. Linux native
GPG signing is not claimed by the manifest's `signed` flag; mandatory Tauri
updater signatures are a separate trust mechanism.
