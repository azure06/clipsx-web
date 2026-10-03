# Terms and Privacy pages

## Implementation and publication status

The operator authorized publication of a simpler current-service policy on
October 3, 2026 after confirming Vault and Pro billing are inactive and
`support@clipsx.app` works and is monitored. These pages describe current data
flows and an adopted retention/request policy, not a legally certified document.

`src/content/legal.ts` owns the matching English/Japanese section inventories,
the user-confirmed public contact `support@clipsx.app`, and review dates.
`LegalPage` renders the summary, effective date, contents links, sections,
license link, public contact, and reciprocal Terms/Privacy link. Page metadata
continues to use the existing localized canonical and sharing helper.

The publication effective date is October 3, 2026. If deployment is delayed to
a later date, update that date before publication.

The public wording identifies an independent project based in Japan. It does
not publish a home address, infer a personal name from repository metadata, or
invent a registered company. The operator confirmed the public mailbox. Its
delivery was not independently tested by sending a message.

## Content boundaries

Terms distinguish the Apache-2.0 desktop application from hosted services.
They do not change the software license, promise Pro features or support, or
equate sponsorship with a paid entitlement. Warranty and availability language
preserves non-excludable liability and mandatory consumer rights; no zero-dollar
liability cap or blanket responsibility waiver is introduced.

Privacy separates device-local clipboard storage from settings sync. Vault is
explicitly inactive; its intended E2EE and lost-key limitations are described as
planned behavior. Contact messages, authentication, diagnostics, browser
storage, hosting, analytics, and GitHub sponsorship are covered. Pro billing is
inactive, so Stripe is not presented as a current Pro payment processor. Account
closure does not promise immediate deletion from backups or other devices.

No region, numeric retention period, privacy certification, legal approval, or
unverified provider region is asserted. Provider privacy links supplement the
plain-language data flow. Actual provider configuration remains an operational
follow-up; generic overseas wording is not proof of international-transfer
compliance. Do not claim full legal finalization while applicability is unreviewed.

## Evidence checked

| Topic | Evidence | Result |
| --- | --- | --- |
| License | Desktop repository `LICENSE`; [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0.html), sections 7–8 | Reference the actual license and its applicable-law exceptions |
| Settings sync | `docs/backend/configuration-sync.md` | Account creation does not upload clipboard history; Vault is separate |
| Vault | Operator confirmation; `docs/backend/architecture.md` | Inactive; planned E2EE, no operator content decryption, no lost-key recovery promise |
| Contact messages | `src/lib/resend.ts`, contact API | Resend sends name, email, subject, and message to configured mailbox |
| Diagnostics and measurement | `WebObservability`, `instrumentation-client.ts`, observability privacy helpers | Signed-in identity is included in diagnostics; public-route analytics is separate |
| Closure | `docs/backend/authentication-and-account-closure.md`, architecture closure section | Revocation, purge/disable, retained verification history, and separate device copies |
| Checkout | Operator confirmation; checkout route and Pricing | Pro and billing inactive; public Pro card remains a teaser |
| Japan disclosure | [PPC guidance §3-8-1](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/) | Statutory information may be available promptly on request; monitored support mailbox is the request channel |
| Liability | [Consumer Affairs Agency](https://www.caa.go.jp/policies/policy/consumer_system/consumer_contract_act/) | Free use is not a blanket exemption from mandatory consumer protections |

Production verification was attempted on October 3, 2026. The Sentry catalog
request failed with a transport error; Vercel project inspection returned a
connector schema error. These failures do not establish provider retention,
regions, or availability. No production configuration was modified.

## Request and retention procedure

The individual operator handles requests through `support@clipsx.app`.
Check the monitored mailbox regularly and respond without undue delay. Identify
the request and use proportionate identity verification for personal-data
disclosure or changes; do not request credentials or clipboard content.
Provide legally required accurate operator information privately to the data
subject. Keep private names, addresses, and provider identifiers out of Git.
Provide applicable purposes, protection measures, and overseas-processing
information from the actual provider configuration; do not substitute generic
compliance wording. Explain any lawful refusal or retained records.

Retain personal data only for the stated purpose, account operation, security,
or legal obligations. Review resolved contact messages and other operator-held
records regularly; delete or anonymize unnecessary material, including mailbox
trash where appropriate. Keep only necessary request-handling records. Process
account closure using the existing flow and handle provider-held records through
their supported deletion procedures. This is an adopted manual procedure, not a
new automated expiry job or a claim that historical data was already purged.
Do not promise immediate backup expiry. Record actual provider retention and
processing locations privately when dashboard access is available.

Before activating Vault or accepting Pro payments, verify production behavior,
provider processing and transfer requirements, retention, and required paid-sale
disclosures, then update both languages. The on-request approach does not waive
applicable disclosure obligations; this implementation is not a legal opinion.

## Validation

Run typecheck, focused ESLint, existing navigation/SEO and observability tests,
and a production build. Inspect Terms and Privacy in both languages and themes
at 320px and desktop widths. Check one main/h1, section anchor destinations,
focus visibility, canonical/alternate links, contact email, reciprocal legal
links, and the actual desktop-license destination. Confirm no horizontal
overflow, no outdated supporter-plan text, and no public personal details.

Validation completed on October 3, 2026: typecheck, focused ESLint, all 112
existing unit tests, and the production build passed. Both legal pages were
checked in English and Japanese, light and dark themes, at 320px and 1440px:
no horizontal overflow, one main/h1, valid section targets, and matching
canonical/alternate metadata. Keyboard focus remains visible on Sponsor and
Download; section navigation clears the fixed header. After the current-service
wording update, typecheck, focused ESLint, all 112 tests, and production build
passed again. All 16 language/page/theme/width combinations had no overflow,
broken section anchors, or draft notice and showed the real effective date.
Provider privacy destinations were checked against official pages. Operational
follow-ups above remain recorded.
