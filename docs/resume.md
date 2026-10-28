# Current acceptance map — latest October 28

Read [local wallet acceptance](local-wallet-acceptance.md) first. It consolidates
current source `38fef72`, actual browser/Android/iOS receipts, the approved 1%
fee, preserved provider history, and open native-wallet/mainnet/release work.
The latest checks pass: 78 tests/two optional skips, 36 browser cases, formatting;
Android debug and unsigned iOS Simulator builds pass with matching JS bundles.

The new first-use network flow offers Add Robinhood Chain after error 4902, shows
fixed official metadata and handles cancellation. Adding never automatically
requests a subsequent switch or transaction. Android native market/quote transport
and the original GPU-rendered tray were observed in a dedicated fresh emulator.
The current iOS simulator read real market data and exposed a safe-area overlap;
`38fef72` fixes it and the actual simulator screenshot confirms the correction.

Current packages: `data/review-20261028/evm/current-native-checkpoint/`. Native
signing/pairing is still absent and must not be described as completed. The next
implementation question is a keyless native-wallet connection that respects the
owner's local-only boundary. Mainnet holder execution, physical/hardware wallets
and release acceptance also remain unproven. All personal financial actions and
public deployment remain on hold.

---

# Actual installed MetaMask read-only qualification — latest October 28

Source commit `91b507b` fixes the actual installed-wallet network-switch race.
Events invalidate wallet reads before switching, and repeated account/network
announcements now schedule new balance reads even when the scalar address/chain
has not changed. A late switch acknowledgement cannot clear a newer view.
Known insufficient token balance now gets a precise, safe error message.

Verified in the owner's nubsontopgang Chrome profile using installed MetaMask:
normal connection approval, original Ink chain 57073 → Robinhood 4663, automatic
actual zero QQQ/USDG balance display without manual refresh, reload/reconnect,
live public quote with 1% fee, and read-only Fill preparation correctly blocked
with "Not enough USDG in this wallet." No signing controls were selected, no
signature or approval request was opened, no personal key read and no tokens moved.
Holder eligibility was not established. A swap remains unproven. The wallet is
left connected on Robinhood Chain with the local app tab available for review.

Private actual-browser evidence:
`data/review-20261028/evm/metamask-installed-readonly-receipt.json`,
`metamask-network-switch-fixed.png`, `metamask-insufficient-usdg.png`.
The receipt records the exact served JS bundle hash and screenshot hashes.
The regression failed against the old build and the final browser suite passed
30 cases across Chromium, mobile Chromium and WebKit. Backend: 78 passed, two
optional service skips; formatting passed.

Updated local Android debug and unsigned iOS Simulator builds passed from this
commit; nine JS bundles matched both packages. Artifacts/checksums are preserved
in `data/review-20261028/evm/wallet-live-native-checkpoint/`. Native/hosted signing
stays disabled. No public host, release signing or deployment was created.
Remaining acceptance: physical mobile/hardware wallet behavior, eligible/funded
holder mainnet execution, and owner approval before public shipping.

---

# Current fee checkpoint — October 28

The owner approved 1% on Fill and Spark to
`0x4a27c325De7629c6bBD187E1e456B56c82E73073`. Local commit `ae8d602`
implements an atomic SwapRouter02 batch: swap output to the router, then
`sweepTokenWithFee` to the holder with the fixed 100 bps fee recipient. Fill
charges QQQ output; Spark charges USDG output. This intentionally uses an output
fee instead of the preserved provider version's input conversion fee. User-facing
output/minimum are net of fee, with token-unit rounding down. Pool fees and gas
are separate. Failed swaps revert the app fee too. No new custom contract, API
key, personal signing, funding or public deployment was required.

Fresh committed-source full-UI signed-fork receipt:
`data/review-20261028/evm/ui-fork-1793191879094/receipt.json`. It verifies both
fee transfers and recipient balance deltas, a mined failing swap with no token
movement or app fee, plus signed cancellation recovery. Public-chain writes: zero.
Tests: 78 passed, two optional service skips; browser 24 passed; format passed.
Refreshed Android debug and unsigned iOS Simulator builds passed; nine JS bundles
were matched to both packaged apps. Artifacts and checksum receipt are in
`data/review-20261028/evm/fee-native-checkpoint/`. Development release refusal
passed as expected. No installed-wallet/device acceptance is implied.
Activity additionally reports canonical RPC safe/finalized tags, without claiming
independent Ethereum settlement proof.

The preview is localhost:8745. Local signing stays holder-controlled; hosted and
native origins remain disabled. Remaining acceptance is installed-wallet/device
behavior and a genuinely eligible holder's mainnet execution. Those are not
proven by fixture or fork evidence. Publishing remains on hold until approval.

---

# Latest owner approval — local signing, October 28

The owner explicitly approved signing and reiterated that everything must stay
local until a later shipping/public approval. This supersedes the older "signing
always disabled" checkpoints below. HTTP localhost/127.0.0.1 web origins now have
user-controlled signing controls; hosted HTTPS and native/unknown origins remain
disabled. No environment/URL/storage flag expands that scope. The holder must
acknowledge issuer eligibility and choose every step; no agent or worker approves
or auto-submits a personal trade. No personal-wallet signature was captured.

The current UI handles finite approval and swap as separate requests, cancellation,
receipt checking, quote expiry and unknown outcomes with no replay. A new quote is
required when the existing one expires during approval. The next approval is never
automatic. Older read-only native builds remain preserved as recorded.

The following sections are historical receipts. Read the final local-signing
section of `docs/evm-robinhood.md` for current proof and remaining gates.

---

# Current direction — wallet-first Robinhood Chain, October 28

The owner explicitly changed direction: preserve the Dinari/MoonPay work and
replace the active app with a normal EVM wallet + Robinhood stock-token flow.
This supersedes the provider-first work plan and all older restart instructions
below. No deployment, real-money transaction or publishing is approved.

- Active branch: `codex/evm-robinhood-local`.
- Preserved provider branch: `codex/local-review-20261027` at `e89c958`.
- `npm start` now runs `app/server/evm-main.ts`, loopback port 8745. It loads no
  credential file, auth provider, old ledger, provider journal or background worker.
- Original data and private provider credentials remain untouched and Git-ignored.
- `npm run start:legacy` runs the previous backend; `/` redirects to `/legacy`
  for the retained old React UI. Stop any process holding its embedded data first.
- The old provider version can be restored by switching to the preserved branch
  after stopping the preview. Never reset/clean data to switch versions.
- Read [wallet-first implementation](evm-robinhood.md) for current proof and gaps.

Latest follow-up adds exact approval/swap calldata and **Review wallet steps**
with independent public-chain preflight. A fork-only journal/executor completed
a buy/sell cycle and an actual lost-response/no-replay case on Anvil chain 31337.
No owner wallet or mainnet funds were used. Read `docs/evm-robinhood.md` for the
exact receipts and remaining gates. The public app still never signs or sends;
its fork-only test writer is not bundled. Anvil was stopped after qualification.

Latest browser follow-up persists wallet-scoped review direction/amount only.
Reload → reconnect → Wallet → Resume restores that amount, never an old quote
or executable transaction. The quote and preparation paths reject outputs more
than 5% below the multiplier-adjusted nominal-USDG reference. Full backend suite
51 passed/one optional PostgreSQL skip; reload/isolation browser checks 3/3.
The public endpoint was read-verified, and real signing remains disabled. See the
latest section of `docs/evm-robinhood.md` for limitations and remaining work.

Latest activity follow-up adds Wallet → Activity for read-only compatible hash
tracking, exact unknown-attempt/hash matching, mainnet **inclusion** (not finality)
labels, per-wallet browser persistence and private JSON export. ETH readiness
estimates only the next wallet step and handles zero ETH explicitly. The writer
remains hard-gated to local fork chain 31337 and is omitted from the public bundle.
A fresh fork cycle at source block 100007535 passed again; its process was stopped.
Mainnet signing, multi-tab submission, replacement recovery and L1 finality proof
remain unfinished. No owner wallet or real funds were used.

The historical checkpoint below is preserved for recovery, not the active plan.

---

# Local resume checkpoint — updated October 28, 2026

## October 28 resumed work

The owner resumed the task and approved creating a Dinari sandbox key and saving
it with existing MoonPay fishtech test keys in
`/Users/nubs/Git/blunts/data/provider-sandbox/credentials.json`. All five fields
are present, mode 0600 and ignored by Git. Do not print or commit this file.
The temporary transfer file is cleared. Both portals are signed in.

One initial Dinari key was exposed in the one-time dialog's tool output. It was
replaced immediately and the portal confirmed its revocation. Do not reuse it.
The replacement was saved without printing its secret. MoonPay keys were
verified against its visible test-key UI and concealed again.

New explicit private-file loading supports the app, workbench and qualifier.
Set `PROVIDER_SANDBOX_CREDENTIALS_FILE` to the absolute approved file path.
Environment values override the file, including blank values. Production,
unsafe file modes/ownership, symlinks, oversize data and unknown fields fail
closed. Fixture browser tests explicitly disable private-file loading.

Real qualification now passes: Dinari partner identity + QQQ reads and MoonPay
indicative USD 100 quote, with receipt in
`data/review-20261028/provider-qualification.json`. Dinari partner KYC is false.
QQQ currently maps to Ethereum Sepolia and chain 179205, not Arbitrum Sepolia.
Only Ethereum/Arbitrum Sepolia are allowed by this adapter, and preparation
requires the requested chain's exact token mapping. No 179205 support was added.
Dinari query limits were corrected to the documented minimum 20. MoonPay quote
expiry is optional; a missing expiry returns an explicitly indicative estimate.

Still unfinished: accepted customer/account/program/disclosures, narrow Steward
permit signing, actual widget/callback/order execution, settlement and ledger
reconciliation. No real transactions, deployment, push or shipping approval.

The October 27 checkpoint below is historical; its signed-out/missing-key
blocker is superseded by the above. Preserve all its existing data and receipts.

Validation after these changes: build and full backend suite passed (42 tests,
one optional PostgreSQL skip), including actual isolated local Steward auth.
The 20 provider/qualification/private-file cases pass. Formatting and diff
checks pass. Provider qualification exits 0 with the approved private-file path;
workbench status opens and closes the existing journal successfully. Browser
acceptance passed in desktop Chromium, mobile Chromium and WebKit (3/3), using
isolated Steward and synthetic provider keys. The Cloud preview now runs on
`http://localhost:8745` with sandbox routes and private-file loading enabled;
its tray remains simulated. Local test Steward runs on port 8743. Stop both
gracefully before another process opens their embedded databases. The provider
journal is held by the preview, so stop it before running the workbench CLI.

Restart the current preview with:

```sh
AUTH_PROVIDER=eliza-cloud PROVIDER_SANDBOX=1 \
PROVIDER_SANDBOX_CREDENTIALS_FILE=/Users/nubs/Git/blunts/data/provider-sandbox/credentials.json \
PORT=8745 APP_ORIGIN=http://localhost:8745 DATABASE_URL=data/blunts-cloud npm start
```

No owner action is needed for the saved-key/read-only setup. Real execution
still needs provider customer/program eligibility and an approved scoped signing
flow; do not enter business/KYC facts, accept agreements or open a real financial
account on the owner's behalf by inference. No funding compatibility or actual
financial-cycle acceptance has been claimed.

## October 27 historical checkpoint

The owner previously asked to stop and pick this up later, then resumed on
October 28. Everything is local; no push, PR, deployment, store submission, social
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

## Crash recovery — October 28

The desktop crash preserved all source changes. The activity/ETH-readiness work
was still uncommitted after `e736aae`; it was recovered in place, without resets,
cleaning databases or recreating credentials. The wallet-first server was stopped
by the crash and was restarted on loopback port 8745. Health confirms
`evm-preview`, `transactionsEnabled=false`. No Anvil process was running.
Fresh full checks passed 55 cases with two explicitly skipped integrations:
optional PostgreSQL and actual local Steward (service not running on this resume).
These are distinct from the earlier 56-pass run that included isolated Steward.

Post-recovery next change: the five-step How it works flow is now adapted to the
wallet route and accessible from Menu. The old simulator lessons remain available
only in the legacy UI. The six browser cases cover the wallet lifecycle and all
five lesson steps on three engines. No keys, transaction approvals, real funds,
public hosting or social publishing were used during crash recovery.

Latest recovery hardening: activity updates use real cross-tab Web Locks per
wallet/chain, a same-tab in-flight guard and storage-event synchronization.
Receipt observations reject stale overwrites. This does not enable signing;
normal browser tabs only track/read existing compatible transactions. Unsupported
Web-Lock environments may read/export but cannot update activity. See the latest
section of `docs/evm-robinhood.md` for scope and proof.

Cross-tab follow-up uncovered and fixed a real bootstrap issue: repeated static
loads exhausted the API's global 90/minute bucket and returned HTTP 429 for JS/CSS.
The API budget is unchanged; built static assets no longer consume that bucket.
The earlier premature 6/6 claim in `4863913` is superseded by the final completed
run: **58 backend passed/two optional skips, six browser cases passed**. Loopback
preview was restarted with this fix. No source reset, data cleanup, credentials,
mainnet writes, deployment or publishing occurred.

Wallet lifecycle follow-up invalidates in-flight quotes/balances/prepared steps
on account/network changes and provider disconnect. Delayed quote responses can
no longer restore old-context reviews. Public market reads have a 15-second
browser deadline, no overlap, and visible-tab resume refresh. No wallet writes,
automatic reconnect or real-money retries were introduced.

Latest execution work adds a policy-gated single-step executor and a composed
real-wallet adapter, **frozen disabled** and not imported by the preview UI. Five
offline policy tests prove no wallet/storage access while disabled and rejection
on failed preflight/account/plan changes. A fresh isolated chain-31337 fork from
source block 100034744 passed reset/approve/buy/sell plus unknown-response recovery.
The fork node was stopped; no real-wallet or mainnet execution was performed.
The adapter still needs owner-approved activation and visible confirmation UX;
its source file existing is not proof of enabled or accepted mainnet trading.

Latest local UI work adds optional exact transaction review to prepared steps.
Display and execution share canonical semantic/calldata verification; changed
chain/token/amount/minimum/calls fail review. It shows spender, recipient, deadline
and fee details without opening wallet requests. Mainnet activation is still off.

Mobile follow-up prepares a keyless MetaMask dapp-browser handoff for explicitly
public HTTPS origins. Localhost/private/session-bearing origins fail closed and
show a local-preview explanation. Nothing was deployed or opened in a personal
wallet. Wallet market/quote reads now use the existing platform HTTP transport,
so native sources address their configured backend rather than local assets.
Physical mobile connection/signing and fresh native builds remain unverified.

Fresh native build receipt now exists for wallet-first source `7c564f8`:
Android debug and unsigned arm64/x86_64 iOS Simulator builds passed, with the
explicit localhost development endpoint. Private logs/artifacts/hashes are under
`data/review-20261028/evm/native-checkpoint/`. Existing bundled assets were archived
before sync. Both SDK/JDK/Xcode selections were command-scoped. The release guard
correctly refuses these development assets. No physical-device installation,
wallet connection/signing, release signing, deployment or publishing occurred.
Compile success does not prove native runtime transport or mobile wallet acceptance.

Actual native market-read proof now exists: a new isolated iPhone 17 Pro simulator
(iOS 27.0; UDID 54F01CF2-FFA6-48B0-8975-7CADBE54C076) installed/launched the unsigned
recorded app and logged WebView loaded → CapacitorHttp request → QQQ data with
transactions disabled. Receipt: native-checkpoint/ios-runtime-receipt.json.
The app was terminated and this simulator shut down; data preserved. Do not
confuse this with visual QA: Simulator UI controls were unavailable, so rendering,
quote taps, external wallet connection/signing and physical-phone proof remain
missing. No personal device/account/wallet was touched.

Approved local signing activation verified: localhost server restarted and health
now reports `transactionsEnabled=true`. Final checks: 66 backend pass/two optional
skips, 21 browser fixture cases pass. Browser-control bridge was unavailable during
refresh, so an already-open tab may need a reload. No personal wallet connection,
private key use, real signature/trade, hosted/native signing or deployment occurred.

Integrated local signing proof now exists beyond independent fixtures:
`scripts/qualify-wallet-ui-fork.ts` drove the actual UI/adapter through four
cryptographically signed transactions against deployed contracts on an isolated
Anvil fork (source block 100058896; fork retains chain ID 4663 without response
rewrites). Generated test key stayed in memory; no personal keys/funds or public
submission. Actual receipts succeeded, QQQ returned to zero and browser reload
recovered four matching records. Private receipt: ui-fork-1793189003222/receipt.json.
Temporary QA ports 8752/8753 were stopped; actual preview 8745 stayed active.
This does not prove installed-wallet/mobile/mainnet/finality acceptance.

Latest recovery work verifies same-call replacements and zero-value self-send
wallet cancellations against a saved sender/nonce and canonical receipt. Original
hash/call are preserved with nested replacement proof; no cancellation or retry is
sent. Verified replacement allows only a fresh quote/review. Unknown/noncanonical
outcomes stay blocked; reorgs re-block. A pre-write size guard prevents newly
saved activity from exceeding its own readable limit. This checkpoint has unit
and browser-fixture proof, not an actual fork/mainnet cancellation receipt yet.

Actual fork cancellation recovery is now proven in the full UI harness, not just
fixtures: source 1139ad8, fork block 100069737, pending approval nonce 4 replaced
by a signed zero-value self-send at the same nonce. Cancellation receipt succeeded;
original receipt absent; UI preserved both hashes in one replaced record and
recovered five journal rows after reload, with no new automatic request.
Receipt: ui-fork-1793190131905/receipt.json. Six raw signatures include the one
pending displaced request; only five receipts succeeded. No personal keys or
public submission. QA ports 8752/8753 stopped; actual local preview 8745 preserved.
