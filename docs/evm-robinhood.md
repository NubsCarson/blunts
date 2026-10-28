# Wallet-first Blunts — local implementation

The owner's October 28 direction replaces the provider-first app with a normal
EVM wallet and Robinhood Chain stock tokens. The previous implementation is
preserved at `e89c958` on `codex/local-review-20261027`. Existing data and secrets
are untouched. New work stays local on `codex/evm-robinhood-local`.

## Current experience

The same original tray, brown/gold palette, fonts and Fill/Spark controls now
open a wallet-first preview. There is no email signup, Cloud session or brokerage
API key on this path. EIP-6963 wallet discovery and the injected EIP-1193 fallback
request only the public address on explicit Connect. Account/chain changes clear
old balances. Wrong-chain wallets can request switching to chain 4663. No wallet
signature, approval or transaction submission is requested.

Fill previews USDG → the canonical Robinhood QQQ token; Spark previews the reverse.
This returns stablecoin to a wallet, not dollars to a bank. USDG is selected because
its actual direct QQQ pools were verified; an arbitrary USDC pair is not assumed.
Amounts preserve USDG's six decimals and the stock token's 18 decimals.

The server provides bounded, cached public issuer metadata and QQQ bid/ask reads.
It pins chain and canonical token addresses, verifies the registry/deployment,
rejects stale price data and uses the published corporate-action multiplier when
valuing holdings. A missing balance remains unavailable, not a made-up demo value.
The same multiplier must not be applied again if switching to adjusted on-chain
Chainlink prices in future.

Quote reads compare Uniswap v3 fee tiers 500 and 3000 at one block, using official
factory/quoter addresses. Quotes show output, 0.5% slippage floor, pool fee, expiry
and block. This is a limited direct-pool route, not a general multihop aggregator.
No Blunts fee is charged by this read-only preview; the old proposed 1% conversion
business model has not been implemented on-chain or represented as accepted.

## Actual public-chain proof

On October 28, public RPC returned chain 4663 and the issuer API returned active
QQQ at `0xD5f3879160bc7c32ebb4dC785F8a4F505888de68`. USDG at
`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` returned six decimals.

Factory reads found QQQ/USDG pools at fees 100, 500 and 3000. The 100 pool had
zero liquidity; 500 and 3000 had nonzero liquidity. At block 99969079, a read-only
quoter simulation returned 0.034482909486826954 QQQ for 25 USDG, and
24.974799 USDG for selling that quoted QQQ amount. Those are timestamped
simulation results, not executed trades, balances, profit or future guaranteed
quotes. No account was funded and no approval/signature/transaction was sent.
The actual UI also displayed a fresh live Fill quote.

Wallet lifecycle/browser checks use a disposable injected fixture and mocked RPC;
these prove UI behavior only. They passed desktop Chromium, mobile Chromium and
WebKit. They never touch the owner's wallet. Real RPC/issuer checks above are
separate evidence. Ignored receipts live under `data/review-20261028/evm/`.

## Run and test

```sh
npm run build
npm start
# http://localhost:8745
npm run test:e2e
npm test
npm run format:check
```

`npm run start:legacy` and `npm run test:e2e:legacy` retain the old simulation
backend/UI. Do not run the old provider API/CLI concurrently on its PGlite journal.
`npm run test:local-services` still uses isolated local Steward and synthetic keys.

## Remaining work

Transaction calldata construction, finite-approval planning, independent chain
preflight and an isolated-fork recovery engine are now implemented and qualified
as described below. Production wallet signing/broadcast, multi-tab submission coordination,
replacement-transaction recovery, mainnet/L1 settlement validation, fee collection
and an owner-approved real-wallet execution cycle remain unfinished. Browser
review/activity recovery and the reference guard were added in the later sections. WalletConnect/mobile external
wallet continuation is also unfinished; this preview supports injected wallets.
No actual native builds were rebuilt for this pivot. No bank/card funding,
withdrawal, bridge, custom token, fee contract or pooled wallet was introduced.

Transactions are disabled in code and UI. Publishing and real-money actions need
owner approval. Do not label the preview a complete trading app.

Robinhood's token eligibility restrictions still apply, including exclusion of US
persons. Tokens are issuer debt securities providing economic exposure rather
than direct legal/beneficial ownership in underlying QQQ shares. A permissionless
chain and an injected wallet do not erase the issuer's restrictions.

## Primary sources

- https://docs.robinhood.com/chain/stock-tokens/
- https://docs.robinhood.com/chain/building-with-stock-tokens/
- https://docs.robinhood.com/chain/stock-token-apis/
- https://docs.robinhood.com/chain/contracts/
- https://raw.githubusercontent.com/Uniswap/contracts/main/deployments/4663.md

Rialto RFQ currently documents partner API keys. The verified direct Uniswap path
avoids depending on that keyed API; no claim is made that every on-chain venue is
keyless. This preview's small read-only server is a cache/proxy, not a custodian.

Final checkpoint validation: build passed; full backend suite 43 passed and one
optional PostgreSQL test skipped, including actual isolated Steward transport.
The new three-engine wallet preview checks passed again after the final frontend
change. One actual local Steward browser cycle also passed on the retained legacy
route. Formatter, TypeScript and Git whitespace checks passed. The new read-only
HTTP endpoints returned 200 for both directions. The preview remains on port 8745.


## October 28 follow-up: calldata and isolated-fork execution

`swap-plan.ts` constructs only the fixed USDG/QQQ pair and published SwapRouter02
address. The output recipient is the connected wallet. New approvals grant the
exact input amount, with a zero reset when replacing an insufficient nonzero
allowance. An already sufficient allowance is reused; Blunts does not create a
new unlimited approval. Swaps use `exactInputSingle` inside deadline-protected
`multicall`, zero ETH value, and the displayed 0.5% output floor. Expired or
inconsistent plans are rejected. No fee transfer is included in this preview.

The new **Review wallet steps** action independently rechecks chain, pool,
input balance/decimals, router existence, allowance and current on-chain output.
A changed wallet/amount invalidates the review. The UI displays only the planned
steps; it never imports the fork writer or requests a wallet transaction.

`swap-journal.ts` stores an immutable sender/nonce/call before a wallet can
broadcast. Lost responses and post-broadcast storage failure preserve a blocking
attempt instead of authorizing retries. Receipt recovery compares sender,
recipient contract, calldata, nonce, zero ETH value and canonical block hash.
Transient RPC failure preserves prior proof instead of inventing a reorg. The
engine is currently **fork-only**, with hard chain-31337 checks on both read and
wallet transports and explicit chain 31337 in every outgoing wallet request.
It cannot be enabled for mainnet by an environment variable. Browser activity UI
and a reviewed mainnet execution policy are separate unfinished work.

### Actual fork receipt

Anvil 1.7.1 forked Robinhood block **99980889** into isolated chain **31337** on
loopback port 8752, with no generated wallet accounts. The qualification script
impersonated disposable accounts only inside that fork and seeded virtual USDG
and ETH there. It never forwarded transaction writes to the public chain and
never accessed the owner's wallet or keys.

The deployed USDG, QQQ and Uniswap contracts completed a 25-USDG buy and a sale
of all received QQQ. Four local wallet requests confirmed; QQQ returned to zero
and the newly granted buy allowance was consumed to zero. The journal was
serialized/reloaded between steps. A fifth local request deliberately lost its
response **after** its approval transaction mined. The reloaded journal retained
`unknown` without a hash and blocked another submit. This is local-fork contract
execution evidence, not mainnet trading, eligibility, finality or bank cash-out.

Private ignored receipts: `data/review-20261028/evm/fork-cycle.json` (first cycle)
and `fork-cycle-1793181003531.json` (cycle plus actual lost-response test). The
latter cycle began with 99.975004 virtual USDG and ended with 99.950007; these are
disposable fork balances, not user funds or performance claims. Five serialized journal
records were retained during the run. Browser review screenshots use a clearly separate fixture
wallet, not these balances or the owner's wallet. The Anvil process was stopped
after the receipts were saved.

The public RPC rejected the first historical-block fork because its historical
state was pruned. A fresh fork succeeded. To reproduce, start a fresh fork and
run the bounded script promptly; reusing an old block may require an archival
RPC that is not configured or purchased here:

```sh
npm exec --yes --package=@foundry-rs/anvil@1.7.1 -- anvil \
  --fork-url https://rpc.mainnet.chain.robinhood.com --chain-id 31337 \
  --accounts 0 --host 127.0.0.1 --port 8752 --no-storage-caching
# In another terminal:
npx tsx scripts/qualify-evm-fork.ts
```

Focused tests cover malformed/expired/altered plans, exact approvals, mainnet
refusal, changed wallet/call, storage failure before/after broadcast, concurrent
submits, unknown-response reload, receipt mismatch, canonical-block changes and
RPC outages. Browser tests verify that preparing/reviewing invokes no wallet
sign/send method. Desktop Chromium, mobile Chromium and WebKit passed.


Follow-up validation: full backend suite **47 passed, one optional PostgreSQL
skip**; focused wallet/calldata/recovery cases **5 passed**; wallet browser review
**3/3 passed**. Build, TypeScript (now including the fork script), formatting and
whitespace checks passed. The fork-writer guard string is absent from built
browser assets. Browser activity persistence and mainnet signing remain unfinished;
the serializable journal was qualified with disposable test storage, not an owner
browser restart or real wallet. The local preview remains on port 8745.


## October 28 follow-up: saved reviews and reference guard

The browser now persists a **review draft**, scoped to the exact wallet and
chain 4663. Only version, owner, chain, direction, amount and review time are
stored. There is no saved quote, signature, transaction hash, session or calldata
to replay. After a reload, reconnect and open Wallet → Resume Fill/Spark review.
This restores the amount and requires a fresh quote and fresh chain preflight.
Changing wallets never displays another wallet's draft. Malformed, oversized or
cross-wallet records are preserved and rejected rather than silently overwritten.
Storage denial/failure is reported. This completes saved-review recovery, **not**
production transaction activity/recovery or real-wallet signing.

Both the public quote path and mainnet-read preflight now compare output to the
issuer's directional bid/ask, applying its stock multiplier exactly once. Quotes
more than **5% below** the computed reference are rejected before truncating the
basis-point display, so rounding cannot admit a worse quote. This reference uses
USDG's nominal $1 value; an independent USDG peg oracle was not added. The displayed
shortfall includes pool costs and venue/reference differences. It is not a pure
AMM price-impact metric, a best-execution guarantee or a broker-approved policy.
Stale, future-dated, inactive, halted, inverted or malformed reference data is
rejected. The 0.5% swap output floor remains a separate constraint.

Provider timestamps are normalized to ISO milliseconds at the server boundary.
The saved-review UI never treats an expired reference or quote as executable.
The fork-only writer is still absent from the public bundle and cannot be enabled
for mainnet through configuration. No signing or transfer was requested.

Validation: build/typecheck and full backend suite **51 passed, one optional
PostgreSQL skip**. Four new tests cover serialized restoration, storage denial and
corruption, wallet isolation, multiplier math, exact 5% boundaries and invalid
reference prices. The expanded browser check passed **3/3** engines after an actual
page reload, restoration and account switch, while recording only connection/read
wallet methods. Screenshots use disposable fixture balances. The real public
read-only endpoint returned a valid 25-USDG quote with **7 bps** reference shortfall
at the captured time, and malformed exponent input returned HTTP 400. Those are
read results, not trade receipts. Private timestamped evidence is under
`data/review-20261028/evm/reference-guard-*.json`.

Remaining: mainnet execution/receipt policy, browser activity and uncertain-send
recovery, ETH fee readiness, mobile external-wallet continuation, fee collection,
the wallet-first adaptation of the five-step walkthrough, and an owner-approved
real-wallet execution/settlement test. Existing provider/native/creative history
remains preserved; native builds were not rerun for these browser changes.


## October 28 follow-up: activity and ETH readiness

Wallet → **Activity on this browser** now accepts an existing transaction hash,
checks its sender and chain, and decodes only the canonical token approvals or
single-step, own-recipient QQQ/USDG SwapRouter02 route. It never signs, sends or
replays a transaction. Arbitrary routers, tokens, recipients, ETH value and batches
are rejected. A tracked record is labeled as observed activity; it is not evidence
that Blunts originally submitted it. Direct approvals and this app's exact-input
route are supported; this is not a general wallet-history indexer.

The same serialized journal now supports isolated fork chain 31337 and read-only
mainnet chain 4663, with distinct wallet/chain storage keys. A successful mainnet
receipt becomes **Included on Robinhood Chain**, never the fork's `confirmed`
state. Recovery matches transaction and receipt hashes, sender, nonce, target,
calldata, zero ETH value and canonical block hash. A missing response can attach
a hash to exactly one existing unknown attempt only if nonce/call/sender all
match. No retry is authorized by that lookup. Replacement/cancellation workflows
with changed calls or already-known replacement hashes remain unfinished.

RPC failure preserves the last verified state and proof timestamp, while recording
that the latest observation was unavailable. It cannot invent a fresh inclusion
or a reorg. The browser list survives a real page reload, stays isolated across
wallet changes and has a private JSON download. Export contains only this browser's
wallet/chain records and metadata, no authentication/session data or private keys.
History is currently capped at 100 records; archival/capacity policy is unfinished,
and history is never automatically discarded to make room.

The Activity disclosure starts closed to keep the wallet view focused. Close
remains visible while long sheets scroll. The public build still omits the
fork-only submission helper. No mainnet writer or enablement flag was introduced.

### Fee readiness

After independent quote preflight, review estimates the **first** wallet step
using `eth_estimateGas` and current gas price, with a 20% gas-unit buffer. This
is not a sum of all later steps: a later swap may require an approval first.
The [chain fee documentation](https://docs.robinhood.com/chain/gas-and-fees/)
says standard estimates include both L2 execution and L1 data fees. The wallet's
final fee preview remains authoritative. ETH balance is read first; zero ETH
produces a clear funding-needed state without attempting a doomed gas estimate.
Unavailable estimates are reported as unavailable, not as zero cost or readiness.
No fee was actually charged by this read-only review.

### Qualification boundaries

The [finality guide](https://docs.robinhood.com/chain/transaction-finality/)
distinguishes sequencer receipt, Ethereum posting and Ethereum finality. The
tracker verifies L2 inclusion only. It does not establish L1 finality, a bridge
withdrawal, bank payout or stock ownership rights.

A fresh isolated Anvil fork at Robinhood block **100007535**, exposed only as
chain **31337**, passed the complete buy/sell and post-broadcast lost-response
case with the updated receipt-hash checks. Five fixture wallet requests and five
journal records were retained; QQQ returned to zero. The fork node was then
stopped. Timestamped private receipts remain under `data/review-20261028/evm/`.
This did not access the owner's wallet, broadcast to mainnet or spend real funds.

One bounded public query checked 2,000 blocks of the known QQQ/USDG pool, filtered
to the published router. It found one event but no compatible direct transaction
for this tracker's exact route. No further scanning was performed. That attempt
is not reported as mainnet receipt acceptance. Current receipt qualification is
therefore actual local-fork execution plus browser/RPC fixtures, with mainnet
owner-wallet acceptance still missing.

Expanded browser checks cover activity import, inclusion labeling, reload,
per-wallet isolation, receipt refresh, JSON export, positive gas readiness and
zero-ETH handling. They continue to record only connection/read wallet methods,
never sign/send. An initial zero-ETH check exposed a fixed-value test fixture;
the fixture was corrected and all three engines passed the corrected case.
These browser checks use disposable fixture balances and hashes.

## Post-crash resume and walkthrough

The desktop crash preserved all uncommitted activity/fee changes. Those changes
were recovered and committed as `7aa84c7`, without resetting history or data.
The preview was restarted on loopback 8745; signing remains disabled.
Fresh backend checks passed **55 tests, two integration skips** (PostgreSQL and
actual Steward, which was not running after the crash). These skips do not
invalidate or replace the earlier service-backed evidence.

Menu → How it works now uses the same five-step component and visual system as
Shaw's walkthrough, with wallet-specific copy: existing USDG funding, ETH gas,
$100-value blunts/bands, token exposure rather than direct share ownership,
risks/eligibility, and Spark returning USDG rather than a bank withdrawal. The
legacy demo retains its own original lessons and fee explanation. Wallet lessons
do not invent returns, a new fee, completed signing, or a bank cash-out feature.
All five steps and return navigation passed across Chromium, mobile Chromium
and WebKit alongside the wallet/activity/reload checks: **6 browser cases passed**.

## Cross-tab activity coordination

Activity writes now acquire an exclusive same-origin Web Lock named for the
exact wallet/chain journal. A second tab waits; duplicate actions within one
component are also synchronously suppressed. Browsers lacking Web Locks can
still read/export existing records, but activity mutations fail closed instead
of silently using an unsafe fallback. This does not introduce mainnet signing.

Other tabs listen for storage changes and reload only their current wallet's
records. Each receipt observation compares the journal record it began with to
the latest stored record before saving. A late success or outage response returns
the newer record instead of overwriting it. Missing activity records fail closed.
This protects normal Blunts tabs sharing one origin/storage partition; it is not
cross-device synchronization or protection from manual storage modification.
The fork-only executor still requires a caller-provided exclusive lock, and no
public browser writer was added.

The browser scenario now opens a second same-origin tab with a disposable fixture
wallet, holds the journal's real Web Lock, verifies the first tab is queued and
has written no record, releases it, and observes the resulting inclusion record
in the sibling through the storage event. Unit coverage separately races a delayed
receipt response against a newer journal record and verifies no stale overwrite.

Cross-tab validation initially passed five of six browser cases; the last WebKit
walkthrough failed to bootstrap. The six-case pass was prematurely recorded in
`4863913` and is corrected here. Reproduction against stable build output captured
**HTTP 429 for the app JavaScript and CSS**, proving the overlapping rebuild was
not the complete cause. The shared global rate bucket counted repeated static
asset loads from the browser scenarios against the API's 90/minute budget.

The local server now keeps the same **90/minute API budget**, while static assets
are exempt from that API bucket. A regression test loads 95 static requests,
then proves the first 90 API requests succeed, subsequent API requests receive
429/Retry-After, and static assets remain available even after API exhaustion.
This is a runtime startup fix, not a test retry or timeout increase. The server
remains loopback-only and serves only built assets. Static-host/CDN protections
for a future deployment are still a separate release decision.

Final verified run: build/typecheck and formatter passed; **58 backend cases
passed, two optional integrations skipped** (PostgreSQL and non-running local
Steward). The final stable-output browser process completed **6/6 cases** in
Chromium, mobile Chromium and WebKit, including actual queued Web Locks, sibling
storage-event readback, restoration, private export, ETH readiness and walkthrough.
The fork writer remains absent from public build output. Signing, publishing,
real-money execution and mainnet finality acceptance remain unfinished.

## Wallet lifecycle invalidation

Account/network changes now invalidate every in-flight quote and balance read,
clear the prepared plan and ETH estimate immediately, and prevent an older
response from repopulating the tray. A provider `disconnect` event also clears
identity and network state. Chain events accept only safe hexadecimal IDs;
unsupported or malformed networks cannot retain a usable review. Repeated balance
refreshes use a separate read generation so an older same-wallet response cannot
overwrite a newer refresh.

Public market reads now have a 15-second browser deadline, run one at a time,
pause periodic work in hidden tabs and refresh when the page becomes visible.
The server retains its fixed origins and bounded upstream requests. No automatic
wallet reconnect, signature request, transaction retry or gas spending was added.

Browser qualification holds an actual quote HTTP response, emits a network switch,
then releases the response and waits for the preview request to finish. The quote
remains absent, the tray shows an unavailable value, the wallet shows the changed
network, and activity is hidden. A provider disconnect then returns the connection
control and leaves no stale balance. These are disposable browser fixture events,
not owner-wallet or physical-device proof. Prior six-case wallet/activity/reload
and walkthrough coverage remains in the suite.

Lifecycle validation completed: build/typecheck, formatting and whitespace checks
passed. All six final browser cases passed across Chromium, mobile Chromium and
WebKit with delayed quote/network/disconnect coverage. The backend was not changed
in this checkpoint; the prior full 58-pass/two-skip receipt remains separately
identified. Mainnet signing and physical mobile-wallet acceptance remain open.
