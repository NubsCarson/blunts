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
as described below. Production wallet signing/broadcast, browser-persistent
activity/recovery UI, mainnet/L1 settlement validation, price-impact protection,
fee collection and an owner-approved real-wallet execution cycle remain unfinished. WalletConnect/mobile external
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
