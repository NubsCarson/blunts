# Paused local checkpoint — October 27, 2026

The owner asked to stop and pick this up later. Keep the goal paused until they
resume it. Everything is local; no push, PR, deployment, store submission, social
post, paid provider plan or real-money action was performed.

## Start here

- App checkout: `/Users/nubs/Git/blunts`.
- Branch: `codex/local-review-20261027`.
- Latest implementation commit: `7fb0b2006970d8bf7e30f500e152f4f1ecc50927`.
- This documentation checkpoint adds no product-code changes.
- Preview and local Steward were stopped gracefully. Ports 8743, 8745 and 8750
  were checked after shutdown; the provider journal lock was released.
- Preserve all existing checkouts, data, keys, native builds and ignored evidence.
  Do not reset/clean the checkout or recreate encryption roots.

The product remains Shaw's Blunts: the original brown/gold 3D tray, fonts,
rolling/banding/burning animations and two primary Fill/Spark actions. Finish
the app before returning to the separately prepared marketing concepts. Shipping
requires the owner's later approval.

## What is implemented

| Area | Current result |
| --- | --- |
| App money flow | Durable simulated Fill → investment → Spark → cash-out; saved idempotency instructions survive lost responses/reloads; cash-only Spark reaches payout |
| Product polish | Clear Fill icon, five-step walkthrough, amount validation, bounded browser requests and recoverable/dictation-friendly email-code sign-in |
| Owned identity | Cloud `/steward` gateway by default, direct Steward option, server-encrypted sessions, issuer/subject binding, refresh leases, wallet provisioning and logout |
| MoonPay local sandbox code | Test-key-only signed buy/sell URLs, buy quote validation, transaction lookup, exact raw-body webhook authentication and deduplication |
| Dinari local sandbox code | Official SDK, pinned sandbox transport, account/customer/KYC/wallet/QQQ checks, unsigned external-wallet permits and request/order lookup |
| Provider recovery | Separate durable command/event journal, one prepare claim, unknown-result preservation, read-only reconciliation and stale/conflicting observation handling |

The local provider API is opt-in, loopback-only and first-party authenticated.
It never credits the app ledger. The tray still uses simulated money.
`MONEY_MODE=live` refuses startup. A signed test URL or unsigned permit is not an
executed provider transaction.

## Last verification and receipts

- Full backend run with actual local Steward: 40 passed, one optional PostgreSQL
  test skipped. The 14 provider-focused cases passed again after final eligibility
  and reconciliation changes. Build, formatting and diff checks passed.
- Expanded unattended browser acceptance: Chromium, mobile Chromium and WebKit
  all passed. It used actual local Steward and the actual Blunts HTTP server,
  synthetic accounts, placeholder MoonPay keys and locally signed callbacks.
  No placeholder key was sent to an external provider. It verified no callback
  credit, then the demo cycle to zero and same-wallet re-login.
- WebKit took one real issuer-throttle backoff and recovered the same saved Fill.
  Rate limits were kept intact. Graceful Playwright server shutdown now releases
  the single-process PGlite lock; an earlier stale lock was removed only after
  confirming its recorded process had ended. No journal was deleted.
- Earlier native Android/iOS development-build and simulator receipts remain in
  [local review](local-review-2026-10-27.md). They do not establish physical-device,
  deployed-owner-account, store or financial-provider acceptance.

Ignored local evidence:

- `data/review-20261027/provider-workbench-1793165354130/receipt.json` and its
  `browser-results/`: latest provider-code and expanded browser receipts.
- `data/review-20261027/unattended-steward-1793161542727/receipt.json`: earlier
  three-engine first-party acceptance.
- `data/review-20261027/pause-1793165769649/`: private stopping-point snapshots
  and checksum manifest. These files must not be committed or shared publicly.

## Actual blockers and unfinished work

1. The latest inspection found both developer portals signed out. No enabled
   Dinari/MoonPay projects or genuine keys have been observed. `providers:check`
   returns missing credentials for both, exits 2 and makes zero provider calls.
2. Inspected local Steward source explicitly rejects permit-style signatures.
   Do not enable unsafe compatibility flags or export wallet keys. Obtain actual
   sandbox permit samples and confirmed chain/token/spender/domain values, then
   implement a narrowly scoped signing policy and signature verification.
3. Accepted customer onboarding/disclosures, program/UI approval, signed order
   submission, actual fills, chain finality/receipts, authoritative ledger credit,
   payout/documents and operational acceptance remain unfinished. Keys alone do
   not implement or prove these paths.
4. MoonPay's public ERC-20 sandbox delivers a Sepolia test token; the Dinari
   path targets Arbitrum Sepolia. Do not claim those separate legs form a verified
   native-USDC investment/funding route or add an unapproved bridge.
5. Any eventual shipping or real-money action needs the owner's scope-specific
   approval. Marketing remains a separate deferred task.

The next owner-only dependency is verified developer access and sandbox keys
placed in private configuration, never pasted in chat or Git. Free developer
signup was previously authorized, including the displayed MoonPay signup terms.
That does not authorize a new binding agreement, paid plan, financial account or
live transaction. The Gmail tool withheld authentication codes; do not recover
those values through another surface. The owner chose unattended local testing
instead of enabling Voice Control; microphone settings were left unchanged.

## Resume commands

Use the installed Node 24 runtime and committed npm lockfile. Built web assets
are retained. If dependencies/builds need refreshing, use the normal README
commands; do not serve the repository root or load the creative-tools `.env`.

Cloud-backed local preview, retaining the existing database and session root:

```sh
cd /Users/nubs/Git/blunts
AUTH_PROVIDER=eliza-cloud PROVIDER_SANDBOX=1 PORT=8745 APP_ORIGIN=http://localhost:8745 DATABASE_URL=data/blunts-cloud npm start
# http://localhost:8745/
```

Unattended genuine local-service acceptance, in two terminals:

```sh
cd /Users/nubs/Git/blunts
node scripts/steward-local.mjs /Users/nubs/Git/steward-blunts-20261027
```

```sh
cd /Users/nubs/Git/blunts
TEST_STEWARD_URL=http://127.0.0.1:8743 npm test
npm run test:local-services
```

The preview with `PROVIDER_SANDBOX=1`, browser acceptance server, and operator
workbench share the single-process provider journal: run only one of those at a
time. Stop the preview before browser acceptance or the workbench. The ordinary
backend test suite uses isolated stores and can run separately. Never delete the
provider database to clear a lock. A crash lock requires checking its recorded
process before removing only the stale lock; preserve unknown instructions.

```sh
npm run providers:check
npm run providers:workbench -- status
```

Do not automatically repeat an uncertain provider POST. Missing transaction
lookup results are not permission to create a new instruction ID.

## Preserved state and source references

Original data directories retained: `data/blunts`, `data/blunts-cloud`,
`data/blunts-steward`, `data/provider-sandbox`, `data/steward-browser-acceptance`
and `data/steward-local`. The development session key and local Steward secret
file were checked as mode 0600 without printing their contents. Preserve the
entire roots. Ledger snapshots omit sessions and are not wallet-key backups or
complete disaster-recovery images. The provider lab export is separate from
application ledger snapshots; do not import it over a current journal.

Steward source remains unchanged in
`/Users/nubs/Git/steward-blunts-20261027`, branch
`codex/blunts-integration-20261027`, commit
`297437b23f05fba4bafee1da63908bfcbec72830`. Other Cloud/Alpha/Eliza checkouts were
reference sources; preserve their unrelated work and do not reset them.

Read next:
[provider workbench](provider-sandbox-workbench.md),
[provider acceptance gates](provider-sandbox-acceptance.md),
[first-party integration](first-party-integration.md),
[local review](local-review-2026-10-27.md),
[deferred creative concepts](creative-proposals.md).
